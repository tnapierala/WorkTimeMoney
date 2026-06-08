import AsyncStorage from "@react-native-async-storage/async-storage";
import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
// @ts-ignore
import { Auth, getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCAiSoz2HwISwjdpJrNxmVHaAFPFIXd2AQ",
    authDomain: "worktimemoneyapp.firebaseapp.com",
    projectId: "worktimemoneyapp",
    storageBucket: "worktimemoneyapp.firebasestorage.app",
    messagingSenderId: "720376361832",
    appId: "1:720376361832:web:2f64451f668d0b1447dcdd",
    measurementId: "G-HWKJLN48T1"
};

// Initialize Firebase
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth with persistence ONLY for native platforms
let auth: Auth;
if (Platform.OS === 'web') {
    auth = getAuth(app);
} else {
    // For Android / iOS
    try {
        // @ts-ignore
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
        });
    } catch (e) {
        // If already initialized (common during Fast Refresh)
        auth = getAuth(app);
    }
}

const db: Firestore = getFirestore(app);

export { auth, db };
export default app;
