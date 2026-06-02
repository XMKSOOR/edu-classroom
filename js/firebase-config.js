const firebaseConfig = {
  apiKey: "AIzaSyACPGcCa9V0IhjMJASYehP6NBR45IZ63Fw",
  authDomain: "edu-classroom-a2b8d.firebaseapp.com",
  projectId: "edu-classroom-a2b8d",
  storageBucket: "edu-classroom-a2b8d.firebasestorage.app",
  messagingSenderId: "1026113862086",
  appId: "1:1026113862086:web:1b5a7f0e09841987d7dac7",
  measurementId: "G-6ZH7JPQMF3"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
