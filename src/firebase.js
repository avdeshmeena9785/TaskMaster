import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyASE0A-S6ao0IzzVAUNhK9914ZL6UeUUFY",
  authDomain: "taskmaster-f05d5.firebaseapp.com",
  projectId: "taskmaster-f05d5",
  storageBucket: "taskmaster-f05d5.firebasestorage.app",
  messagingSenderId: "224681842963",
  appId: "1:224681842963:web:b4c78dfe18f2c78b45a2e6",
  measurementId: "G-FYET4M0RRJ"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);