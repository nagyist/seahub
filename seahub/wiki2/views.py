# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging
import posixpath
from datetime import datetime

from seaserv import seafile_api

from django.http import Http404
from django.shortcuts import render

from seahub.wiki2.models import Wiki2 as Wiki
from seahub.utils import get_file_type_and_ext, render_permission_error
from seahub.utils.file_types import SEADOC
from seahub.auth.decorators import login_required
from seahub.wiki2.utils import check_wiki_permission, get_wiki_config

from seahub.utils.repo import get_repo_owner
from seahub.settings import SEADOC_SERVER_URL

# Get an instance of a logger
logger = logging.getLogger(__name__)


@login_required
def wiki_view(request, wiki_id):
    """ edit wiki page. for wiki2
    """
    # get wiki object or 404
    wiki = Wiki.objects.get(wiki_id=wiki_id)
    if not wiki:
        raise Http404
    
    
    repo_owner = get_repo_owner(request, wiki_id)
    wiki.owner = repo_owner
    
    page_id = request.GET.get('page_id')
    file_path = ''

    if page_id:
        wiki_config = get_wiki_config(wiki.repo_id, request.user.username)
        pages = wiki_config.get('pages', [])
        page_info = next(filter(lambda t: t['id'] == page_id, pages), {})
        file_path = page_info.get('path', '')

    is_page = False
    if file_path:
        is_page = True

    # perm check
    req_user = request.user.username
    permission = check_wiki_permission(wiki, req_user)
    if not check_wiki_permission(wiki, req_user):
        return render_permission_error(request, 'Permission denied.')

    latest_contributor = ''
    last_modified = 0
    file_type, ext = get_file_type_and_ext(posixpath.basename(file_path))
    repo = seafile_api.get_repo(wiki.repo_id)
    if is_page and file_type == SEADOC:
        try:
            dirent = seafile_api.get_dirent_by_path(wiki.repo_id, file_path)
            if dirent:
                latest_contributor, last_modified = dirent.modifier, dirent.mtime
        except Exception as e:
            logger.warning(e)

    last_modified = datetime.fromtimestamp(last_modified)

    return render(request, "wiki/wiki_edit.html", {
        "wiki": wiki,
        "file_path": file_path,
        "repo_name": repo.name if repo else '',
        "modifier": latest_contributor,
        "modify_time": last_modified,
        "seadoc_server_url": SEADOC_SERVER_URL,
        "permission": permission
    })
