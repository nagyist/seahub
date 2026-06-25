const INTERNAL_REFERENCE_RE = /<reference_(\d+)>/g;
const GROUPED_REFERENCE_RE = /\((?:\s*(?:Reference|Source|Document|Documents|Docs|Doc)\s*\d+\s*,?)+\s*\)/gi;
const REFERENCE_GROUP_FORMAT_RE = /([[\(])(Reference|Source|Document|Documents|Docs|Doc)\s*(\d+(?:\s*,\s*(?:\d+|(?:Reference|Source|Document|Documents|Docs|Doc)\s*\d+))*)\s*([\]\)])/gi;
const REFERENCE_MARK_RE = /\[(Reference)\s+(\d+)\]/g;
const REFERENCE_MARK_WORD_RE = /(Reference|Source|Document|Documents|Docs|Doc)\s*/gi;
const REFERENCE_PARENTHESES_RE = /\((\s*\[Reference \d+\](?:\s*,\s*\[Reference \d+\])*)\s*\)/gi;
const REFERENCE_COMMA_RE = /(\[Reference\s+\d+\](?:\s*,\s*\[Reference\s+\d+\])+)/g;
const MARKDOWN_FILE_RE = /<seafile-ai-markdown(?:\s+file_name=(["'])([^"']*?)\1)?\s*>([\s\S]*?)<\/seafile-ai-markdown>/g;

export const getSourceTitle = (source, index) => {
  return source?.title || source?.name || source?.path || `Reference ${index}`;
};

export const normalizeSources = (originSources, repoID) => {
  const sources = Array.isArray(originSources) ? originSources.slice(0) : [];
  return sources.map((source, index) => {
    const title = getSourceTitle(source, index + 1).replaceAll('"', '\'');
    const repoId = source?.repo_id || repoID;
    const path = source?.path || '';
    return {
      ...source,
      repo_id: repoId,
      path,
      title,
      name: title,
      content: source?.ai_summary || source?.content || '',
      document_key: source?.document_key || `${repoId}:${path || title}`,
    };
  });
};

export const transformMarkdownFilesToLinks = (value = '', mdFiles = [], messageId = '') => {
  if (!value) {
    return value;
  }

  return value.replace(MARKDOWN_FILE_RE, (match, quotationType, fileName, content) => {
    const safeFileName = fileName || 'answer.md';
    const urlObject = new URL(`file:///seafile-ai/${safeFileName}?t=${messageId}`);
    const url = urlObject.href;
    mdFiles.push({
      name: safeFileName,
      url,
      content: (content || '').trimStart(),
      kind: 'markdown_artifact',
      document_key: url,
    });
    return `[${safeFileName}](${url})`;
  });
};

const normalizeReferenceGroups = (value = '') => {
  return value.replace(GROUPED_REFERENCE_RE, (match) => {
    const items = match.match(/\d+/g) || [];
    if (items.length === 0) {
      return '';
    }
    return items.map((item) => ` [Reference ${item}]`).join('');
  });
};

export const buildAIReply = (value, sources, chatId, mdFiles = []) => {
  if (!value) {
    return '';
  }

  const nextValue = transformMarkdownFilesToLinks(value, mdFiles, chatId);
  if (chatId === 'typing') {
    return nextValue.replace(INTERNAL_REFERENCE_RE, '');
  }

  if (!Array.isArray(sources) || sources.length === 0) {
    return nextValue;
  }

  const normalizedValue = normalizeReferenceGroups(nextValue)
    .replace(REFERENCE_GROUP_FORMAT_RE, (match, openBracket, referenceType, ordersPart) => {
      const orders = ordersPart.split(',').map((orderPart) => {
        return orderPart.replace(REFERENCE_MARK_WORD_RE, '').trim();
      }).filter(Boolean);
      return orders.map((order) => ` [Reference ${order}]`).join('');
    })
    .replace(REFERENCE_PARENTHESES_RE, '$1')
    .replace(REFERENCE_COMMA_RE, (match) => match.replace(/\],\s*\[/g, ']['))
    .replace(REFERENCE_MARK_RE, (match, text, orderString) => {
      const order = Number(orderString);
      const source = sources[order - 1];
      if (!source) {
        return '';
      }
      return ` [${source.title}][${order}]`;
    })
    .trim();

  const sourcesString = sources.map((source, index) => {
    return `[${index + 1}]: #reference-${index + 1} "${source.title}"`;
  }).join('\n');

  return `${normalizedValue}\n\n${sourcesString}`;
};
