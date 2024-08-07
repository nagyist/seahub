/* eslint-disable react/prop-types */
import React, { useContext, useState, useCallback, useEffect } from 'react';
import { useMetadata } from './metadata';
import { mediaUrl } from '../../../utils/constants';
import { isValidEmail } from '../_basic';

const CollaboratorsContext = React.createContext(null);

export const CollaboratorsProvider = ({
  children,
}) => {
  const [collaboratorsCache, setCollaboratorsCache] = useState({});
  const [collaborators, setCollaborators] = useState([]);

  const { store } = useMetadata();

  useEffect(() => {
    setCollaborators(store?.collaborators || []);
  }, [store?.collaborators]);

  useEffect(() => {
    if (!window.sfMetadata) return;
    window.sfMetadata.collaborators = collaborators;
    window.sfMetadata.collaboratorsCache = collaboratorsCache;
  }, [collaborators, collaboratorsCache]);

  const updateCollaboratorsCache = useCallback((user) => {
    const newCollaboratorsCache = { ...collaboratorsCache, [user.email]: user };
    setCollaboratorsCache(newCollaboratorsCache);
  }, [collaboratorsCache]);

  const getCollaborator = useCallback((email) => {
    let collaborator = collaborators && collaborators.find(c => c.email === email);
    if (collaborator) return collaborator;
    const defaultAvatarUrl = `${mediaUrl}/avatars/default.png`;
    if (email === 'anonymous' || email === 'seafevents') {
      collaborator = {
        email,
        name: email,
        avatar_url: defaultAvatarUrl,
      };
      return collaborator;
    }
    collaborator = collaboratorsCache[email];
    if (collaborator) return collaborator;
    if (!isValidEmail(email)) {
      return {
        email: email,
        name: email,
        avatar_url: defaultAvatarUrl,
      };
    }
    return null;
  }, [collaborators, collaboratorsCache]);

  return (
    <CollaboratorsContext.Provider value={{ collaborators, collaboratorsCache, updateCollaboratorsCache, getCollaborator }}>
      {children}
    </CollaboratorsContext.Provider>
  );
};

export const useCollaborators = () => {
  const context = useContext(CollaboratorsContext);
  if (!context) {
    throw new Error('\'CollaboratorsContext\' is null');
  }
  const { collaborators, collaboratorsCache, updateCollaboratorsCache, getCollaborator } = context;
  return { collaborators, collaboratorsCache, updateCollaboratorsCache, getCollaborator };
};
