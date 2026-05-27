import React, { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ELementTypes, MarkdownViewer } from '@seafile/seafile-editor';
import { gettext, mediaUrl } from '../../../../../utils/constants';
import CustomizePopover from '../../../../customize-popover';
import Icon from '../../../../icon';
import { useDocuments } from '../../hooks';
import { CHAT_MESSAGE_TYPE } from '../../constants';

import './index.css';

dayjs.extend(relativeTime);

const GROUPED_REFERENCE_RE = /\((?:\s*(?:Reference|Source|Document|Documents|Docs|Doc)\s*\d+\s*,?)+\s*\)/gi;
const REFERENCE_RE = /\[Reference\s+(\d+)\]/g;

const getSourceTitle = (source, index) => {
  return source?.title || source?.name || source?.path || `Reference ${index}`;
};

const getDocumentPayload = (source, repoID) => {
  const repoId = source?.repo_id || repoID;
  const path = source?.path || '';
  const title = source?.title || source?.name || path;
  return {
    ...source,
    repo_id: repoId,
    path,
    name: title,
    title,
    content: source?.content || '',
    document_key: source?.document_key || source?.url || `${repoId}:${path}`,
  };
};

const stripMarkTags = (content) => {
  return (content || '').replace(/<\/?mark>/g, '');
};

const formatModifiedTime = (modifiedTime) => {
  if (!modifiedTime) {
    return '';
  }
  const numericTime = Number(modifiedTime);
  if (Number.isFinite(numericTime)) {
    const normalizedTime = numericTime < 1000000000000 ? numericTime * 1000 : numericTime;
    return dayjs(normalizedTime).fromNow();
  }
  return dayjs(modifiedTime).fromNow();
};

const normalizeReferenceGroups = (value) => {
  return value.replace(GROUPED_REFERENCE_RE, (match) => {
    const items = match.match(/\d+/g) || [];
    if (items.length === 0) {
      return '';
    }
    return items.map((item) => ` [Reference ${item}]`).join('');
  });
};

const buildMarkdownWithReferences = (value, originSources) => {
  if (!value) {
    return { value: '', sources: [] };
  }

  const sources = Array.isArray(originSources) ? originSources.slice() : [];
  if (sources.length === 0) {
    return { value, sources: [] };
  }

  const orderedSources = [];
  const sourceOrderMap = new Map();
  const normalizedValue = normalizeReferenceGroups(value)
    .replace(/\((\s*\[Reference \d+\](?:\s*\[Reference \d+\])*)\)/g, '$1')
    .replace(REFERENCE_RE, (match, orderString) => {
      const originOrder = Number(orderString);
      const source = sources[originOrder - 1];
      if (!source) {
        return '';
      }
      let targetOrder = sourceOrderMap.get(originOrder);
      if (!targetOrder) {
        targetOrder = orderedSources.length + 1;
        sourceOrderMap.set(originOrder, targetOrder);
        orderedSources.push(source);
      }
      return ` [Reference ${targetOrder}][${targetOrder}]`;
    })
    .trim();

  if (orderedSources.length === 0) {
    return { value: normalizedValue, sources };
  }

  const referenceDefinitions = orderedSources.map((source, index) => {
    return `[${index + 1}]: ${source.url || `#reference-${index + 1}`} "${getSourceTitle(source, index + 1).replaceAll('"', '\'')}"`;
  }).join('\n');

  return {
    value: `${normalizedValue}\n\n${referenceDefinitions}`,
    sources: orderedSources,
  };
};

const LinkReference = ({ element, attributes, onClick }) => {
  return (
    <span
      onClick={onClick}
      className="sea-ai-chat-customize-link-reference"
      data-id={element.id}
      title={element.label}
      {...attributes}
    >
      {element.identifier}
    </span>
  );
};

LinkReference.propTypes = {
  element: PropTypes.object,
  attributes: PropTypes.object,
  onClick: PropTypes.func,
};

const SourceCard = ({ source, index, onOpen, attributes, disableAutoWidth = false, totalCount = 0, elementId }) => {
  const modifiedTimeText = useMemo(() => formatModifiedTime(source?.modified_time), [source?.modified_time]);
  const description = useMemo(() => stripMarkTags(source?.content), [source?.content]);
  const cardStyle = useMemo(() => {
    if (disableAutoWidth) {
      return undefined;
    }
    const offsetWidth = totalCount > 3 ? '48px' : '0px';
    return { width: `calc((100% - 16px - ${offsetWidth}) / 3)` };
  }, [disableAutoWidth, totalCount]);

  return (
    <div
      className={classNames('sea-ai-chat-customize-definition', { 'ml-0': (index - 1) % 3 === 0 })}
      style={cardStyle}
      onClick={() => onOpen(source)}
      data-id={elementId || index}
      {...attributes}
    >
      <div className="sea-ai-chat-customize-definition-simple-info">
        <div className="sea-ai-chat-customize-definition-title-content">
          <div className="sea-ai-chat-customize-definition-title">{getSourceTitle(source, index)}</div>
        </div>
      </div>
      <div className="sea-ai-chat-customize-definition-content">{description}</div>
      <div className="sea-ai-chat-customize-definition-content-divider"></div>
      <div className="d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center o-hidden">
          <div className="sea-ai-chat-customize-definition-avatar d-flex align-items-center justify-content-center">
            <Icon symbol="ai-file" />
          </div>
          {modifiedTimeText && (
            <div className="sea-ai-chat-customize-definition-mtime text-truncate">
              {`${gettext('Updated')} ${modifiedTimeText}`}
            </div>
          )}
        </div>
        <div className="sea-ai-chat-customize-definition-order">{index}</div>
      </div>
    </div>
  );
};

SourceCard.propTypes = {
  source: PropTypes.object,
  index: PropTypes.number,
  onOpen: PropTypes.func,
  attributes: PropTypes.object,
  disableAutoWidth: PropTypes.bool,
  totalCount: PropTypes.number,
  elementId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

const MoreDefinitions = ({ sources, onOpen }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(4);
  const [popoverWidth, setPopoverWidth] = useState(undefined);
  const moreRef = useRef(null);

  const extraCount = Math.max(0, sources.length - 3);

  const openPopover = useCallback(() => {
    const previousWidth = moreRef.current?.previousElementSibling?.getBoundingClientRect()?.width;
    if (previousWidth) {
      setPopoverWidth(`${previousWidth}px`);
    }
    setIsOpen(true);
  }, []);

  const closePopover = useCallback(() => {
    setIsOpen(false);
    setCurrentIndex(4);
  }, []);

  const moveIndex = useCallback((step) => {
    let nextIndex = currentIndex + step;
    if (nextIndex < 4) {
      nextIndex = sources.length;
    }
    if (nextIndex > sources.length) {
      nextIndex = 4;
    }
    setCurrentIndex(nextIndex);
  }, [currentIndex, sources.length]);

  const currentSource = sources[currentIndex - 1];

  return (
    <>
      <div
        className="sea-ai-chat-customize-definition sea-ai-chat-customize-more-definition"
        onClick={openPopover}
        ref={moreRef}
      >
        <span className="more-definition-content">+{extraCount}</span>
      </div>
      {isOpen && currentSource && (
        <CustomizePopover
          target={moreRef}
          placement="bottom-end"
          popoverClassName="sea-ai-chat-customize-definitions-popover"
          hidePopover={closePopover}
          hidePopoverWithEsc={closePopover}
        >
          <div className="sea-ai-chat-customize-definitions-container" style={{ width: popoverWidth }}>
            <div className="sea-ai-chat-customize-definitions-title">
              <button type="button" className="btn btn-icon p-0 sea-ai-chat-customize-definitions-index-btn" onClick={() => moveIndex(-1)}>
                <Icon symbol="arrow-left" />
              </button>
              <div className="sea-ai-chat-customize-definitions-index">
                <span>{currentIndex}</span>
                <span className="sources-count-text">/{sources.length}</span>
              </div>
              <button type="button" className="btn btn-icon p-0 sea-ai-chat-customize-definitions-index-btn" onClick={() => moveIndex(1)}>
                <Icon symbol="arrow-right" />
              </button>
            </div>
            <SourceCard
              source={currentSource}
              index={currentIndex}
              onOpen={(source) => {
                closePopover();
                onOpen(source);
              }}
              disableAutoWidth={true}
              totalCount={sources.length}
              elementId={currentIndex}
            />
          </div>
        </CustomizePopover>
      )}
    </>
  );
};

MoreDefinitions.propTypes = {
  sources: PropTypes.array,
  onOpen: PropTypes.func,
};

const Definition = ({ element, attributes, sources, onOpen }) => {
  const identifier = Number(element?.identifier);
  if (!identifier || !Array.isArray(sources) || sources.length === 0) {
    return null;
  }

  if (sources.length < 4 || identifier < 4) {
    const source = sources[identifier - 1];
    if (!source) {
      return null;
    }
    return (
      <SourceCard
        source={source}
        index={identifier}
        onOpen={onOpen}
        attributes={attributes}
        totalCount={sources.length}
        elementId={element.id}
      />
    );
  }

  if (identifier === 4) {
    return (
      <>
        <MoreDefinitions sources={sources} onOpen={onOpen} />
        <div data-id={element.id} {...attributes} className="sea-ai-chat-customize-definition-hidden"></div>
      </>
    );
  }

  return <div data-id={element.id} {...attributes} className="sea-ai-chat-customize-definition-hidden"></div>;
};

Definition.propTypes = {
  element: PropTypes.object,
  attributes: PropTypes.object,
  sources: PropTypes.array,
  onOpen: PropTypes.func,
};

const CustomizeMarkdownViewer = ({ message, repoID }) => {
  const { openDocument } = useDocuments();
  const { value, sources } = useMemo(() => {
    return buildMarkdownWithReferences(
      message?.[CHAT_MESSAGE_TYPE.AI_REPLY] || '',
      message?.[CHAT_MESSAGE_TYPE.SOURCES] || [],
    );
  }, [message]);

  const handleOpenDocument = useCallback((source) => {
    openDocument(getDocumentPayload(source, repoID));
  }, [openDocument, repoID]);

  const options = useMemo(() => {
    return {
      [ELementTypes.LINK_REFERENCE]: {
        render: (<LinkReference />),
      },
      [ELementTypes.DEFINITION]: {
        render: (<Definition sources={sources} onOpen={handleOpenDocument} />),
      },
    };
  }, [handleOpenDocument, sources]);

  if (!value) {
    return null;
  }

  return (
    <div className="sea-qa-message-ai-reply">
      <MarkdownViewer
        value={value}
        isFetching={false}
        isShowOutline={false}
        mathJaxSource={mediaUrl + 'js/mathjax/tex-svg.js'}
        options={options}
        onDefinitionClick={() => {}}
      />
    </div>
  );
};

CustomizeMarkdownViewer.propTypes = {
  message: PropTypes.object,
  repoID: PropTypes.string,
};

export default CustomizeMarkdownViewer;
