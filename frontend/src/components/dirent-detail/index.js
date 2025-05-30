import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import LibDetail from './lib-details';
import DirentDetail from './dirent-details';
import ViewDetails from '../../metadata/components/view-details';
import ObjectUtils from '../../utils/object';
import { MetadataContext } from '../../metadata';
import { PRIVATE_FILE_TYPE } from '../../constants';
import { METADATA_MODE, TAGS_MODE } from '../dir-view-mode/constants';
import { FACE_RECOGNITION_VIEW_ID } from '../../metadata/constants';
import { useTags } from '../../tag/hooks';
import { useMetadataStatus } from '../../hooks';

const Detail = React.memo(({ repoID, path, currentMode, dirent, currentRepoInfo, repoTags, fileTags, onClose, onFileTagChanged }) => {
  const { enableMetadata, enableFaceRecognition, detailsSettings, modifyDetailsSettings } = useMetadataStatus();
  const { tagsData, addTag, modifyLocalFileTags } = useTags();

  const isView = useMemo(() => currentMode === METADATA_MODE || path.startsWith('/' + PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES), [currentMode, path]);
  const isTag = useMemo(() => currentMode === TAGS_MODE || path.startsWith('/' + PRIVATE_FILE_TYPE.TAGS_PROPERTIES), [currentMode, path]);

  useEffect(() => {
    if (isView) return;
    if (isTag) return;

    // init context
    const context = new MetadataContext();
    window.sfMetadataContext = context;
    window.sfMetadataContext.init({ repoID, repoInfo: currentRepoInfo });
    return () => {
      if (window.sfMetadataContext) {
        window.sfMetadataContext.destroy();
        delete window['sfMetadataContext'];
      }
    };
  }, [repoID, currentRepoInfo, isView, isTag]);

  if (isTag) return null;

  if (isView && !dirent) {
    const pathParts = path.split('/');
    const [, , viewId, children] = pathParts;
    if (!viewId) return null;
    if (viewId === FACE_RECOGNITION_VIEW_ID && !children) return null;
    return (<ViewDetails viewId={viewId} onClose={onClose} />);
  }

  if (path === '/' && !dirent) {
    return (<LibDetail currentRepoInfo={currentRepoInfo} onClose={onClose} />);
  }

  if (!dirent) return null;

  return (
    <DirentDetail
      repoID={repoID}
      path={isView ? dirent.path : path}
      dirent={dirent}
      currentRepoInfo={currentRepoInfo}
      repoTags={repoTags}
      fileTags={fileTags}
      enableMetadata={enableMetadata}
      enableFaceRecognition={enableFaceRecognition}
      detailsSettings={detailsSettings}
      modifyDetailsSettings={modifyDetailsSettings}
      tagsData={tagsData}
      addTag={addTag}
      modifyLocalFileTags={modifyLocalFileTags}
      onFileTagChanged={onFileTagChanged}
      onClose={onClose}
    />
  );
}, (props, nextProps) => {
  const isChanged =
    props.repoID !== nextProps.repoID ||
    props.path !== nextProps.path ||
    !ObjectUtils.isSameObject(props.dirent, nextProps.dirent) ||
    !ObjectUtils.isSameObject(props.currentRepoInfo, nextProps.currentRepoInfo) ||
    JSON.stringify(props.repoTags || []) !== JSON.stringify(nextProps.repoTags || []) ||
    JSON.stringify(props.fileTags || []) !== JSON.stringify(nextProps.fileTags || []);
  return !isChanged;
});

Detail.propTypes = {
  repoID: PropTypes.string,
  path: PropTypes.string,
  currentMode: PropTypes.string,
  dirent: PropTypes.object,
  currentRepoInfo: PropTypes.object,
  repoTags: PropTypes.array,
  fileTags: PropTypes.array,
  onClose: PropTypes.func,
  onFileTagChanged: PropTypes.func,
};

export default Detail;
