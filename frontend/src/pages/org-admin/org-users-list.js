import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import UserItem from './org-user-item';

const propTypes = {
  initOrgUsersData: PropTypes.func.isRequired,
  toggleDelete: PropTypes.func.isRequired,
  changeStatus: PropTypes.func.isRequired,
  orgUsers: PropTypes.array.isRequired,
  page: PropTypes.number.isRequired,
  pageNext: PropTypes.bool.isRequired
};

class OrgUsersList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
  }

  onFreezedItem = () => {
    this.setState({ isItemFreezed: true });
  };

  onUnfreezedItem = () => {
    this.setState({ isItemFreezed: false });
  };

  toggleItemFreezed = (isFreezed) => {
    this.setState({ isItemFreezed: isFreezed });
  };

  onChangePageNum = (e, num) => {
    e.preventDefault();
    let page = this.props.page;

    if (num == 1) {
      page = page + 1;
    } else {
      page = page - 1;
    }

    this.props.initOrgUsersData(page);
  };

  render() {
    const { orgUsers, page, pageNext } = this.props;
    return (
      <div className="cur-view-content">
        <table>
          <thead>
            <tr>
              <th width="30%">{gettext('Name')}</th>
              <th width="15%">{gettext('Status')}</th>
              <th width="20%">{gettext('Space Used')} / {gettext('Quota')}</th>
              <th width="25%">{gettext('Created At')} / {gettext('Last Login')}</th>
              <th width="10%">{/* Operations*/}</th>
            </tr>
          </thead>
          <tbody>
            {orgUsers.map((item, index) => {
              return (
                <UserItem
                  key={index}
                  user={item}
                  currentTab="users"
                  isItemFreezed={this.state.isItemFreezed}
                  toggleDelete={this.props.toggleDelete}
                  changeStatus={this.props.changeStatus}
                  onFreezedItem={this.onFreezedItem}
                  onUnfreezedItem={this.onUnfreezedItem}
                  toggleItemFreezed={this.toggleItemFreezed}
                />
              );})}
          </tbody>
        </table>
        <div className="paginator">
          {page != 1 && <a href="#" onClick={(e) => this.onChangePageNum(e, -1)}>{gettext('Previous')}</a>}
          {(page != 1 && pageNext) && <span> | </span>}
          {pageNext && <a href="#" onClick={(e) => this.onChangePageNum(e, 1)}>{gettext('Next')}</a>}
        </div>
      </div>
    );
  }
}

OrgUsersList.propTypes = propTypes;

export default OrgUsersList;
