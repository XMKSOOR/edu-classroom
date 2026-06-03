import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/auth';
import { getUser } from '../firebase/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('edu_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const justLoggedIn = localStorage.getItem('edu_just_logged_in');
        if (!justLoggedIn) {
          try {
            const data = await getUser(fbUser.uid);
            if (data) {
              const u = { uid: fbUser.uid, name: data.name, role: data.role };
              setUser(u);
              localStorage.setItem('edu_user', JSON.stringify(u));
            }
          } catch {}
        }
        localStorage.removeItem('edu_just_logged_in');
      } else {
        setUser(null);
        localStorage.removeItem('edu_user');
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
