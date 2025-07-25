import React, { Fragment } from 'react';
import { Button } from 'reactstrap';
import { Utils } from '../../../utils/utils';
import { gettext, orgID } from '../../../utils/constants';
import { orgAdminAPI } from '../../../utils/org-admin-api';
import toaster from '../../../components/toast';
import SetGroupQuotaDialog from '../../../components/dialog/org-set-group-quota-dialog';
import AddDepartmentDialog from '../../../components/dialog/sysadmin-dialog/add-department-v2-dialog';
import AddDepartMemberDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-depart-member-v2-dialog';
import MoveDepartmentDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-move-group-dialog';
import RenameDepartmentDialog from '../../../components/dialog/sysadmin-dialog/rename-department-v2-dialog';
import DeleteDepartmentConfirmDialog from '../../../components/dialog/sysadmin-dialog/delete-department-v2-confirm-dialog';
import AddRepoDialog from '../../../components/dialog/org-add-repo-dialog';
import Loading from '../../../components/loading';
import DepartmentNode from './department-node';
import DepartmentsTreePanel from './departments-tree-panel';
import Department from './department';
import MainPanelTopbar from '../main-panel-topbar';

import '../../../css/system-departments.css';

class Departments extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      rootNodes: [],
      checkedDepartmentId: -1,
      operateNode: null,
      isAddDepartmentDialogShow: false,
      isAddMembersDialogShow: false,
      isMoveDeparmentDialogShow: false,
      isRenameDepartmentDialogShow: false,
      isDeleteDepartmentDialogShow: false,
      isShowAddRepoDialog: false,
      isSetQuotaDialogShow: false,
      membersList: [],
      isTopDepartmentLoading: false,
      isMembersListLoading: false,
      sortBy: '', // 'name' or 'role'
      sortOrder: '', // 'asc' or 'desc',
    };
  }

  componentDidMount() {
    this.setState({ isTopDepartmentLoading: true }, () => {
      orgAdminAPI.orgAdminListDepartGroups(orgID).then(res => {
        const department_list = res.data.data;
        if (department_list && department_list.length > 0) {
          const rootNodes = department_list.map(item => {
            const node = new DepartmentNode({
              id: item.id,
              name: item.name,
              orgId: item.org_id,
              quota: item.quota,
            });
            return node;
          });
          this.setState({
            rootNodes,
            checkedDepartmentId: rootNodes[0].id,
          });
          this.loadDepartmentMembers(rootNodes[0].id);
        }
        this.setState({ isTopDepartmentLoading: false });
      });
    });
  }

  onChangeDepartment = (nodeId) => {
    this.setState({ checkedDepartmentId: nodeId }, this.loadDepartmentMembers(nodeId));
  };

  loadDepartmentMembers = (nodeId) => {
    if (nodeId === -1) {
      this.setState({
        isMembersListLoading: false,
        membersList: [],
      });
      return;
    }
    this.setState({ isMembersListLoading: true });
    orgAdminAPI.orgAdminListGroupInfo(orgID, nodeId, true).then(res => {
      this.setState({
        membersList: res.data.members,
        isMembersListLoading: false
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  listSubDepartments = (nodeId, cb) => {
    const { rootNodes } = this.state;
    let node = null;
    rootNodes.forEach(rootNode => {
      if (!node) {
        node = rootNode.findNodeById(nodeId);
      }
    });
    if (!node) return;
    orgAdminAPI.orgAdminListGroupInfo(orgID, nodeId, true).then(res => {
      const childrenNodes = res.data.groups.map(department => new DepartmentNode({
        id: department.id,
        name: department.name,
        parentGroupId: department.parent_group_id,
        orgId: department.org_id,
        parentNode: node,
        quota: department.quota,
      }));
      node.setChildren(childrenNodes);
      cb && cb(childrenNodes);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  getRepos = (nodeId, cb) => {
    orgAdminAPI.orgAdminListGroupRepos(orgID, nodeId).then(res => {
      cb && cb(res.data.libraries);
    }).catch(error => {
      if (error.response && error.response.status === 404) {
        cb && cb(null);
        return;
      }
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  toggleAddLibrary = (node) => {
    this.setState({
      operateNode: node,
      isShowAddRepoDialog: !this.state.isShowAddRepoDialog
    });
  };

  toggleAddDepartment = (node) => {
    this.setState({ operateNode: node, isAddDepartmentDialogShow: !this.state.isAddDepartmentDialogShow });
  };

  toggleAddMembers = (node) => {
    this.setState({ operateNode: node, isAddMembersDialogShow: !this.state.isAddMembersDialogShow });
  };

  toggleMoveDepartment = (node) => {
    this.setState({ operateNode: node, isMoveDeparmentDialogShow: !this.state.isMoveDeparmentDialogShow });
  };

  toggleRename = (node) => {
    this.setState({ operateNode: node, isRenameDepartmentDialogShow: !this.state.isRenameDepartmentDialogShow });
  };

  toggleDelete = (node) => {
    this.setState({ operateNode: node, isDeleteDepartmentDialogShow: !this.state.isDeleteDepartmentDialogShow });
  };

  addDepartment = (parentNode, department) => {
    parentNode.addChildren([new DepartmentNode({
      id: department.id,
      name: department.name,
      parentNode: parentNode,
      orgId: department.org_id,
    })]);
  };

  setRootNode = (department) => {
    const newRootNode = new DepartmentNode({
      id: department.id,
      name: department.name,
      orgId: department.org_id,
    });
    const rootNodes = this.state.rootNodes.slice(0);
    rootNodes.push(newRootNode);
    this.setState({
      rootNodes: rootNodes,
      checkedDepartmentId: newRootNode.id,
    });
    this.loadDepartmentMembers(newRootNode.id);
  };

  renameDepartment = (node, department) => {
    node.id = department.id;
    node.name = department.name;
  };

  onDepartmentChanged = (targetDepartment) => {
    const { operateNode, rootNodes } = this.state;

    // Remove from original parent but keep the node reference
    let nodeToMove = operateNode;
    if (operateNode.parentNode) {
      operateNode.parentNode.deleteChildById(operateNode.id);
    } else {
      const index = rootNodes.indexOf(operateNode);
      if (index !== -1) {
        rootNodes.splice(index, 1);
      }
    }

    if (targetDepartment) {
      // Find existing target node in tree
      let existingTargetNode = null;
      const findTargetNode = (nodes) => {
        for (let n of nodes) {
          if (n.id === targetDepartment.id) {
            existingTargetNode = n;
            return;
          }
          if (n.children.length > 0) {
            findTargetNode(n.children);
          }
        }
      };
      findTargetNode(rootNodes);

      if (existingTargetNode) {
        // Update node's parent and add to target's children
        nodeToMove.parentNode = existingTargetNode;
        const isAlreadyChild = existingTargetNode.children.some(child => child.id === nodeToMove.id);
        if (!isAlreadyChild) {
          existingTargetNode.addChildren([nodeToMove]);
        }
      }
    } else {
      // If targetDepartment is null, it becomes a root node
      nodeToMove.parentNode = null;
      const isAlreadyRoot = rootNodes.some(node => node.id === nodeToMove.id);
      if (!isAlreadyRoot) {
        this.setState({
          rootNodes: [...rootNodes, nodeToMove]
        });
      }
    }

    // Update checked department if needed
    const { checkedDepartmentId } = this.state;
    if (checkedDepartmentId === nodeToMove.id) {
      this.onChangeDepartment(nodeToMove.id);
    }
  };

  onDelete = () => {
    const { operateNode, checkedDepartmentId } = this.state;
    orgAdminAPI.orgAdminDeleteDepartGroup(orgID, operateNode.id).then((res) => {
      this.toggleDelete();
      if (operateNode.parentNode) {
        operateNode.parentNode.deleteChildById(operateNode.id);
        if (operateNode.id === checkedDepartmentId && operateNode.parentNode.id !== -1) {
          this.onChangeDepartment(operateNode.parentNode.id);
        }
      } else {
        let rootNodes = this.state.rootNodes.slice(0);
        let rootIndex = rootNodes.findIndex(node => node.id === operateNode.id);
        rootNodes.splice(rootIndex, 1);
        if (rootNodes.length === 0) {
          this.setState({
            rootNodes,
            checkedDepartmentId: -1
          });
        } else {
          this.setState({
            rootNodes,
            checkedDepartmentId: rootNodes[0].id,
          });
          this.loadDepartmentMembers(rootNodes[0].id);
        }
      }
    }).catch(error => {
      if (error.response && error.response.status === 400) {
        toaster.danger(error.response.data.error_msg);
        return;
      }
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onMemberChanged = () => {
    const { checkedDepartmentId, operateNode } = this.state;
    if (checkedDepartmentId && operateNode && checkedDepartmentId !== operateNode.id) return;
    this.loadDepartmentMembers(operateNode.id);
  };

  setMemberStaff = (email, isAdmin) => {
    const { checkedDepartmentId, membersList } = this.state;
    orgAdminAPI.orgAdminSetGroupMemberRole(orgID, checkedDepartmentId, email, isAdmin).then((res) => {
      const member = res.data;
      const newMembersList = membersList.map(memberItem => {
        if (memberItem.email === email) return member;
        return memberItem;
      });
      this.setState({ membersList: newMembersList });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  deleteMember = (email) => {
    const { checkedDepartmentId, membersList } = this.state;
    orgAdminAPI.orgAdminDeleteGroupMember(orgID, checkedDepartmentId, email).then((res) => {
      const newMembersList = membersList.filter(memberItem => memberItem.email !== email);
      this.setState({ membersList: newMembersList });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  sortMembers = (items, sortBy, sortOrder) => {
    let comparator;
    switch (`${sortBy}-${sortOrder}`) {
      case 'name-asc':
        comparator = function (a, b) {
          var result = Utils.compareTwoWord(a.name, b.name);
          return result;
        };
        break;
      case 'name-desc':
        comparator = function (a, b) {
          var result = Utils.compareTwoWord(a.name, b.name);
          return -result;
        };
        break;
      case 'role-asc':
        comparator = function (a, b) {
          return a.role == 'Admin' ? -1 : 1;
        };
        break;
      case 'role-desc':
        comparator = function (a, b) {
          return a.role == 'Admin' ? 1 : -1;
        };
        break;
      // no default
    }
    items.sort((a, b) => {
      return comparator(a, b);
    });
    return items;
  };

  sortItems = (sortBy, sortOrder) => {
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      membersList: this.sortMembers(this.state.membersList, sortBy, sortOrder),
    });
  };

  toggleSetQuotaDialog = (node) => {
    this.setState({ operateNode: node, isSetQuotaDialogShow: !this.state.isSetQuotaDialogShow });
  };

  onSetQuota = (newNode) => {
    const rootNodes = this.state.rootNodes.slice(0);
    this._setQuota(rootNodes[0], newNode);
    this.setState({
      rootNodes: rootNodes
    });
  };

  _setQuota = (node, newNode) => {
    if (node.id === newNode.id) {
      node.quota = newNode.quota;
    } else {
      node.children.forEach(child => {
        this._setQuota(child, newNode);
      });
    }
  };


  render() {
    const { rootNodes, operateNode, checkedDepartmentId, isAddDepartmentDialogShow, isAddMembersDialogShow,
      membersList, isMembersListLoading, isTopDepartmentLoading, isRenameDepartmentDialogShow,
      isDeleteDepartmentDialogShow, sortBy, sortOrder, isMoveDeparmentDialogShow } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar />
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Departments')}</h3>
            </div>
            <div className="cur-view-content d-flex flex-row p-0">
              {isTopDepartmentLoading && <Loading/>}
              {(!isTopDepartmentLoading && rootNodes.length > 0) &&
                <>
                  <DepartmentsTreePanel
                    rootNodes={rootNodes}
                    checkedDepartmentId={checkedDepartmentId}
                    onChangeDepartment={this.onChangeDepartment}
                    listSubDepartments={this.listSubDepartments}
                    toggleAddDepartment={this.toggleAddDepartment}
                    toggleSetQuotaDialog={this.toggleSetQuotaDialog}
                    toggleAddLibrary={this.toggleAddLibrary}
                    toggleAddMembers={this.toggleAddMembers}
                    toggleRename={this.toggleRename}
                    toggleDelete={this.toggleDelete}
                    toggleMoveDepartment={this.toggleMoveDepartment}
                  />
                  <Department
                    rootNodes={rootNodes}
                    checkedDepartmentId={checkedDepartmentId}
                    membersList={membersList}
                    isMembersListLoading={isMembersListLoading}
                    isAddNewRepo={this.state.isAddNewRepo}
                    setMemberStaff={this.setMemberStaff}
                    deleteMember={this.deleteMember}
                    sortItems={this.sortItems}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    getRepos={this.getRepos}
                    deleteGroup={this.deleteGroup}
                    createGroup={this.createGroup}
                    toggleAddDepartment={this.toggleAddDepartment}
                    toggleSetQuotaDialog={this.toggleSetQuotaDialog}
                    toggleAddLibrary={this.toggleAddLibrary}
                    toggleAddMembers={this.toggleAddMembers}
                    toggleMoveDepartment={this.toggleMoveDepartment}
                    toggleRename={this.toggleRename}
                    toggleDelete={this.toggleDelete}
                  />
                </>
              }
              {(!isTopDepartmentLoading && rootNodes.length === 0) &&
                <div className="top-department-button-container h-100 w-100">
                  <Button onClick={this.toggleAddDepartment.bind(this, null)}>
                    {gettext('Enable departments feature')}
                  </Button>
                </div>
              }
            </div>
          </div>
        </div>
        {isAddMembersDialogShow &&
          <AddDepartMemberDialog
            orgID={orgID}
            toggle={this.toggleAddMembers}
            nodeId={operateNode.id}
            onMemberChanged={this.onMemberChanged}
          />
        }
        {isMoveDeparmentDialogShow &&
          <MoveDepartmentDialog
            orgID={orgID}
            toggle={this.toggleMoveDepartment}
            nodeId={operateNode.id}
            onDepartmentChanged={this.onDepartmentChanged}
          />
        }
        {isRenameDepartmentDialogShow &&
          <RenameDepartmentDialog
            orgID={orgID}
            node={operateNode}
            toggle={this.toggleRename}
            renameDepartment={this.renameDepartment}
          />
        }
        {isDeleteDepartmentDialogShow &&
          <DeleteDepartmentConfirmDialog
            node={operateNode}
            toggle={this.toggleDelete}
            onDelete={this.onDelete}
          />
        }
        {isAddDepartmentDialogShow &&
          <AddDepartmentDialog
            parentNode={operateNode}
            toggle={this.toggleAddDepartment}
            addDepartment={this.addDepartment}
            setRootNode={this.setRootNode}
            orgID={orgID}
          />
        }
        {this.state.isShowAddRepoDialog && (
          <AddRepoDialog
            toggle={this.toggleAddLibrary}
            onAddNewRepo={() => {this.setState({ isAddNewRepo: !this.state.isAddNewRepo });}}
            groupID={String(operateNode.id)}
          />
        )}
        {this.state.isSetQuotaDialogShow &&
          <SetGroupQuotaDialog
            group={operateNode}
            onSetQuota={this.onSetQuota}
            toggle={this.toggleSetQuotaDialog}
          />
        }
      </Fragment>
    );
  }

}

export default Departments;
