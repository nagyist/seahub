import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { MarkdownViewer } from '@seafile/seafile-editor';
import { mediaUrl, gettext } from '../../../../../utils/constants';
import { CHAT_MESSAGE_TYPE } from '../../constants';
import { useDocuments } from '../../hooks';
import { Attachments } from '../../components';
import ThoughtProcess from '../thought-process';

import './index.css';

const CommonMessage = ({ message, settings, repoID }) => {
  const { openDocument } = useDocuments();

  const handleOpenSource = useCallback((source) => {
    openDocument({
      url: source.url || `${source.repo_id || repoID}:${source.path}`,
      name: source.title || source.name || source.path,
      content: source.content || '',
      path: source.path,
      repo_id: source.repo_id || repoID,
    });
  }, [openDocument, repoID]);

  return (
    <>
      <Attachments attachments={message[CHAT_MESSAGE_TYPE.ATTACHMENTS]} />
      <div className="sea-qa-ai-ask-message-content">
        <ThoughtProcess value={message[CHAT_MESSAGE_TYPE.THOUGHT_PROCESS]} settings={settings} />
        {message[CHAT_MESSAGE_TYPE.TEXT] && <>{message[CHAT_MESSAGE_TYPE.TEXT]}</>}
        {message[CHAT_MESSAGE_TYPE.AI_REPLY] && (
          <MarkdownViewer
            value={message[CHAT_MESSAGE_TYPE.AI_REPLY]}
            isFetching={false}
            isShowOutline={false}
            mathJaxSource={mediaUrl + 'js/mathjax/tex-svg.js'}
          />
        )}
        {Array.isArray(message[CHAT_MESSAGE_TYPE.SOURCES]) && message[CHAT_MESSAGE_TYPE.SOURCES].length > 0 && (
          <div className="mt-3">
            <div className="font-weight-bold mb-2">{gettext('References')}</div>
            <div className="d-flex flex-column">
              {message[CHAT_MESSAGE_TYPE.SOURCES].map((source, index) => (
                <button
                  key={`${source.path || source.url || index}`}
                  type="button"
                  className="btn btn-light text-left mb-2"
                  onClick={() => handleOpenSource(source)}
                >
                  <div className="font-weight-bold text-truncate">{source.title || source.name || source.path}</div>
                  {source.path && <div className="small text-secondary text-truncate">{source.path}</div>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

CommonMessage.propTypes = {
  message: PropTypes.object,
  settings: PropTypes.object,
  repoID: PropTypes.string,
};

export default CommonMessage;
