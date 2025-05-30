# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status


from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.notifications.models import UserNotification, SysUserNotification

from seahub.notifications.utils import update_notice_detail, update_sdoc_notice_detail
from seahub.api2.utils import api_error
from seahub.seadoc.models import SeadocNotification
from seahub.utils.timeutils import datetime_to_isoformat_timestr

logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'

NOTIF_TYPE = ['general', 'discussion']


class NotificationsView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """ used for get notifications

        Permission checking:
        1. login user.
        """
        result = {}

        username = request.user.username

        try:
            per_page = int(request.GET.get('per_page', ''))
            page = int(request.GET.get('page', ''))
        except ValueError:
            per_page = 25
            page = 1

        start = (page - 1) * per_page
        end = page * per_page

        notice_list = UserNotification.objects.get_user_notifications(username)[start:end]

        result_notices = update_notice_detail(request, notice_list)
        notification_list = []
        for i in result_notices:
            if i.detail is not None:
                notice = {}
                notice['id'] = i.id
                notice['type'] = i.msg_type
                notice['detail'] = i.detail
                notice['time'] = datetime_to_isoformat_timestr(i.timestamp)
                notice['seen'] = i.seen

                notification_list.append(notice)

        unseen_count = UserNotification.objects.filter(to_user=username, seen=False).count()
        result['unseen_count'] = unseen_count

        total_count = UserNotification.objects.filter(to_user=username).count()

        result['notification_list'] = notification_list
        result['count'] = total_count

        return Response(result)

    def put(self, request):
        """ currently only used for mark all notifications seen

        Permission checking:
        1. login user.
        """

        username = request.user.username
        unseen_notices = UserNotification.objects.get_user_notifications(username,
                                                                         seen=False)
        for notice in unseen_notices:
            notice.seen = True
            notice.save()

        return Response({'success': True})

    def delete(self, request):
        """ delete a notification by username

        Permission checking:
        1. login user.
        """
        username = request.user.username

        UserNotification.objects.remove_user_notifications(username)

        return Response({'success': True})


class NotificationView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request):
        """ currently only used for mark a notification seen

        Permission checking:
        1. login user.
        """

        notice_id = request.data.get('notice_id')

        # argument check
        try:
            int(notice_id)
        except Exception as e:
            error_msg = 'notice_id invalid.'
            logger.error(e)
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        try:
            notice = UserNotification.objects.get(id=notice_id)
        except UserNotification.DoesNotExist as e:
            logger.error(e)
            error_msg = 'Notification %s not found.' % notice_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if notice.to_user != username:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not notice.seen:
            notice.seen = True
            notice.save()

        return Response({'success': True})


class SdocNotificationsView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """ used for get sdoc notifications

        Permission checking:
        1. login user.
        """
        result = {}
        username = request.user.username

        try:
            per_page = int(request.GET.get('per_page', ''))
            page = int(request.GET.get('page', ''))
        except ValueError:
            per_page = 25
            page = 1

        if page < 1:
            error_msg = 'page invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        start = (page - 1) * per_page
        end = page * per_page

        notice_list = SeadocNotification.objects.list_all_by_user(username)[start:end]
        result_notices = update_sdoc_notice_detail(notice_list)
        notification_list = []
        for i in result_notices:
            if i.detail is not None:
                notice = {}
                notice['id'] = i.id
                notice['type'] = i.msg_type
                notice['detail'] = i.detail
                notice['time'] = datetime_to_isoformat_timestr(i.created_at)
                notice['seen'] = i.seen

                notification_list.append(notice)

        unseen_count = SeadocNotification.objects.filter(username=username, seen=False).count()
        result['unseen_count'] = unseen_count
            
        total_count = SeadocNotification.objects.filter(username=username).count()

        result['notification_list'] = notification_list
        result['count'] = total_count

        return Response(result)
    
    def put(self, request):
        """mark all sdoc notifications seen"""
        username = request.user.username
        try:
            SeadocNotification.objects.filter(username=username, seen=False).update(seen=True)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
    
    def delete(self, request):
        """ delete a sdoc notification by username

        Permission checking:
        1. login user.
        """
        username = request.user.username

        SeadocNotification.objects.remove_user_notifications(username)

        return Response({'success': True})



class SdocNotificationView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request):
        """ currently only used for mark a sdoc notification seen

        Permission checking:
        1. login user.
        """

        notice_id = request.data.get('notice_id')

        # argument check
        try:
            int(notice_id)
        except Exception as e:
            error_msg = 'notice_id invalid.'
            logger.error(e)
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        try:
            notice = SeadocNotification.objects.get(id=notice_id)
        except SeadocNotification.DoesNotExist as e:
            logger.error(e)
            error_msg = 'Notification %s not found.' % notice_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if notice.username != username:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not notice.seen:
            notice.seen = True
            notice.save()

        return Response({'success': True})
    

class AllNotificationsView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """ used for get all notifications
        general and discussion

        Permission checking:
        1. login user.
        """
        result = {
            'general': {},
            'discussion': {}
        }

        username = request.user.username

        try:
            per_page = int(request.GET.get('per_page', '25'))
            page = int(request.GET.get('page', '1'))
        except ValueError:
            per_page = 25
            page = 1

        if page < 1:
            error_msg = 'page invalid'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        start = (page - 1) * per_page
        end = page * per_page

        general_notice_list = UserNotification.objects.get_user_notifications(username)[start:end]
        sdoc_notice_list = SeadocNotification.objects.list_all_by_user(username)[start:end]

        general_result_notices = update_notice_detail(request, general_notice_list)
        sdoc_result_notices = update_sdoc_notice_detail(sdoc_notice_list)

        notification_list = []
        sdoc_notification_list = []
        for i in general_result_notices:
            if i.detail is not None:
                notice = {}
                notice['id'] = i.id
                notice['type'] = i.msg_type
                notice['detail'] = i.detail
                notice['time'] = datetime_to_isoformat_timestr(i.timestamp)
                notice['seen'] = i.seen

                notification_list.append(notice)
        
        for i in sdoc_result_notices:
            if i.detail is not None:
                notice = {}
                notice['id'] = i.id
                notice['type'] = i.msg_type
                notice['detail'] = i.detail
                notice['time'] = datetime_to_isoformat_timestr(i.created_at)
                notice['seen'] = i.seen

                sdoc_notification_list.append(notice)

        unseen_count = UserNotification.objects.filter(to_user=username, seen=False).count()
        result['general']['unseen_count'] = unseen_count

        sdoc_unseen_count = SeadocNotification.objects.filter(username=username, seen=False).count()
        result['discussion']['unseen_count'] = sdoc_unseen_count

        total_count = UserNotification.objects.filter(to_user=username).count()
        sdoc_total_count = SeadocNotification.objects.filter(username=username).count()

        result['general']['notification_list'] = notification_list
        result['discussion']['notification_list'] = sdoc_notification_list
        result['general']['count'] = total_count
        result['discussion']['count'] = sdoc_total_count
        result['total_unseen_count'] = result['general']['unseen_count'] + result['discussion']['unseen_count']

        return Response(result)
    
    
    def put(self, request):
        """ currently only used for mark all notifications seen

        Permission checking:
        1. login user.
        """

        username = request.user.username
        try:
            UserNotification.objects.get_user_notifications(username, seen=False).update(seen=True)
            SeadocNotification.objects.filter(username=username, seen=False).update(seen=True)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)


        return Response({'success': True})

class SysUserNotificationUnseenView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """
        get the unseen sys-user-notifications by login user
        """
        username = request.user.username
        notifications = SysUserNotification.objects.unseen_notes(username)
        return Response({
            'notifications': [n.to_dict() for n in notifications],
        })

class SysUserNotificationSeenView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request, nid):
        """
        mark a sys-user-notification seen by login user
        Permission checking:
        1. login user.
        """
        # arguments check
        username = request.user.username
        try:
            nid = int(nid)
        except ValueError:
            error_msg = 'nid invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if nid <= 0:
            error_msg = 'nid invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resouce check
        notification = SysUserNotification.objects.filter(id=nid).first()
        if not notification:
            error_msg = 'notification %s not found.' % nid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if notification.to_user != username:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # set notification to seen
        try:
            notification.update_notification_to_seen()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'notification': notification.to_dict()})
