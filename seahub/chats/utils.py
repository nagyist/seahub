# -*- coding: utf-8 -*-
import json
import logging
import time
import uuid
from copy import deepcopy
from urllib.parse import urljoin

import jwt
import requests
from django.core.cache import cache

from seahub.chats.constants import AI_REPLY_TIMEOUT
from seahub.chats.models import ChatMessageThoughtProcess, ChatMessages
from seahub.settings import SEAFILE_AI_SECRET_KEY, SEAFILE_AI_SERVER_URL

logger = logging.getLogger(__name__)


def gen_chat_task_id(session_uuid):
    return f'chat_{session_uuid.replace("-", "")}'


def gen_message_id(session_uuid, max_try=5):
    trying = 0
    new_message_id = ''
    while not new_message_id and trying < max_try:
        try_message_id = uuid.uuid4().hex[:4]
        if ChatMessageThoughtProcess.objects.filter(session_uuid=session_uuid, message_id=try_message_id).count() == 0:
            new_message_id = try_message_id
        trying += 1
    if trying == max_try:
        raise RuntimeError('Failure to generate message_id')
    return new_message_id


def verify_chat_ai_config():
    return bool(SEAFILE_AI_SERVER_URL and SEAFILE_AI_SECRET_KEY)


def combine_attachments_to_message(attachments, message):
    if not attachments:
        return message
    return 'Attached files:\n```json\n%s\n```\n\n%s' % (
        json.dumps(strip_content_details_from_attachments(attachments), ensure_ascii=False),
        message,
    )


def build_context_messages(session_uuid):
    results = []
    for message in ChatMessages.objects.get_context_messages_by_session(session_uuid):
        data = message.to_dict()
        content = data['content'] or ''
        if data['role'] == 'user':
            content = combine_attachments_to_message(data['attachments'], content)
        elif data['role'] == 'assistant':
            content = retrieve_origin_reference_format(content, data.get('sources', []))
        results.append({
            'role': data['role'],
            'content': content,
        })
    return results


def retrieve_origin_reference_format(content, sources):
    content = content or ''
    for index, _source in enumerate(sources or []):
        content = content.replace(f'[Reference {index + 1}]', f'<reference_{index}>')
    return content


def strip_content_details_from_attachments(attachments):
    new_attachments = deepcopy(attachments or [])
    for attachment in new_attachments:
        attachment.pop('content', None)
        attachment.pop('comments', None)
        attachment.pop('emails', None)
    return new_attachments


def record_message_to_db(ai_result, session_uuid, message_id, query, attachments):
    if not isinstance(ai_result, dict):
        ai_result = {
            'ai_reply': str(ai_result),
            'sources': [],
            'thought_process': {},
        }

    if 'ai_reply' not in ai_result:
        ai_result['ai_reply'] = ai_result.get('answer', '')

    ai_result.pop('answer', None)
    ai_result.update({
        'session_uuid': session_uuid,
        'attachments': strip_content_details_from_attachments(attachments),
    })

    try:
        ChatMessageThoughtProcess.objects.create_thought_process(
            session_uuid,
            message_id,
            ai_result.get('thought_process', {}),
        )
        user_message = ChatMessages.objects.create_message(
            session_uuid,
            message_id,
            'user',
            query,
            attachments=attachments,
        )
        ai_reply_message = ChatMessages.objects.create_message(
            session_uuid,
            message_id,
            'assistant',
            ai_result['ai_reply'],
            sources=json.dumps(ai_result.get('sources', [])),
        )
        ai_result.update({
            'user_message_id': user_message.id,
            'ai_reply_message_id': ai_reply_message.id,
        })
    except Exception as error:
        logger.warning('Failure to record chat messages: %s', error)

    return ai_result


def process_stream_ai_reply(chat_task_id, ai_response, session_uuid, message_id, query, attachments):
    has_recorded_result = False
    has_generator_exit = False
    error_msg = None
    try:
        for line in ai_response.iter_lines():
            if not line:
                continue
            line_str = line.decode('utf-8')
            if not line_str.startswith('data:'):
                line_str = f'data: {line_str}'
            content = line_str[len('data: '):]
            if content.startswith('{"results": ') and content.endswith('}'):
                results = json.loads(content)['results']
                item = 'data: %s\n\n' % json.dumps({
                    'results': record_message_to_db(results, session_uuid, message_id, query, attachments),
                })
                has_recorded_result = True
            elif content.startswith('[ERROR: ') and content.endswith(']'):
                error_msg = content[1:-1]
                item = 'data: %s\n\n' % json.dumps({
                    'results': record_message_to_db(error_msg, session_uuid, message_id, query, attachments),
                })
                has_recorded_result = True
            else:
                item = line_str if line_str.endswith('\n\n') else f'{line_str}\n\n'
            if not has_generator_exit:
                try:
                    yield item
                except GeneratorExit:
                    has_generator_exit = True
                    continue
            if error_msg:
                raise ConnectionError(error_msg)
    except Exception as error:
        logger.exception('Streaming response interrupted: %s', error)
        if not has_recorded_result:
            item = 'data: %s\n\n' % json.dumps({
                'results': record_message_to_db({
                    'ai_reply': 'There is an issue with the AI server or web server (LLM or internal server error), please try again later',
                    'sources': [],
                    'thought_process': {},
                }, session_uuid, message_id, query, attachments),
            })
            if not has_generator_exit:
                try:
                    yield item
                except GeneratorExit:
                    has_generator_exit = True
        if not has_generator_exit:
            try:
                yield 'data: [DONE]\n\n'
            except GeneratorExit:
                has_generator_exit = True
    cache.delete(chat_task_id)


def get_ai_reply(params):
    payload = {'exp': int(time.time()) + AI_REPLY_TIMEOUT}
    token = jwt.encode(payload, SEAFILE_AI_SECRET_KEY, algorithm='HS256')
    headers = {'Authorization': 'Token %s' % token}
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/get-ai-reply')

    if params.get('stream', False):
        response = requests.post(
            url,
            json=params,
            headers=headers,
            stream=True,
            timeout=AI_REPLY_TIMEOUT,
        )
        if response.status_code == 500:
            raise RuntimeError('ask ai error status: %s body: %s' % (response.status_code, response.text))
        return response

    response = requests.post(url, json=params, headers=headers, timeout=AI_REPLY_TIMEOUT)
    if response.status_code == 500:
        raise RuntimeError('ask ai error status: %s body: %s' % (response.status_code, response.text))
    response_json = response.json()
    return {
        'ai_reply': response_json.get('answer', ''),
        'sources': response_json.get('sources', []),
        'thought_process': response_json.get('thought_process', {}),
    }
