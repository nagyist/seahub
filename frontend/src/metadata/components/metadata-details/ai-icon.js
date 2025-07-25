import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import Icon from '../../../components/icon';
import { useMetadataDetails } from '../../hooks';
import { useMetadataStatus, useMetadataAIOperations } from '../../../hooks';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import { getFileNameFromRecord, getFileObjIdFromRecord, getParentDirFromRecord, getRecordIdFromRecord } from '../../utils/cell';
import { getColumnByKey } from '../../utils/column';
import { PRIVATE_COLUMN_KEY } from './constants';
import { checkIsDir } from '../../utils/row';

const OPERATION = {
  GENERATE_DESCRIPTION: 'generate-description',
  OCR: 'ocr',
  FILE_TAGS: 'file-tags',
  FILE_DETAIL: 'file-detail',
};

const AIIcon = () => {
  const menuToggleRef = useRef(null);

  const [isMenuShow, setMenuShow] = useState(false);

  const { enableMetadata, enableTags } = useMetadataStatus();
  const { canModifyRecord, columns, record, onChange, onLocalRecordChange, updateFileTags, updateDescription } = useMetadataDetails();
  const { generateDescription, extractFileDetails, onOCR, generateFileTags } = useMetadataAIOperations();

  const options = useMemo(() => {
    if (!canModifyRecord || !record || checkIsDir(record)) return [];
    const descriptionColumn = getColumnByKey(columns, PRIVATE_COLUMN_KEY.FILE_DESCRIPTION);
    const fileName = getFileNameFromRecord(record);
    const isImage = Utils.imageCheck(fileName);
    const isVideo = Utils.videoCheck(fileName);
    const isPdf = Utils.pdfCheck(fileName);
    const isDescribableDoc = Utils.isDescriptionSupportedFile(fileName);
    let list = [];

    if (descriptionColumn && isDescribableDoc) {
      list.push({
        value: OPERATION.GENERATE_DESCRIPTION,
        label: gettext('Generate description'),
        record
      });
    }

    if (isImage || isPdf) {
      list.push({ value: OPERATION.OCR, label: gettext('Extract text'), record });
    }

    if (isImage || isVideo) {
      list.push({ value: OPERATION.FILE_DETAIL, label: gettext('Extract file detail'), record });
    }

    if (enableTags && isDescribableDoc && !isVideo) {
      list.push({ value: OPERATION.FILE_TAGS, label: gettext('Generate file tags'), record });
    }

    return list;
  }, [enableTags, canModifyRecord, columns, record]);

  const onToggle = useCallback((event) => {
    event && event.preventDefault();
    event && event.stopPropagation();
    setMenuShow(!isMenuShow);
  }, [isMenuShow]);

  const handleOperation = useCallback((op) => {
    const { value: opType, record } = op;
    const recordId = getRecordIdFromRecord(record);
    const parentDir = getParentDirFromRecord(record);
    const fileName = getFileNameFromRecord(record);
    const objId = getFileObjIdFromRecord(record);

    switch (opType) {
      case OPERATION.GENERATE_DESCRIPTION: {
        generateDescription({ parentDir, fileName, recordId }, {
          success_callback: ({ description }) => {
            if (!description) return;
            onChange && onChange(PRIVATE_COLUMN_KEY.FILE_DESCRIPTION, description);
          },
        });
        break;
      }
      case OPERATION.OCR: {
        onOCR(record, {
          success_callback: updateDescription
        }, menuToggleRef.current);
        break;
      }
      case OPERATION.FILE_TAGS: {
        generateFileTags(record, {
          success_callback: updateFileTags
        });
        break;
      }
      case OPERATION.FILE_DETAIL: {
        extractFileDetails(objId, {
          success_callback: ({ detail }) => {
            if (!detail) return;
            const captureColumn = getColumnByKey(columns, PRIVATE_COLUMN_KEY.CAPTURE_TIME);
            if (captureColumn) {
              const value = detail[PRIVATE_COLUMN_KEY.CAPTURE_TIME];
              value && onChange && onChange(PRIVATE_COLUMN_KEY.CAPTURE_TIME, value);
            }
            const fileDetails = detail[PRIVATE_COLUMN_KEY.FILE_DETAILS];
            const location = detail[PRIVATE_COLUMN_KEY.LOCATION];
            const address = detail[PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED];
            let update = {};
            if (fileDetails) {
              update[PRIVATE_COLUMN_KEY.FILE_DETAILS] = fileDetails;
            }
            if (location) {
              update[PRIVATE_COLUMN_KEY.LOCATION] = location;
            }
            if (address) {
              update[PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED] = address;
            }
            Object.keys(update).length > 0 && onLocalRecordChange(recordId, update);
          },
        });
        break;
      }
      default: {
        setMenuShow(false);
        break;
      }
    }
  }, [columns, generateDescription, onOCR, generateFileTags, extractFileDetails, onChange, onLocalRecordChange, updateFileTags, updateDescription]);

  if (!enableMetadata || !canModifyRecord || !record || options.length === 0) return null;

  return (
    <Dropdown className="sf-metadata-dropdown-menu" isOpen={isMenuShow} toggle={onToggle}>
      <DropdownToggle
        tag="span"
        role="button"
        data-toggle="dropdown"
        aria-expanded={isMenuShow}
        title='AI'
        aria-label='AI'
        tabIndex={0}
      >
        <div className="detail-control mr-2" ref={menuToggleRef}>
          <Icon symbol="ai" className="detail-control-icon" />
        </div>
      </DropdownToggle>
      {isMenuShow && (
        <div className="sf-metadata-ai-dropdown-menu large">
          <DropdownMenu>
            {options.map(op => (<DropdownItem key={op.value} onClick={() => handleOperation(op)}>{op.label}</DropdownItem>))}
          </DropdownMenu>
        </div>
      )}
    </Dropdown>
  );
};

export default AIIcon;
