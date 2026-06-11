import json
import logging
import requests
import jwt
import time
import uuid
from copy import deepcopy
from urllib.parse import urljoin

from django.core.cache import cache
from django.utils import timezone
from django.db.models.functions import Coalesce
from django.db.models import Sum, Value

from seahub.settings import SEAFILE_AI_SECRET_KEY, SEAFILE_AI_SERVER_URL
from seahub.role_permissions.utils import get_enabled_role_permissions_by_role
from seahub.constants import DEFAULT_USER
from seahub.utils.user_permissions import get_user_role
from seahub.utils.ccnet_db import CcnetDB
from seahub.organizations.models import OrgMemberQuota
from seahub.ai.models import ChatMessageThoughtProcess, ChatMessages, ChatSessions, StatsAIByOwner, StatsAIByTeam
try:
    from seahub.settings import ORG_MEMBER_QUOTA_ENABLED
except ImportError:
    ORG_MEMBER_QUOTA_ENABLED = False

logger = logging.getLogger(__name__)

AI_REPLY_TIMEOUT = 180


# API
def gen_headers():
    payload = {'exp': int(time.time()) + 300, }
    token = jwt.encode(payload, SEAFILE_AI_SECRET_KEY, algorithm='HS256')
    return {"Authorization": "Token %s" % token}


def verify_ai_config():
    if not SEAFILE_AI_SERVER_URL or not SEAFILE_AI_SECRET_KEY:
        return False
    return True


def image_caption(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/image-caption/')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return resp


def generate_summary(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/generate-summary')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return resp


def generate_file_tags(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/generate-file-tags/')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return resp


def ocr(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/ocr/')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return resp


def translate(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/translate/')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return resp


def writing_assistant(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/writing-assistant/')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return resp


# utils
def get_ai_credit_by_user(user, org_id):
    user_role = get_user_role(user)
    role = DEFAULT_USER if (user_role == '' or user_role == DEFAULT_USER) else user_role
    ai_credit_per_user = get_enabled_role_permissions_by_role(role)['monthly_ai_credit_per_user']
    if ai_credit_per_user < 0:
        return -1
    if org_id and org_id != -1:
        if ORG_MEMBER_QUOTA_ENABLED:
            org_members_quota = OrgMemberQuota.objects.get_quota(org_id)
            ai_credit = org_members_quota * ai_credit_per_user
        else:
            ccnet_db = CcnetDB()
            user_count = ccnet_db.get_org_user_count(org_id)
            ai_credit = user_count * ai_credit_per_user
    else:
        ai_credit = ai_credit_per_user
    return ai_credit


def get_ai_cost_by_user(user, org_id):
    month = timezone.now().replace(day=1)
    if org_id and org_id > 0:
        cost = StatsAIByTeam.objects.filter(org_id=org_id, month=month).aggregate(total_cost=Coalesce(Sum('cost'), Value(0.0)))['total_cost']
    else:
        cost = StatsAIByOwner.objects.filter(username=user.username, month=month).aggregate(total_cost=Coalesce(Sum('cost'), Value(0.0)))['total_cost']
    return cost


def is_ai_usage_over_limit(user, org_id):
    ai_credit = get_ai_credit_by_user(user, org_id)
    cost = get_ai_cost_by_user(user, org_id)

    if ai_credit < 0:
        return False

    return ai_credit <= round(cost, 2)

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
        thought_process = ai_result.get('thought_process', {})
        if thought_process:
            ChatMessageThoughtProcess.objects.create_thought_process(
                session_uuid,
                message_id,
                thought_process,
            )
        user_message = ChatMessages.objects.create_message(
            session_uuid,
            message_id,
            'user',
            query,
            attachments=ai_result['attachments'],
        )
        ai_reply_message = ChatMessages.objects.create_message(
            session_uuid,
            message_id,
            'assistant',
            ai_result['ai_reply'],
            sources=json.dumps(ai_result.get('sources', [])),
        )
        ChatSessions.objects.filter(session_uuid=session_uuid).update(updated_at=timezone.now())
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
