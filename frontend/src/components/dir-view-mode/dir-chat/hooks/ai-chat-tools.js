import React, { useContext, useState, useCallback } from 'react';

const AIChatToolsContext = React.createContext(null);

export const AIChatToolsProvider = ({ children }) => {
  const [attachments, updateAttachments] = useState([]);

  const removeAttachment = useCallback((attachment, index) => {
    updateAttachments((currentAttachments) => {
      const nextAttachments = currentAttachments.slice(0);
      const targetIndex = typeof index === 'number' ? index : nextAttachments.findIndex((item) => item.key === attachment?.key);
      if (targetIndex > -1) {
        nextAttachments.splice(targetIndex, 1);
      }
      return nextAttachments;
    });
  }, []);

  const clearAttachments = useCallback(() => {
    updateAttachments([]);
  }, []);

  return (
    <AIChatToolsContext.Provider value={{
      attachments,
      updateAttachments,
      removeAttachment,
      clearAttachments,
    }}
    >
      {children}
    </AIChatToolsContext.Provider>
  );
};

export const useAIChatTools = () => {
  const context = useContext(AIChatToolsContext);
  if (!context) {
    throw new Error('ChatToolsContext is null');
  }
  return context;
};
