import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, Input, ModalBody, ModalFooter, Label, Form, InputGroup, FormGroup } from 'reactstrap';
import { gettext } from '../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import { Utils } from '../../utils/utils';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
};

class AddOrgUserDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isPasswordVisible: true,
      email: '',
      name: '',
      password: '',
      newPassword: '',
      errMessage: '',
      isAddingUser: false,
    };
    this.passwdInput = React.createRef();
    this.passwdNewInput = React.createRef();
  }

  handleSubmit = () => {
    let isValid = this.validateInputParams();
    if (isValid) {
      let { email, name, password } = this.state;
      this.setState({ isAddingUser: true });
      this.props.handleSubmit(email, name.trim(), password);
    }
  };

  togglePasswordVisible = () => {
    this.setState({ isPasswordVisible: !this.state.isPasswordVisible }, () => {
      if (this.state.isPasswordVisible) {
        this.passwdInput.type = 'password';
        this.passwdNewInput.type = 'password';
      } else {
        this.passwdInput.type = 'text';
        this.passwdNewInput.type = 'text';
      }
    });
  };

  generatePassword = () => {
    let val = Utils.generatePassword(8);
    this.setState({
      password: val,
      newPassword: val,
      isPasswordVisible: false
    }, () => {
      this.passwdInput.type = 'text';
      this.passwdNewInput.type = 'text';
    });
  };

  inputEmail = (e) => {
    let email = e.target.value.trim();
    this.setState({ email: email });
  };

  inputName = (e) => {
    let name = e.target.value;
    this.setState({ name: name });
  };

  inputPassword = (e) => {
    let passwd = e.target.value.trim();
    this.setState({ password: passwd }, () => {
      if (this.state.isPasswordVisible) {
        this.passwdInput.type = 'password';
        this.passwdNewInput.type = 'password';
      }
    });
  };

  inputPasswordNew = (e) => {
    let passwd = e.target.value.trim();
    this.setState({ newPassword: passwd }, () => {
      if (this.state.isPasswordVisible) {
        this.passwdInput.type = 'password';
        this.passwdNewInput.type = 'password';
      }
    });
  };

  toggle = () => {
    this.props.toggle();
  };

  validateInputParams() {
    let errMessage;
    let email = this.state.email;
    if (!email.length) {
      errMessage = gettext('email is required');
      this.setState({ errMessage: errMessage });
      return false;
    }
    let name = this.state.name.trim();
    if (!name.length) {
      errMessage = gettext('Name is required');
      this.setState({ errMessage: errMessage });
      return false;
    }

    let password1 = this.state.password;
    let password2 = this.state.newPassword;
    if (!password1.length) {
      errMessage = gettext('Please enter password');
      this.setState({ errMessage: errMessage });
      return false;
    }
    if (!password2.length) {
      errMessage = gettext('Please enter the password again');
      this.setState({ errMessage: errMessage });
      return false;
    }
    if (password1 !== password2) {
      errMessage = gettext('Passwords don\'t match');
      this.setState({ errMessage: errMessage });
      return false;
    }
    return true;
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <SeahubModalHeader toggle={this.toggle}>{gettext('Add User')}</SeahubModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="userEmail">{gettext('Email')}</Label>
              <Input id="userEmail" value={this.state.email || ''} onChange={this.inputEmail} />
            </FormGroup>
            <FormGroup>
              <Label for="userName">{gettext('Name')}</Label>
              <Input id="userName" value={this.state.name || ''} onChange={this.inputName} />
            </FormGroup>
            <FormGroup>
              <Label for="userPwd">{gettext('Password')}</Label>
              <InputGroup className="passwd">
                <Input id="userPwd" innerRef={input => {this.passwdInput = input;}} value={this.state.password || ''} onChange={this.inputPassword} />
                <Button onClick={this.togglePasswordVisible}>
                  <i className={`link-operation-icon sf3-font sf3-font-eye${this.state.isPasswordVisible ? '-slash' : ''}`}></i>
                </Button>
                <Button onClick={this.generatePassword}>
                  <i className="link-operation-icon sf3-font sf3-font-magic"></i>
                </Button>
              </InputGroup>
            </FormGroup>
            <FormGroup>
              <Label for="userPwdNew">{gettext('Confirm Password')}</Label>
              <Input id="userPwdNew" innerRef={input => {this.passwdNewInput = input;}} className="passwd" value={this.state.newPassword || ''} onChange={this.inputPasswordNew} />
            </FormGroup>
          </Form>
          {this.state.errMessage && <Label className="err-message">{this.state.errMessage}</Label>}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" disabled={this.state.isAddingUser} onClick={this.handleSubmit} className={this.state.isAddingUser ? 'btn-loading' : ''}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

AddOrgUserDialog.propTypes = propTypes;

export default AddOrgUserDialog;
