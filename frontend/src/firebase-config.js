// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAnalytics } from "firebase/analytics"
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC9x-KUlNljNSL4X33lsaBYdOyOUu9AoOk",
  authDomain: "porespective.firebaseapp.com",
  projectId: "porespective",
  storageBucket: "porespective.firebasestorage.app",
  messagingSenderId: "224366153443",
  appId: "1:224366153443:web:c3126cd53ba95341543fd6",
  measurementId: "G-TQW37SLWDW",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const analytics = getAnalytics(app)
const db = getFirestore(app)
const auth = getAuth(app)

setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Persistence set to local storage")
  })
  .catch(error => {
    console.error("Error setting persistence:", error)
  })

const provider = new GoogleAuthProvider()

export { auth, db, provider }
