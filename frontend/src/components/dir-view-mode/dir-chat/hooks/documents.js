import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useAskPage } from './page-type';
import { useSessions } from './sessions';

const DocumentsContext = React.createContext(null);

export const DocumentsProvider = ({ children }) => {
  const [isShowDocuments, setIsShowDocuments] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);

  const { pageSlugId } = useAskPage();
  const { closeShowSessions } = useSessions();

  const openDocument = useCallback((document) => {
    if (!document) {
      return;
    }
    setIsShowDocuments(true);
    setDocuments((currentDocuments) => {
      const existedDocument = currentDocuments.find((item) => item.url === document.url);
      if (existedDocument) {
        return currentDocuments;
      }
      return [document, ...currentDocuments];
    });
    setCurrentDocument(document);
    closeShowSessions();
  }, [closeShowSessions]);

  const closeDocument = useCallback((document) => {
    if (!document) {
      return;
    }
    setDocuments((currentDocuments) => {
      const documentIndex = currentDocuments.findIndex((item) => item.url === document.url);
      if (documentIndex < 0) {
        return currentDocuments;
      }
      const nextDocuments = currentDocuments.slice(0);
      nextDocuments.splice(documentIndex, 1);
      const nextIndex = Math.min(documentIndex, nextDocuments.length - 1);
      setCurrentDocument(nextDocuments[nextIndex] || null);
      if (nextDocuments.length === 0) {
        setIsShowDocuments(false);
      }
      return nextDocuments;
    });
  }, []);

  const closeDocuments = useCallback(() => {
    setIsShowDocuments(false);
  }, []);

  const clear = useCallback(() => {
    setIsShowDocuments(false);
    setDocuments([]);
    setCurrentDocument(null);
  }, []);

  useEffect(() => {
    setDocuments([]);
    setCurrentDocument(null);
    setIsShowDocuments(false);
  }, [pageSlugId]);

  return (
    <DocumentsContext.Provider value={{
      isShowDocuments,
      documents,
      currentDocument,
      openDocument,
      closeDocument,
      closeDocuments,
      clear,
      setCurrentDocument,
    }}
    >
      {children}
    </DocumentsContext.Provider>
  );
};

export const useDocuments = () => {
  const context = useContext(DocumentsContext);
  if (!context) {
    throw new Error('DocumentsContext is null');
  }
  return context;
};
