import React from 'react';
import { gettext } from '../../../utils/constants';

import './index.css';

const Tip = ({ isSearchEnabled, hasAvailableOptions, searchValue, tip }) => {
  if (!hasAvailableOptions || !isSearchEnabled) {
    return (
      <div className="option-editor-no-results-tip">{tip}</div>
    );
  }

  if (searchValue) {
    return (
      <div className="option-editor-no-results-tip">{gettext('No results')}</div>
    );
  }

  return (
    <div className="option-editor-start-searching-tip">
      {gettext('Enter characters to start searching')}
    </div>
  );
};

export default Tip;
