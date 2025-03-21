import React, { useMemo } from 'react';
import { FileTagsFormatter } from '@seafile/sf-metadata-ui-component';
import { useTags } from '../../../../hooks';

const ParentTagsFormatter = ({ record, column }) => {
  const { tagsData } = useTags();

  const parentTagLinks = useMemo(() => {
    return record[column.key];
  }, [record, column]);

  return (
    <div className="sf-table-parent-tags-formatter sf-table-cell-formatter sf-metadata-ui cell-formatter-container">
      <FileTagsFormatter tagsData={tagsData} value={parentTagLinks} />
    </div>
  );
};

export default ParentTagsFormatter;
