import jwt
import time
import requests
import json
import random
from urllib.parse import urljoin

from seahub.settings import SECRET_KEY, SEAFEVENTS_SERVER_URL
from seahub.views import check_folder_permission

from seaserv import seafile_api


def add_init_metadata_task(params):
    payload = {'exp': int(time.time()) + 300, }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    headers = {"Authorization": "Token %s" % token}
    url = urljoin(SEAFEVENTS_SERVER_URL, '/add-init-metadata-task')
    resp = requests.get(url, params=params, headers=headers)
    return json.loads(resp.content)['task_id']


def generator_base64_code(length=4):
    possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz0123456789'
    ids = random.sample(possible, length)
    return ''.join(ids)


def gen_unique_id(id_set, length=4):
    _id = generator_base64_code(length)

    while True:
        if _id not in id_set:
            return _id
        _id = generator_base64_code(length)


def get_sys_columns():
    from seafevents.repo_metadata.utils import METADATA_TABLE
    columns = [
        METADATA_TABLE.columns.file_creator.to_dict(),
        METADATA_TABLE.columns.file_ctime.to_dict(),
        METADATA_TABLE.columns.file_modifier.to_dict(),
        METADATA_TABLE.columns.file_mtime.to_dict(),
        METADATA_TABLE.columns.parent_dir.to_dict(),
        METADATA_TABLE.columns.file_name.to_dict(),
        METADATA_TABLE.columns.is_dir.to_dict(),
        METADATA_TABLE.columns.file_type.to_dict(),
        METADATA_TABLE.columns.location.to_dict(),
        METADATA_TABLE.columns.obj_id.to_dict(),
        METADATA_TABLE.columns.size.to_dict(),
        METADATA_TABLE.columns.suffix.to_dict(),
        METADATA_TABLE.columns.file_details.to_dict(),
        METADATA_TABLE.columns.description.to_dict(),
    ]

    return columns


def get_unmodifiable_columns():
    from seafevents.repo_metadata.utils import METADATA_TABLE
    columns = [
        METADATA_TABLE.columns.file_creator.to_dict(),
        METADATA_TABLE.columns.file_ctime.to_dict(),
        METADATA_TABLE.columns.file_modifier.to_dict(),
        METADATA_TABLE.columns.file_mtime.to_dict(),
        METADATA_TABLE.columns.parent_dir.to_dict(),
        METADATA_TABLE.columns.file_name.to_dict(),
        METADATA_TABLE.columns.is_dir.to_dict(),
        METADATA_TABLE.columns.file_type.to_dict(),
        METADATA_TABLE.columns.location.to_dict(),
        METADATA_TABLE.columns.obj_id.to_dict(),
        METADATA_TABLE.columns.size.to_dict(),
        METADATA_TABLE.columns.suffix.to_dict(),
        METADATA_TABLE.columns.file_details.to_dict(),
    ]

    return columns


def init_metadata(metadata_server_api):
    from seafevents.repo_metadata.utils import METADATA_TABLE

    # delete base to prevent dirty data caused by last failure
    metadata_server_api.delete_base()
    metadata_server_api.create_base()

    # init sys column
    sys_columns = get_sys_columns()
    metadata_server_api.add_columns(METADATA_TABLE.id, sys_columns)


def get_file_download_token(repo_id, file_id, username):
    return seafile_api.get_fileserver_access_token(repo_id, file_id, 'download', username, use_onetime=True)


def can_read_metadata(request, repo_id):
    permission = check_folder_permission(request, repo_id, '/')
    if permission:
        return True
    return False
