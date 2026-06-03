import { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext(null);

let notifId = 0;

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const notify = useCallback((msg) => {
    const id = ++notifId;
    setNotifications(prev => [...prev, { id, msg }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3500);
  }, []);

  return (
    <NotificationContext.Provider value={{ notify, notifications, setNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotify() {
  return useContext(NotificationContext);
}
