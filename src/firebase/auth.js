import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
import app from './config';

export const auth = getAuth(app);

export function loginEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signupEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function googleLogin() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export function updateUserProfile(displayName) {
  if (auth.currentUser) {
    return updateProfile(auth.currentUser, { displayName });
  }
  return Promise.resolve();
}

export function logout() {
  return auth.signOut();
}

