import React from 'react';
import PropTypes from 'prop-types';
import { Attachments } from '../../components';

import './index.css';

const AttachmentsFormatter = ({ value = [], onRemove }) => {
  return (
    <div className="sea-qa-ai-chat-attachments-container w-100 px-4 o-hidden position-relative">
      <Attachments attachments={value} onRemove={onRemove} />
    </div>
  );
};

AttachmentsFormatter.propTypes = {
  value: PropTypes.array,
  onRemove: PropTypes.func,
};

export default AttachmentsFormatter;
