import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBhePn3qRW0SUUzPN00tFWoY87mwS7A_No",
  authDomain: "proximityplannerevents.firebaseapp.com",
  projectId: "proximityplannerevents",
  storageBucket: "proximityplannerevents.firebasestorage.app",
  messagingSenderId: "1070294156988",
  appId: "1:1070294156988:web:2a46647406fa6119ecf2b9",
  measurementId: "G-8D0CHXTQ8M"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

export { auth, firestore, app}