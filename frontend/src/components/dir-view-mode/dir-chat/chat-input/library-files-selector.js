import React, { useCallback, useRef, useEffect } from 'react';
import { gettext } from '../../../../utils/constants';
import { seafileAPI } from '../../../../utils/seafile-api';
import AttachmentObject from '../models/attachment_object';
import SyncSelector from '../components/selector/sync-selector';

const TEXT_ATTACHMENT_SUFFIXES = new Set([
  '.txt', '.md', '.markdown', '.json', '.yaml', '.yml', '.csv', '.tsv',
  '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.c', '.cc', '.cpp', '.h', '.hpp',
  '.go', '.rs', '.sql', '.sh', '.css', '.scss', '.less', '.html', '.xml',
]);

const canLoadAttachmentContent = (path) => {
  const lowerPath = (path || '').toLowerCase();
  const dotIndex = lowerPath.lastIndexOf('.');
  if (dotIndex < 0) {
    return false;
  }
  return TEXT_ATTACHMENT_SUFFIXES.has(lowerPath.slice(dotIndex));
};

const resolveAttachmentContent = async (repoId, path) => {
  if (!canLoadAttachmentContent(path)) {
    return '';
  }
  try {
    const downloadLinkRes = await seafileAPI.getFileDownloadLink(repoId, path);
    const fileContentRes = await seafileAPI.getFileContent(downloadLinkRes.data);
    return typeof fileContentRes.data === 'string' ? fileContentRes.data : '';
  } catch (error) {
    return '';
  }
};

const LibraryFilesSelector = ({ repoID, value: attachments = [], onChange: propsOnChange, disabled }) => {
  const searchResultsRef = useRef(new Map());

  // Cache existing attachments so we can find them if they are toggled
  useEffect(() => {
    if (Array.isArray(attachments)) {
      attachments.forEach((att) => {
        if (!searchResultsRef.current.has(att.key)) {
          searchResultsRef.current.set(att.key, {
            path: att.path,
            type: 'file',
          });
        }
      });
    }
  }, [attachments]);

  const onSearch = useCallback((value, signal) => {
    if (!value.trim()) {
      return Promise.resolve([]);
    }
    return seafileAPI.searchFileInRepo(repoID, value).then((res) => {
      let fileList = [];
      if (Array.isArray(res.data)) {
        fileList = res.data;
      } else if (res.data && Array.isArray(res.data.data)) {
        fileList = res.data.data;
      } else if (res.data && Array.isArray(res.data.results)) {
        fileList = res.data.results;
      } else if (res.data && Array.isArray(res.data.obj_list)) {
        fileList = res.data.obj_list;
      }

      const files = fileList.filter((item) => item.type === 'file' || item.is_dir === false || !item.type);

      files.forEach((file) => {
        const path = file.path || file.fullpath || file.name || '';
        if (!path) return;
        const key = `${repoID}:${path}`;
        searchResultsRef.current.set(key, file);
      });

      return files.map((file) => {
        const path = file.path || file.fullpath || file.name || '';
        if (!path) return null;
        const key = `${repoID}:${path}`;
        const name = path.substr(path.lastIndexOf('/') + 1);
        return {
          value: key,
          label: name,
          icon: 'file',
        };
      }).filter(Boolean);
    }).catch((error) => {
      // Suppress abort/cancel errors
      if (error && error.name === 'AbortError') return [];
      console.error('Search failed:', error);
      return [];
    });
  }, [repoID]);

  const onChange = useCallback(async (selectedKeys) => {
    const currentKeys = attachments.map((att) => att.key);

    const addedKeys = selectedKeys.filter((key) => !currentKeys.includes(key));
    const removedKeys = currentKeys.filter((key) => !selectedKeys.includes(key));

    let updatedAttachments = [...attachments];

    if (removedKeys.length > 0) {
      updatedAttachments = updatedAttachments.filter((att) => !removedKeys.includes(att.key));
    }

    if (addedKeys.length > 0) {
      for (const key of addedKeys) {
        const file = searchResultsRef.current.get(key);
        if (file) {
          const name = file.path.substr(file.path.lastIndexOf('/') + 1);
          const content = await resolveAttachmentContent(repoID, file.path);
          const newAtt = new AttachmentObject({
            repo_id: repoID,
            path: file.path,
            name: name,
            content: content,
          });
          if (!updatedAttachments.some((att) => att.key === newAtt.key)) {
            updatedAttachments.push(newAtt);
          }
        }
      }
    }

    propsOnChange && propsOnChange(updatedAttachments);
  }, [attachments, repoID, propsOnChange]);

  return (
    <SyncSelector
      icon="plus"
      className="attach-files-btn"
      title={gettext('Search files in this library')}
      value={attachments.map((att) => att.key)}
      onChange={onChange}
      onSearch={onSearch}
      disabled={disabled}
    />
  );
};

export default LibraryFilesSelector;
