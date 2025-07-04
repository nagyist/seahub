import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { navigate } from '@gatsbyjs/reach-router';
import Nav from './org-users-nav';
import OrgUsersList from './org-users-list';
import MainPanelTopbar from './main-panel-topbar';
import ModalPortal from '../../components/modal-portal';
import ImportOrgUsersDialog from '../../components/dialog/org-import-users-dialog';
import AddOrgUserDialog from '../../components/dialog/org-add-user-dialog';
import InviteUserDialog from '../../components/dialog/org-admin-invite-user-dialog';
import InviteUserViaWeiXinDialog from '../../components/dialog/org-admin-invite-user-via-weixin-dialog';
import toaster from '../../components/toast';
import { orgAdminAPI } from '../../utils/org-admin-api';
import OrgUserInfo from '../../models/org-user';
import { gettext, invitationLink, orgID, siteRoot, orgEnableAdminInviteUser } from '../../utils/constants';
import { Utils } from '../../utils/utils';

class Search extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      value: ''
    };
  }

  handleInputChange = (e) => {
    this.setState({
      value: e.target.value
    });
  };

  handleKeyDown = (e) => {
    if (e.key == 'Enter') {
      e.preventDefault();
      this.handleSubmit();
    }
  };

  handleSubmit = () => {
    const value = this.state.value.trim();
    if (!value) {
      return false;
    }
    this.props.submit(value);
  };

  render() {
    return (
      <div className="input-icon">
        <i className="d-flex input-icon-addon sf3-font sf3-font-search"></i>
        <input
          type="text"
          className="form-control search-input h-6 mr-1"
          style={{ width: '15rem' }}
          placeholder={this.props.placeholder}
          value={this.state.value}
          onChange={this.handleInputChange}
          onKeyDown={this.handleKeyDown}
          autoComplete="off"
        />
      </div>
    );
  }
}

Search.propTypes = {
  placeholder: PropTypes.string.isRequired,
  submit: PropTypes.func.isRequired,
};

class OrgUsers extends Component {

  constructor(props) {
    super(props);
    this.state = {
      orgUsers: [],
      page: 1,
      pageNext: false,
      sortBy: '',
      sortOrder: 'asc',
      isShowAddOrgUserDialog: false,
      isImportOrgUsersDialogOpen: false,
      isInviteUserDialogOpen: false,
      isInviteUserViaWeiXinDialogOpen: false
    };
  }

  componentDidMount() {
    let urlParams = (new URL(window.location)).searchParams;
    const { page, sortBy, sortOrder } = this.state;
    this.setState({
      /*
        perPage: parseInt(urlParams.get('per_page') || perPage),
        currentPage: parseInt(urlParams.get('page') || currentPage),
        */
      page: parseInt(urlParams.get('page') || page),
      sortBy: urlParams.get('order_by') || sortBy,
      sortOrder: urlParams.get('direction') || sortOrder
    }, () => {
      this.initOrgUsersData(this.state.page);
    });
  }

  sortByQuotaUsage = (sortBy, sortOrder) => {
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      page: 1
    }, () => {
      let url = new URL(location.href);
      let searchParams = new URLSearchParams(url.search);
      const { page, sortBy, sortOrder } = this.state;
      searchParams.set('page', page);
      searchParams.set('order_by', sortBy);
      searchParams.set('direction', sortOrder);
      url.search = searchParams.toString();
      navigate(url.toString());
      this.initOrgUsersData(page);
    });
  };

  toggleImportOrgUsersDialog = () => {
    this.setState({ isImportOrgUsersDialogOpen: !this.state.isImportOrgUsersDialogOpen });
  };

  toggleAddOrgUser = () => {
    this.setState({ isShowAddOrgUserDialog: !this.state.isShowAddOrgUserDialog });
  };

  toggleInviteUserDialog = () => {
    this.setState({ isInviteUserDialogOpen: !this.state.isInviteUserDialogOpen });
  };

  toggleInviteUserViaWeiXinDialog = () => {
    this.setState({ isInviteUserViaWeiXinDialogOpen: !this.state.isInviteUserViaWeiXinDialogOpen });
  };

  initOrgUsersData = (page) => {
    const { sortBy, sortOrder } = this.state;
    orgAdminAPI.orgAdminListOrgUsers(orgID, '', page, sortBy, sortOrder).then(res => {
      let userList = res.data.user_list.map(item => {
        return new OrgUserInfo(item);
      });
      this.setState({
        orgUsers: userList,
        pageNext: res.data.page_next,
        page: res.data.page,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  importOrgUsers = (file) => {
    toaster.notify(gettext('It may take some time, please wait.'));
    orgAdminAPI.orgAdminImportUsersViaFile(orgID, file).then((res) => {
      if (res.data.success.length) {
        const users = res.data.success.map(item => {
          if (item.institution == undefined) {
            item.institution = '';
          }
          return new OrgUserInfo(item);
        });
        this.setState({
          orgUsers: users.concat(this.state.orgUsers)
        });
      }
      res.data.failed.forEach(item => {
        const msg = `${item.email}: ${item.error_msg}`;
        toaster.danger(msg);
      });
    }).catch((error) => {
      let errMsg = Utils.getErrorMsg(error);
      toaster.danger(errMsg);
    });
  };

  addOrgUser = (email, name, password) => {
    orgAdminAPI.orgAdminAddOrgUser(orgID, email, name, password).then(res => {
      let userInfo = new OrgUserInfo(res.data);
      this.state.orgUsers.unshift(userInfo);
      this.setState({
        orgUsers: this.state.orgUsers
      });
      this.toggleAddOrgUser();
      let msg = gettext('successfully added user %s.');
      msg = msg.replace('%s', email);
      toaster.success(msg);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      this.toggleAddOrgUser();
    });
  };

  toggleOrgUsersDelete = (email, username) => {
    orgAdminAPI.orgAdminDeleteOrgUser(orgID, email).then(res => {
      let users = this.state.orgUsers.filter(item => item.email != email);
      this.setState({ orgUsers: users });
      let msg = gettext('Deleted user %s');
      msg = msg.replace('%s', username);
      toaster.success(msg);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  inviteOrgUser = (emails) => {
    orgAdminAPI.orgAdminInviteOrgUsers(orgID, emails.split(',')).then(res => {
      this.toggleInviteUserDialog();
      let users = res.data.success.map(user => {
        return new OrgUserInfo(user);
      });
      this.setState({
        orgUsers: users.concat(this.state.orgUsers)
      });

      res.data.success.forEach(item => {
        let msg = gettext('successfully sent email to %s.');
        msg = msg.replace('%s', item.email);
        toaster.success(msg);
      });

      res.data.failed.forEach(item => {
        const msg = `${item.email}: ${item.error_msg}`;
        toaster.danger(msg);
      });
    }).catch(error => {
      this.toggleInviteUserDialog();
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  changeStatus = (email, isActive) => {
    orgAdminAPI.orgAdminChangeOrgUserStatus(orgID, email, isActive).then(res => {
      let users = this.state.orgUsers.map(item => {
        if (item.email == email) {
          item['is_active'] = res.data['is_active'];
        }
        return item;
      });
      this.setState({ orgUsers: users });
      toaster.success(gettext('Edit succeeded.'));
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  searchItems = (keyword) => {
    navigate(`${siteRoot}org/useradmin/search-users/?query=${encodeURIComponent(keyword)}`);
  };

  getSearch = () => {
    return <Search
      placeholder={gettext('Search users')}
      submit={this.searchItems}
    />;
  };

  render() {
    const topBtn = 'btn btn-secondary operation-item';
    let topbarChildren;
    topbarChildren = (
      <Fragment>
        <button className="btn btn-secondary operation-item" onClick={this.toggleImportOrgUsersDialog}>{gettext('Import users')}</button>
        <button className={topBtn} title={gettext('Add user')} onClick={this.toggleAddOrgUser}>
          <i className="sf3-font sf3-font-enlarge text-secondary mr-1"></i>{gettext('Add user')}
        </button>
        {orgEnableAdminInviteUser &&
        <button className={topBtn} title={gettext('Invite users')} onClick={this.toggleInviteUserDialog}>
          <i className="sf3-font sf3-font-enlarge text-secondary mr-1"></i>{gettext('Invite users')}
        </button>
        }
        {invitationLink &&
        <button className={topBtn} title={'通过微信邀请用户'} onClick={this.toggleInviteUserViaWeiXinDialog}>
          <i className="sf3-font sf3-font-enlarge text-secondary mr-1"></i>{'通过微信邀请用户'}
        </button>
        }
        {this.state.isImportOrgUsersDialogOpen &&
        <ModalPortal>
          <ImportOrgUsersDialog importUsersInBatch={this.importOrgUsers} toggle={this.toggleImportOrgUsersDialog}/>
        </ModalPortal>
        }
        {this.state.isShowAddOrgUserDialog &&
        <ModalPortal>
          <AddOrgUserDialog handleSubmit={this.addOrgUser} toggle={this.toggleAddOrgUser}/>
        </ModalPortal>
        }
        {this.state.isInviteUserDialogOpen &&
        <ModalPortal>
          <InviteUserDialog handleSubmit={this.inviteOrgUser} toggle={this.toggleInviteUserDialog}/>
        </ModalPortal>
        }
        {this.state.isInviteUserViaWeiXinDialogOpen &&
        <ModalPortal>
          <InviteUserViaWeiXinDialog invitationLink={invitationLink} toggle={this.toggleInviteUserViaWeiXinDialog}/>
        </ModalPortal>
        }
      </Fragment>
    );

    return (
      <Fragment>
        <MainPanelTopbar children={topbarChildren} search={this.getSearch()}/>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <Nav
              currentItem="all"
              sortBy={this.state.sortBy}
              sortOrder={this.state.sortOrder}
              sortItems={this.sortByQuotaUsage}
            />
            <OrgUsersList
              initOrgUsersData={this.initOrgUsersData}
              toggleDelete={this.toggleOrgUsersDelete}
              changeStatus={this.changeStatus}
              orgUsers={this.state.orgUsers}
              page={this.state.page}
              pageNext={this.state.pageNext}
            />
          </div>
        </div>
      </Fragment>
    );
  }
}

export default OrgUsers;
