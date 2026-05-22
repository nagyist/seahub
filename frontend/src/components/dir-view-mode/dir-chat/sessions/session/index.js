import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Button, Dropdown, DropdownMenu, DropdownItem, DropdownToggle, Input, Modal, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../../../../utils/constants';
import Icon from '../../../../icon';
import CommonOperationConfirmationDialog from '../../../../dialog/common-operation-confirmation-dialog';
import { useAskPage, useSessions } from '../../hooks';

import './index.css';

const Session = ({ session, isSelected }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isShowRenameDialog, setIsShowRenameDialog] = useState(false);
  const [isShowDeleteDialog, setIsShowDeleteDialog] = useState(false);
  const [renameValue, setRenameValue] = useState(session.name);

  const { modifySession, deleteSession } = useSessions();
  const { togglePageSlugId } = useAskPage();

  const toggleDropdown = useCallback((event) => {
    event && event.stopPropagation();
    setIsOpen((currentValue) => !currentValue);
  }, []);

  const icon = 'new-chat';

  return (
    <>
      <div
        className={classNames('sea-qa-ai-ask-session-item', { active: isSelected || isOpen })}
        onClick={() => togglePageSlugId(session._id)}
      >
        <Icon symbol={icon} className="mr-2" />
        <div className="sea-qa-ai-ask-session-content">
          <div className="sea-qa-ai-ask-session-name text-truncate" title={session.name}>{session.name}</div>
        </div>
        <Dropdown isOpen={isOpen} toggle={toggleDropdown}>
          <DropdownToggle color="link" className="sea-qa-ai-ask-session-more-op-btn p-0 border-0 text-secondary">
            <Icon symbol="more-level" />
          </DropdownToggle>
          <DropdownMenu end>
            <DropdownItem onClick={() => setIsShowRenameDialog(true)}>{gettext('Rename')}</DropdownItem>
            <DropdownItem onClick={() => setIsShowDeleteDialog(true)}>{gettext('Delete')}</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
      {isShowRenameDialog && (
        <Modal isOpen={true} toggle={() => setIsShowRenameDialog(false)}>
          <ModalBody>
            <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => setIsShowRenameDialog(false)}>{gettext('Cancel')}</Button>
            <Button color="primary" onClick={() => modifySession(session._id, { name: renameValue }).then(() => setIsShowRenameDialog(false))}>{gettext('Submit')}</Button>
          </ModalFooter>
        </Modal>
      )}
      {isShowDeleteDialog && (
        <CommonOperationConfirmationDialog
          title={gettext('Delete chat')}
          message={gettext('Are you sure you want to delete this chat?')}
          executeOperation={() => deleteSession(session._id)}
          confirmBtnText={gettext('Delete')}
          toggleDialog={() => setIsShowDeleteDialog(false)}
        />
      )}
    </>
  );
};

Session.propTypes = {
  session: PropTypes.object,
  isSelected: PropTypes.bool,
};

export default Session;
