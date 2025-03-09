import React, { useState } from "react"
import { auth, provider, db } from "../firebase-config"
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth"
import { useNavigate } from "react-router-dom"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { getTodayDateString } from "../firebase/routineService"
import "./Login.css"

function Login({ setIsAuth }) {
  let navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isRegistering, setIsRegistering] = useState(false)

  const handleLoginSuccess = async user => {
    try {
      const userRef = doc(db, "users", user.uid)
      const docSnap = await getDoc(userRef)

      if (!docSnap.exists()) {
        const userData = {
          fullName: user.displayName || "",
          email: user.email || "",
          createdAt: new Date(),
          skincareRoutine: { am: "", pm: "" },
          routineCheckIn: {
            lastResetDate: getTodayDateString(),
            amCompleted: false,
            pmCompleted: false,
          },
        }

        await setDoc(userRef, userData)
        console.log("Created new user document")
      } else {
        console.log("User document exists")
      }

      localStorage.setItem("isAuth", "true")
      setIsAuth(true)
      navigate("/")
    } catch (error) {
      console.error("Error handling login:", error)
    }
  }

  const signInWithGoogle = () => {
    signInWithPopup(auth, provider)
      .then(result => {
        handleLoginSuccess(result.user)
      })
      .catch(error => {
        console.error(error)
      })
  }

  const handleEmailAuth = async e => {
    e.preventDefault()
    try {
      // validate password length
      if (password.length < 6) {
        alert("Password must be at least 6 characters long.")
        return
      }

      let userCredential

      if (isRegistering) {
        // check if the email is already registered
        const userExists = await checkIfUserExists(email)
        if (userExists) {
          alert("This email is already registered. Please log in.")
          return
        }

        // register the user with email and password
        userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        )
        const user = userCredential.user

        const userRef = doc(db, "users", user.uid)
        const userData = {
          fullName: "",
          email: user.email || "",
          createdAt: new Date(),
          skincareRoutine: { am: "", pm: "" },
          routineCheckIn: {
            lastResetDate: getTodayDateString(),
            amCompleted: false,
            pmCompleted: false,
          },
        }

        // create the user in Firestore only after successful registration
        await setDoc(userRef, userData)
        console.log("User registered and document created")
      } else {
        // for login, first authenticate the user with email and password
        userCredential = await signInWithEmailAndPassword(auth, email, password)
        const user = userCredential.user

        // check if user exists in Firestore
        const userRef = doc(db, "users", user.uid)
        const docSnap = await getDoc(userRef)

        if (!docSnap.exists()) {
          console.error(
            "User does not exist in Firestore. Please register first.",
          )
          alert("User not found in Firestore. Please register first.")
          return
        }
      }

      // if the process reaches here, user is authenticated successfully
      localStorage.setItem("isAuth", "true")
      setIsAuth(true)
      navigate("/")
    } catch (error) {
      console.error("Error with email authentication", error)
      alert(`An error occurred: ${error.message}`)
    }
  }

  // helper function to check if a user already exists in Firebase Auth
  const checkIfUserExists = async email => {
    try {
      const userRecord = await auth.getUserByEmail(email)
      return !!userRecord // if userRecord exists, email is registered
    } catch (error) {
      return false // if error occurs, user doesn't exist
    }
  }

  return (
    <div className="loginPage">
      <p>Sign in with Google or Email</p>
      <button className="login-with-google-btn" onClick={signInWithGoogle}>
        Sign in with Google
      </button>
      <form className="email_login" onSubmit={handleEmailAuth}>
        <input
          className="email_input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <br />
        <input
          className="pass_input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <br />
        <button className="submit_login" type="submit">
          {isRegistering ? "Register" : "Login"}
        </button>
      </form>
      <p
        onClick={() => setIsRegistering(!isRegistering)}
        style={{ cursor: "pointer", color: "blue" }}
      >
        {isRegistering
          ? "Already have an account? Log in"
          : "Don't have an account? Register"}
      </p>
    </div>
  )
}

export default Login
