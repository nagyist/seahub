import { PRIVATE_COLUMN_KEY } from './private';

const PREDEFINED_COLUMN_KEYS = [
  PRIVATE_COLUMN_KEY.FILE_COLLABORATORS,
  PRIVATE_COLUMN_KEY.FILE_REVIEWER,
  PRIVATE_COLUMN_KEY.FILE_EXPIRE_TIME,
  PRIVATE_COLUMN_KEY.FILE_KEYWORDS,
  PRIVATE_COLUMN_KEY.FILE_DESCRIPTION,
  PRIVATE_COLUMN_KEY.FILE_EXPIRED,
  PRIVATE_COLUMN_KEY.FILE_STATUS,
];

const PREDEFINED_FILE_STATUS_OPTION_KEY = {
  IN_PROGRESS: '_in_progress',
  IN_REVIEW: '_in_review',
  DONE: '_done',
  OUTDATED: '_outdated'
};

const PREDEFINED_FILE_STATUS_OPTION_KEYS = [
  PREDEFINED_FILE_STATUS_OPTION_KEY.IN_PROGRESS,
  PREDEFINED_FILE_STATUS_OPTION_KEY.IN_REVIEW,
  PREDEFINED_FILE_STATUS_OPTION_KEY.DONE,
  PREDEFINED_FILE_STATUS_OPTION_KEY.OUTDATED,
];

const PREDEFINED_FILE_TYPE_OPTION_KEY = {
  PICTURE: '_picture',
  DOCUMENT: '_document',
  VIDEO: '_video',
  AUDIO: '_audio',
  CODE: '_code',
  COMPRESSED: '_compressed',
  DIAGRAM: '_diagram',
};

const PREDEFINED_FILE_TYPE_OPTION_KEYS = [
  PREDEFINED_FILE_TYPE_OPTION_KEY.PICTURE,
  PREDEFINED_FILE_TYPE_OPTION_KEY.DOCUMENT,
  PREDEFINED_FILE_TYPE_OPTION_KEY.VIDEO,
  PREDEFINED_FILE_TYPE_OPTION_KEY.AUDIO,
  PREDEFINED_FILE_TYPE_OPTION_KEY.CODE,
  PREDEFINED_FILE_TYPE_OPTION_KEY.COMPRESSED,
  PREDEFINED_FILE_TYPE_OPTION_KEY.DIAGRAM,
];

export {
  PREDEFINED_COLUMN_KEYS,
  PREDEFINED_FILE_STATUS_OPTION_KEY,
  PREDEFINED_FILE_STATUS_OPTION_KEYS,
  PREDEFINED_FILE_TYPE_OPTION_KEY,
  PREDEFINED_FILE_TYPE_OPTION_KEYS,
};
