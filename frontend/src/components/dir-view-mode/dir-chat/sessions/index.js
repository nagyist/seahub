import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../../utils/constants';
import CenteredLoading from '../../../centered-loading';
import Icon from '../../../icon';
import { useSessions } from '../hooks';
import EmptyTip from '../../../empty-tip';
import Session from './session';
import { SESSION_TAB_TYPE } from '../constants';

import './index.css';

const Sessions = ({ sessionId }) => {
  const {
    sessions,
    teamSessions,
    isTeamSessionsLoading,
    activeTab,
    setActiveTab,
    closeShowSessions,
    loadTeamSessions,
  } = useSessions();

  const isTeamTab = activeTab === SESSION_TAB_TYPE.TEAM;
  const displaySessions = isTeamTab ? teamSessions : sessions;

  useEffect(() => {
    if (isTeamTab) {
      loadTeamSessions();
    }
  }, [isTeamTab, loadTeamSessions]);

  return (
    <div className="sea-ai-ask-sessions-wrapper" style={{ width: 280, marginLeft: 16 }}>
      <div className="sea-ai-ask-sessions-header">
        <div>{gettext('Histories')}</div>
        <button type="button" className="btn btn-icon p-0 border-0 bg-transparent" onClick={closeShowSessions} title={gettext('Close')}>
          <Icon symbol="close" />
        </button>
      </div>
      <div className="sea-ai-ask-sessions-tabs">
        <button
          type="button"
          className={`sea-ai-ask-sessions-tab ${activeTab === SESSION_TAB_TYPE.MINE ? 'active' : ''}`}
          onClick={() => setActiveTab(SESSION_TAB_TYPE.MINE)}
        >
          {gettext('Mine')}
        </button>
        <button
          type="button"
          className={`sea-ai-ask-sessions-tab ${activeTab === SESSION_TAB_TYPE.TEAM ? 'active' : ''}`}
          onClick={() => setActiveTab(SESSION_TAB_TYPE.TEAM)}
        >
          {gettext('Shared')}
        </button>
      </div>
      <div className="sea-ai-ask-sessions-body">
        {isTeamSessionsLoading && (
          <CenteredLoading />
        )}
        {!isTeamSessionsLoading && displaySessions.length === 0 && (
          <EmptyTip className="sea-ai-ask-sessions-empty" text={gettext('No chats')} />
        )}
        {!isTeamSessionsLoading && displaySessions.map((session) => (
          <Session
            key={session._id}
            session={session}
            isSelected={sessionId === session._id}
            isTeamTab={isTeamTab}
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
