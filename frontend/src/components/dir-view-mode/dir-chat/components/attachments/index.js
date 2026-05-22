import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Icon from '../../../../icon';

import './index.css';

const Attachments = ({ attachments = [], className = '', onRemove }) => {
  const validAttachments = Array.isArray(attachments) ? attachments.filter(Boolean) : [];

  if (validAttachments.length === 0) {
    return null;
  }

  return (
    <div className={classNames('sea-qa-ai-chat-message-attachments', className)}>
      {validAttachments.map((attachment, index) => (
        <div className="sf-metadata-tag" key={attachment.key || `${attachment.repo_id}-${attachment.path}-${index}`}>
          <Icon symbol="ai-file" className="mr-1" />
          <span className="text-truncate" title={attachment.name}>{attachment.name}</span>
          {onRemove && (
            <button
              type="button"
              className="border-0 bg-transparent ml-1 p-0 d-flex align-items-center"
              onClick={() => onRemove(attachment, index)}
            >
              <Icon symbol="close" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

Attachments.propTypes = {
  attachments: PropTypes.array,
  className: PropTypes.string,
  onRemove: PropTypes.func,
};

export default Attachments;
