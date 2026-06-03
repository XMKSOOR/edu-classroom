import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import app from './config';

export const storage = getStorage(app);

export function uploadFile(path, file) {
  const storageRef = ref(storage, path);
  return uploadBytes(storageRef, file).then(snapshot => getDownloadURL(snapshot.ref));
}
