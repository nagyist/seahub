import React, { useCallback } from 'react';
import { gettext } from '../../utils/constants';
import EventBus from '../common/event-bus';
import OpIcon from '../op-icon';
import { EVENT_BUS_TYPE } from '../common/event-bus-type';

const ChatToolbar = () => {
  const onNewChat = useCallback(() => {
    const eventBus = EventBus.getInstance();
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.CHAT_NEW_SESSION);
  }, []);

  const onToggleSessions = useCallback(() => {
    const eventBus = EventBus.getInstance();
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.CHAT_TOGGLE_SESSIONS);
  }, []);

  return (
    <div className="d-flex align-items-center">
      <OpIcon
        id="new-chat-btn"
        className="cur-view-path-btn mr-2"
        symbol="new-chat"
        tooltip={gettext('New chat')}
        op={onNewChat}
      />
      <OpIcon
        id="chat-history-btn"
        className="cur-view-path-btn"
        symbol="history"
        tooltip={gettext('Histories')}
        op={onToggleSessions}
      />
    </div>
  );
};

export default ChatToolbar;
