import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../../utils/constants';
import Icon from '../../../icon';
import { useSessions } from '../hooks';
import EmptyTip from '../../../empty-tip';
import Session from './session';

import './index.css';

const Sessions = ({ sessionId }) => {
  const {
    sessions,
    closeShowSessions,
  } = useSessions();

  return (
    <div className="sea-qa-ai-ask-sessions-wrapper" style={{ width: 280, marginLeft: 16 }}>
      <div className="sea-qa-ai-ask-sessions-header">
        <div>{gettext('Histories')}</div>
        <button type="button" className="btn btn-icon p-0 border-0 bg-transparent" onClick={closeShowSessions} title={gettext('Close')}>
          <Icon symbol="close" />
        </button>
      </div>
      <div className="sea-qa-ai-ask-sessions-body">
        {sessions.length === 0 && (
          <EmptyTip className="sea-qa-ai-ask-sessions-empty" text={gettext('No chats')} />
        )}
        {sessions.map((session) => (
          <Session
            key={session._id}
            session={session}
            isSelected={sessionId === session._id}
          />
        ))}
      </div>
    </div>
  );
};

Sessions.propTypes = {
  sessionId: PropTypes.string,
};

export default Sessions;
