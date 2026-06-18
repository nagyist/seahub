import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import { gettext } from '../../../../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const ThoughtProcessDialog = ({ isOpen, toggle, value }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen={true} toggle={toggle} autoFocus={false} size="lg">
      <SeahubModalHeader toggle={toggle}>
        {gettext('Thought process')}
      </SeahubModalHeader>
      <ModalBody>
        <div className="sea-ai-thought-process-value">
          {value}
        </div>
      </ModalBody>
    </Modal>
  );
};

ThoughtProcessDialog.propTypes = {
  isOpen: PropTypes.bool,
  toggle: PropTypes.func.isRequired,
  value: PropTypes.string,
};

export default ThoughtProcessDialog;
