import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, onSnapshot, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import app from './config';

export const db = getFirestore(app);

export { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, onSnapshot, arrayUnion, arrayRemove, increment };

export function getUserRef(uid) {
  return doc(db, 'users', uid);
}

export function getClassRef(classId) {
  return doc(db, 'classes', classId);
}

export function getAllClassesRef() {
  return collection(db, 'classes');
}

export function getUser(uid) {
  return getDoc(doc(db, 'users', uid)).then(s => s.data());
}

export function setUser(uid, data) {
  return setDoc(doc(db, 'users', uid), data);
}

export function listenClass(classId, cb, errCb) {
  return onSnapshot(doc(db, 'classes', classId), cb, errCb);
}

export function listenClasses(cb, errCb) {
  return onSnapshot(collection(db, 'classes'), cb, errCb);
}

export function updateClass(classId, data) {
  return updateDoc(doc(db, 'classes', classId), data);
}

export function addToClassArray(classId, field, value) {
  return updateDoc(doc(db, 'classes', classId), {
    [field]: arrayUnion(value)
  });
}
