import React, { Fragment } from 'react';
import dayjs from 'dayjs';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import MainPanelTopbar from '../main-panel-topbar';
import ModalPortal from '../../../components/modal-portal';
import AddDepartDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-department-dialog';
import { gettext, lang } from '../../../utils/constants';
import GroupItem from './group-item';
import EmptyTip from '../../../components/empty-tip';
import '../../../css/org-department-item.css';

dayjs.locale(lang);

class DepartmentList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      groups: null,
      groupID: '',
      isShowAddDepartDialog: false,
      isItemFreezed: false
    };
  }

  componentDidMount() {
    this.listDepartments();
  }

  onFreezedItem = () => {
    this.setState({ isItemFreezed: true });
  };

  onUnfreezedItem = () => {
    this.setState({ isItemFreezed: false });
  };

  listDepartments = () => {
    systemAdminAPI.sysAdminListAllDepartments().then(res => {
      this.setState({ groups: res.data.data });
    });
  };

  toggleAddDepartDialog = () => {
    this.setState({ isShowAddDepartDialog: !this.state.isShowAddDepartDialog });
  };

  onDepartmentNameChanged = (dept) => {
    this.setState({
      groups: this.state.groups.map(item => {
        if (item.id == dept.id) {
          item.name = dept.name;
        }
        return item;
      })
    });
  };

  onAddNewDepartment = (newDepartment) => {
    const { groups } = this.state;
    groups.unshift(newDepartment);
    this.setState({
      groups: groups
    });
  };

  onDeleteDepartment = (id) => {
    const { groups } = this.state;
    this.setState({
      groups: groups.filter((item) => item.id != id)
    });
  };

  onSetDepartmentQuota = (target) => {
    const { groups } = this.state;
    this.setState({
      groups: groups.map((item) => {
        if (item.id == target.id) {
          item.quota = target.quota;
        }
        return item;
      })
    });
  };

  render() {
    const groups = this.state.groups;
    return (
      <Fragment>
        <MainPanelTopbar {...this.props}>
          <button className='btn btn-secondary operation-item' title={gettext('New Department')} onClick={this.toggleAddDepartDialog}>{gettext('New Department')}
          </button>
          {this.state.isShowAddDepartDialog && (
            <ModalPortal>
              <AddDepartDialog
                onAddNewDepartment={this.onAddNewDepartment}
                groupID={this.state.groupID}
                toggle={this.toggleAddDepartDialog}
              />
            </ModalPortal>
          )}
        </MainPanelTopbar>
        <div className="main-panel-center flex-row h-100">
          <div className="cur-view-container o-auto">
            <div className="cur-view-path">
              <div className="fleft">
                <h3 className="sf-heading">{gettext('Departments')}</h3>
              </div>
            </div>
            <div className="cur-view-content pb-8">
              {groups && groups.length > 0 ?
                <table className='mb-8'>
                  <thead>
                    <tr>
                      <th width="40%">{gettext('Name')}</th>
                      <th width="25%">{gettext('Created At')}</th>
                      <th width="20%">{gettext('Quota')}</th>
                      <th width="15%"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group, index) => {
                      return (
                        <Fragment key={group.id}>
                          <GroupItem
                            group={group}
                            isItemFreezed={this.state.isItemFreezed}
                            onFreezedItem={this.onFreezedItem}
                            onUnfreezedItem={this.onUnfreezedItem}
                            onDepartmentNameChanged={this.onDepartmentNameChanged}
                            onDeleteDepartment={this.onDeleteDepartment}
                            onSetDepartmentQuota={this.onSetDepartmentQuota}
                          />
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
                :
                <EmptyTip text={gettext('No departments')}/>
              }
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default DepartmentList;
