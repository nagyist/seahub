import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../../../utils/constants';
import Icon from '../../../../icon';

import './index.css';

const ThoughtProcess = ({ value, settings }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((currentValue) => !currentValue);
  }, []);

  if (!value) {
    return null;
  }

  const displayValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  const canExpand = value !== 'disabled';

  return (
    <>
      <button
        type="button"
        className="btn sea-qa-ai-thought-process-btn"
        onClick={canExpand ? toggleExpanded : undefined}
        disabled={!canExpand}
      >
        <span className="mr-2">{gettext('Thought process')}</span>
        <Icon symbol="open-in-new-tab" />
      </button>
      {canExpand && isExpanded && (
        <pre className="sea-qa-ai-thought-process-value mb-0 mt-2">{displayValue}</pre>
      )}
    </>
  );
};

ThoughtProcess.propTypes = {
  value: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  settings: PropTypes.object,
};

export default ThoughtProcess;
