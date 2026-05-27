import React from 'react';
import PropTypes from 'prop-types';
import { CHAT_MESSAGE_TYPE } from '../../constants';
import { Attachments } from '../../components';
import ThoughtProcess from '../thought-process';
import CustomizeMarkdownViewer from '../customize-markdown-viewer';

import './index.css';

const CommonMessage = ({ message, settings, repoID }) => {
  return (
    <>
      <Attachments attachments={message[CHAT_MESSAGE_TYPE.ATTACHMENTS]} />
      <div className="sea-qa-ai-ask-message-content">
        <ThoughtProcess value={message[CHAT_MESSAGE_TYPE.THOUGHT_PROCESS]} settings={settings} />
        {message[CHAT_MESSAGE_TYPE.TEXT] && <>{message[CHAT_MESSAGE_TYPE.TEXT]}</>}
        {message[CHAT_MESSAGE_TYPE.AI_REPLY] && <CustomizeMarkdownViewer message={message} repoID={repoID} />}
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
