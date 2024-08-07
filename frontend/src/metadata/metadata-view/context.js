import metadataAPI from '../api';
import { UserService, LocalStorage, PRIVATE_COLUMN_KEYS, EDITABLE_DATA_PRIVATE_COLUMN_KEYS,
  EDITABLE_PRIVATE_COLUMN_KEYS, PREDEFINED_COLUMN_KEYS } from './_basic';
import EventBus from '../../components/common/event-bus';
import { username } from '../../utils/constants';
import User from './model/user';

class Context {

  constructor() {
    this.settings = {};
    this.metadataAPI = null;
    this.localStorage = null;
    this.userService = null;
    this.eventBus = null;
    this.hasInit = false;
    this.permission = 'r';
    this.collaboratorsCache = {};
  }

  async init({ otherSettings }) {
    if (this.hasInit) return;

    // init settings
    this.settings = otherSettings || {};

    // init metadataAPI
    const { mediaUrl, repoInfo } = this.settings;
    this.metadataAPI = metadataAPI;

    // init localStorage
    const { repoID, viewID } = this.settings;
    this.localStorage = new LocalStorage(`sf-metadata-${repoID}-${viewID}`);

    // init userService
    this.userService = new UserService({ mediaUrl, api: this.metadataAPI.listUserInfo });

    const eventBus = new EventBus();
    this.eventBus = eventBus;

    this.permission = repoInfo.permission !== 'admin' && repoInfo.permission !== 'rw' ? 'r' : 'rw';

    this.hasInit = true;
  }

  destroy = () => {
    this.settings = {};
    this.metadataAPI = null;
    this.localStorage = null;
    this.userService = null;
    this.eventBus = null;
    this.hasInit = false;
    this.permission = 'r';
  };

  getSetting = (key) => {
    if (this.settings[key] === false) return this.settings[key];
    return this.settings[key] || '';
  };

  setSetting = (key, value) => {
    this.settings[key] = value;
  };

  getUsername = () => {
    return username;
  };

  // collaborators
  getCollaborators = () => {
    const repoID = this.settings['repoID'];
    return this.metadataAPI.getCollaborators(repoID);
  };

  // metadata
  getMetadata = (params) => {
    const repoID = this.settings['repoID'];
    return this.metadataAPI.getMetadata(repoID, params);
  };

  getViews = () => {
    const repoID = this.settings['repoID'];
    return this.metadataAPI.listViews(repoID);
  };

  getView = (viewId) => {
    const repoID = this.settings['repoID'];
    return this.metadataAPI.getView(repoID, viewId);
  };

  getPermission = () => {
    return this.permission;
  };

  canModifyCell = (column) => {
    if (this.permission === 'r') return false;
    const { editable } = column;
    if (!editable) return false;
    return true;
  };

  canModifyRow = (row) => {
    if (this.permission === 'r') return false;
    return true;
  };

  canModifyColumn = (column) => {
    if (this.permission === 'r') return false;
    if (PRIVATE_COLUMN_KEYS.includes(column.key) && !EDITABLE_PRIVATE_COLUMN_KEYS.includes(column.key)) return false;
    return true;
  };

  canRenameColumn = (column) => {
    if (this.permission === 'r') return false;
    if (PRIVATE_COLUMN_KEYS.includes(column.key)) return false;
    return true;
  };

  canModifyColumnData = (column) => {
    if (this.permission === 'r') return false;
    const { key } = column;
    if (PRIVATE_COLUMN_KEYS.includes(key)) return EDITABLE_DATA_PRIVATE_COLUMN_KEYS.includes(key);
    return true;
  };

  canDeleteColumn = (column) => {
    if (this.permission === 'r') return false;
    const { key } = column;
    if (PRIVATE_COLUMN_KEYS.includes(key)) return PREDEFINED_COLUMN_KEYS.includes(key);
    return true;
  };

  canModifyView = (view) => {
    if (this.permission === 'r') return false;
    return true;
  };

  getCollaboratorFromCache(email) {
    return this.collaboratorsCache[email];
  }

  getCollaboratorsFromCache() {
    const collaboratorsCache = this.collaboratorsCache;
    return Object.values(collaboratorsCache).filter(item => item.email !== 'anonymous');
  }

  updateCollaboratorsCache(email, collaborator) {
    if (collaborator instanceof User) {
      this.collaboratorsCache[email] = collaborator;
      return;
    }
    this.collaboratorsCache[email] = new User(collaborator);
  }

  restoreRows = () => {
    // todo
  };

  updateRows = () => {
    // todo
  };

  lockRowViaButton = () => {
    // todo
  };

  updateRowViaButton = () => {
    // todo
  };

  // column
  insertColumn = (repoId, name, type, { key, data }) => {
    return this.metadataAPI.insertColumn(repoId, name, type, { key, data });
  };

  deleteColumn = (repoId, columnKey) => {
    return this.metadataAPI.deleteColumn(repoId, columnKey);
  };

  renameColumn = (repoId, columnKey, name) => {
    return this.metadataAPI.renameColumn(repoId, columnKey, name);
  };

  modifyColumnData = (repoId, columnKey, data) => {
    return this.metadataAPI.modifyColumnData(repoId, columnKey, data);
  };

  // record
  modifyRecord = (repoId, recordId, columnName, value) => {
    return this.metadataAPI.modifyRecord(repoId, recordId, columnName, value);
  };

  modifyRecords = (repoId, recordsData, isCopyPaste) => {
    return this.metadataAPI.modifyRecords(repoId, recordsData, isCopyPaste);
  };

  // view
  modifyView = (repoId, viewId, viewData) => {
    return this.metadataAPI.modifyView(repoId, viewId, viewData);
  };

  getRowsByIds = () => {
    // todo
  };

}

export default Context;
