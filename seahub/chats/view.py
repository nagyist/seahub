# -*- coding: utf-8 -*-
import logging
import time

from django.conf import settings
from django.core.cache import cache
from django.http import StreamingHttpResponse
from django.utils.translation import gettext as _
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from pysearpc import SearpcError
from seaserv import seafile_api

from seahub.ai.utils import is_ai_usage_over_limit
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.chats.constants import AI_REPLY_TIMEOUT
from seahub.chats.models import ChatMessageThoughtProcess, ChatMessages, ChatSessions
from seahub.chats.utils import build_context_messages, gen_chat_task_id, gen_message_id, get_ai_reply, \
    process_stream_ai_reply, record_message_to_db, strip_content_details_from_attachments, verify_chat_ai_config
from seahub.views import check_folder_permission

logger = logging.getLogger(__name__)


def get_repo_developer_mode():
    return getattr(settings, 'DEBUG', False)


def get_repo_prompt(repo_id):
    return ''


def get_repo_streaming_response(repo_id):
    return True


def check_session_access(session, username):
    return session.username == username


class ChatSessionsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        repo_id = request.GET.get('repo_id')
        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id parameter is required.')
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        sessions = ChatSessions.objects.get_sessions_by_repo(repo_id, request.user.username)
        return Response({'sessions': [session.to_dict() for session in sessions]})

    def post(self, request):
        repo_id = request.data.get('repo_id')
        session_name = request.data.get('session_name', '')
        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id parameter is required.')
        if not session_name:
            return api_error(status.HTTP_400_BAD_REQUEST, 'session_name parameter is required.')
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        session = ChatSessions.objects.create_session(repo_id, session_name, request.user.username)
        return Response({'session': session.to_dict()}, status=status.HTTP_201_CREATED)


class ChatSessionView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request, session_uuid):
        repo_id = request.data.get('repo_id')
        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id parameter is required.')
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        session = ChatSessions.objects.get_session_by_uuid(session_uuid)
        if not session or session.repo_id != repo_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'Session not found.')
        if session.username != request.user.username:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied. Only the session owner can modify this session.')

        session_name = request.data.get('session_name')
        if session_name is None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'session_name parameter is required.')
        session.session_name = session_name
        session.save()
        return Response({'success': True, 'session': session.to_dict()})

    def delete(self, request, session_uuid):
        repo_id = request.data.get('repo_id')
        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id parameter is required.')
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        session = ChatSessions.objects.get_session_by_uuid(session_uuid)
        if not session or session.repo_id != repo_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'Session not found.')
        if session.username != request.user.username:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied. Only the session owner can delete this session.')

        ChatMessages.objects.filter(session_uuid=session_uuid).delete()
        ChatMessageThoughtProcess.objects.filter(session_uuid=session_uuid).delete()
        session.delete()
        return Response({'success': True})


class ChatMessagesView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, session_uuid):
        repo_id = request.GET.get('repo_id')
        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id parameter is required.')
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        session = ChatSessions.objects.get_session_by_uuid(session_uuid)
        if not session or session.repo_id != repo_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'Session not found.')
        if not check_session_access(session, request.user.username):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        messages = ChatMessages.objects.get_messages_by_session(session_uuid)
        developer_mode = get_repo_developer_mode()
        message_ids = [message.message_id for message in messages if message.message_id]
        thought_process_map = {}
        if developer_mode and message_ids:
            thought_process_map = ChatMessageThoughtProcess.objects.get_thought_process_from_session_uuid_and_message_ids(session_uuid, message_ids)

        messages_data = []
        for message in messages:
            if message.role == 'chat_manager':
                continue
            data = message.to_dict()
            if developer_mode and message.role == 'assistant':
                thought_process = thought_process_map.get(message.message_id, {})
                if thought_process:
                    data['thought_process'] = thought_process
            messages_data.append(data)

        chat_task_info = cache.get(gen_chat_task_id(session_uuid))
        results = {
            'messages': messages_data,
            'running_task': chat_task_info is not None,
        }
        if results['running_task']:
            results['user_input'] = chat_task_info['user_input']
        return Response(results)


class ChatView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        session_uuid = request.GET.get('session_uuid')
        if not session_uuid:
            return api_error(status.HTTP_400_BAD_REQUEST, 'session_uuid parameter is required.')

        session = ChatSessions.objects.get_session_by_uuid(session_uuid)
        if not session:
            return api_error(status.HTTP_404_NOT_FOUND, 'Session not found.')
        if not check_folder_permission(request, session.repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        if not check_session_access(session, request.user.username):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        chat_task_id = gen_chat_task_id(session_uuid)
        while cache.get(chat_task_id) is not None:
            time.sleep(0.1)

        ai_reply = ChatMessages.objects.get_last_message_by_session(session_uuid)
        if not ai_reply:
            return Response({'ai_reply': '', 'sources': [], 'session_uuid': session_uuid})

        result = {
            'ai_reply': ai_reply.content,
            'ai_reply_message_id': ai_reply.id,
            'sources': ai_reply.to_dict()['sources'],
            'session_uuid': session_uuid,
        }
        if get_repo_developer_mode():
            result['thought_process'] = ChatMessageThoughtProcess.objects.get_thought_process_from_session_uuid_and_message_id(
                session_uuid,
                ai_reply.message_id,
            )
        return Response(result)

    def post(self, request):
        if not verify_chat_ai_config():
            return api_error(status.HTTP_400_BAD_REQUEST, 'AI server not configured')

        repo_id = request.data.get('repo_id')
        query = request.data.get('query')
        attachments = request.data.get('attachments', [])
        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id parameter is required.')
        if not query:
            return api_error(status.HTTP_400_BAD_REQUEST, 'query invalid.')
        if not isinstance(attachments, list):
            return api_error(status.HTTP_400_BAD_REQUEST, 'attachments invalid.')

        try:
            repo = seafile_api.get_repo(repo_id)
        except SearpcError as error:
            logger.error(error)
            repo = None
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        clear_context = request.data.get('clear_context', False)
        if isinstance(clear_context, str):
            clear_context = clear_context.lower() == 'true'
        if not isinstance(clear_context, bool):
            return api_error(status.HTTP_400_BAD_REQUEST, 'clear_context invalid.')

        stream = get_repo_streaming_response(repo_id)
        stream_from_request = request.data.get('stream')
        if stream_from_request is not None:
            if isinstance(stream_from_request, str):
                stream_from_request = stream_from_request.lower() == 'true'
            if not isinstance(stream_from_request, bool):
                return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid stream')
            stream = stream_from_request

        org_id = request.user.org.org_id if getattr(request.user, 'org', None) else None
        if is_ai_usage_over_limit(request.user, org_id):
            return api_error(status.HTTP_429_TOO_MANY_REQUESTS, 'Credit not enough')

        session_uuid = request.data.get('session_uuid')
        if not session_uuid:
            session = ChatSessions.objects.create_session(repo_id, _('New chat'), request.user.username)
            session_uuid = session.session_uuid
        else:
            session = ChatSessions.objects.get_session_by_uuid(session_uuid)
            if not session or session.repo_id != repo_id:
                return api_error(status.HTTP_404_NOT_FOUND, 'Session not found.')
            if not check_session_access(session, request.user.username):
                return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
            if clear_context:
                if session.username != request.user.username:
                    return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied. You can only clear the context in your own sessions')
                ChatMessages.objects.clear_context(session_uuid)

        chat_task_id = gen_chat_task_id(session_uuid)
        if cache.get(chat_task_id) is not None:
            return api_error(status.HTTP_409_CONFLICT, 'There are unfinished tasks in the current session, please try again later.')

        try:
            message_id = gen_message_id(session_uuid)
        except Exception as error:
            logger.exception('Failure to generate message id: %s', error)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal server error')

        params = {
            'repo_id': repo_id,
            'repo_name': repo.name,
            'session_uuid': session_uuid,
            'query': query,
            'attachments': attachments,
            'context_messages': build_context_messages(session_uuid),
            'username': request.user.username,
            'org_id': org_id,
            'llm_model': request.data.get('model'),
            'stream': stream,
            'repo_prompt': get_repo_prompt(repo_id),
        }

        task_info = {
            'user_input': {
                'message': query,
                'attachments': strip_content_details_from_attachments(attachments),
            }
        }
        cache.set(chat_task_id, task_info, AI_REPLY_TIMEOUT)

        if stream:
            try:
                return StreamingHttpResponse(
                    process_stream_ai_reply(chat_task_id, get_ai_reply(params), session_uuid, message_id, query, attachments),
                    content_type='text/event-stream',
                    headers={
                        'Cache-Control': 'no-cache',
                        'X-Accel-Buffering': 'no',
                    },
                )
            except Exception as error:
                logger.exception('Failure to make stream: %s', error)
                cache.delete(chat_task_id)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal server error')

        try:
            ai_response = get_ai_reply(params)
        except Exception as error:
            logger.warning('AI service error: %s', error)
            ai_response = {
                'ai_reply': 'Sorry, the AI service is temporarily unavailable, please try again later.',
                'sources': [],
                'thought_process': {},
            }

        response = record_message_to_db(ai_response, session_uuid, message_id, query, attachments)
        cache.delete(chat_task_id)
        return Response(response)
