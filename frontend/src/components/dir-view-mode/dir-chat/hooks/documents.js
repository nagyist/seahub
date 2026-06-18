import React, { useCallback, useContext, useEffect, useState } from 'react';
import deepCopy from 'deep-copy';
import { useAskPage } from './page-type';
import { useSessions } from './sessions';

const DocumentsContext = React.createContext(null);

const getDocumentKey = (document) => {
  if (!document) {
    return '';
  }
  return document.document_key || document.url || `${document.repo_id || ''}:${document.path || document.name || ''}`;
};

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
    if (!isShowDocuments && typeof window !== 'undefined') {
      const mathJaxScript = window.document?.getElementById('mathjax');
      if (mathJaxScript?.parentNode) {
        mathJaxScript.parentNode.removeChild(mathJaxScript);
      }
    }
    const nextDocument = {
      ...document,
      document_key: getDocumentKey(document),
    };
    setIsShowDocuments(true);
    setDocuments((currentDocuments) => {
      const existedDocument = currentDocuments.find((item) => getDocumentKey(item) === nextDocument.document_key);
      if (existedDocument) {
        return deepCopy(currentDocuments);
      }
      return deepCopy([nextDocument, ...currentDocuments]);
    });
    setCurrentDocument(deepCopy(nextDocument));
    closeShowSessions();
  }, [closeShowSessions, isShowDocuments]);

  const closeDocument = useCallback((document) => {
    if (!document) {
      return;
    }
    setDocuments((currentDocuments) => {
      const documentIndex = currentDocuments.findIndex((item) => getDocumentKey(item) === getDocumentKey(document));
      if (documentIndex < 0) {
        return currentDocuments;
      }
      const nextDocuments = currentDocuments.slice(0);
      nextDocuments.splice(documentIndex, 1);
      const nextIndex = Math.min(documentIndex, nextDocuments.length - 1);
      setCurrentDocument(deepCopy(nextDocuments[nextIndex]) || null);
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
