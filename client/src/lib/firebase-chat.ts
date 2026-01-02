import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const chatFirebaseConfig = {
  apiKey: "AIzaSyCikgHhycEV_SRH8Msl38F10EZNSq1lyVg",
  authDomain: "educfy2.firebaseapp.com",
  databaseURL: "https://educfy2-default-rtdb.firebaseio.com",
  projectId: "educfy2",
  storageBucket: "educfy2.firebasestorage.app",
  messagingSenderId: "929250730100",
  appId: "1:929250730100:web:43c3872b268aad9c0eb121",
  measurementId: "G-83BRNGX5W9"
};

export const chatApp = initializeApp(chatFirebaseConfig, "chatApp");
export const chatAuth = getAuth(chatApp);
export const chatDatabase = getDatabase(chatApp);
