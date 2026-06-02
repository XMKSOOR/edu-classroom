if(!firebase.apps.length){
  firebase.initializeApp({
    apiKey: "AIzaSyACPGcCa9V0IhjMJASYehP6NBR45IZ63Fw",
    authDomain: "edu-classroom-a2b8d.firebaseapp.com",
    projectId: "edu-classroom-a2b8d",
    storageBucket: "edu-classroom-a2b8d.firebasestorage.app",
    messagingSenderId: "1026113862086",
    appId: "1:1026113862086:web:1b5a7f0e09841987d7dac7"
  });
}
var auth = firebase.auth();
var db = firebase.firestore();
var storage = firebase.storage();
