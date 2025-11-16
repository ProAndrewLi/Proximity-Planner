import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.CLIENT_KEY_,
  authDomain: process.env.AUTH_DOMAIN_,
  projectId: process.env.PROJECT_ID_,
  storageBucket: process.env.STORAGE_BUCKET_,
  messagingSenderId: process.env.SENDER_ID_,
  appId: process.env.APP_ID_,
  measurementId: process.env.MEASURE_KEY_
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

export { auth, firestore, app}