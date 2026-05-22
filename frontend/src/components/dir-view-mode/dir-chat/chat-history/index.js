import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import CommonMessage from './common-message';

import './index.css';

const ChatHistory = ({ chat, settings, repoID }) => {
  const { message = {}, isUserSpeak = false } = chat;

  if (Object.keys(message).length === 0) {
    return null;
  }

  return (
    <div className={classNames('sea-qa-ai-ask-chat', { 'user-input-chat': isUserSpeak })}>
      <CommonMessage message={message} settings={settings} repoID={repoID} />
    </div>
  );
};

ChatHistory.propTypes = {
  chat: PropTypes.object,
  settings: PropTypes.object,
  repoID: PropTypes.string,
};

export default ChatHistory;
