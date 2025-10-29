import { useContext } from 'react';
import SessionManagerContext from './sessionManagerContext';

const useSessionManager = () => {
  const context = useContext(SessionManagerContext);
  if (!context) {
    throw new Error('useSessionManager must be used within a SessionManagerProvider');
  }
  return context;
};

export default useSessionManager;
