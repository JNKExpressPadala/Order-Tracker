// firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyAnrNfuTSRAKUS2tAU4AUUrauw_QzszCjY",
  authDomain: "jnk-ordertracker.firebaseapp.com",
  projectId: "jnk-ordertracker",
  storageBucket: "jnk-ordertracker.appspot.com",
  messagingSenderId: "421193030070",
  appId: "1:421193030070:web:078e39980237bc41f64917"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
