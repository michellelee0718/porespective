import React, { useState } from "react";
import { auth, provider, db } from "../firebase-config";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getTodayDateString } from "../firebase/routineService";
import "./Login.css";

function Login({ setIsAuth }) {
  let navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLoginSuccess = async (user) => {
    try {
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

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
        };

        await setDoc(userRef, userData);
        console.log("Created new user document");
      } else {
        console.log("User document exists");
      }

      localStorage.setItem("isAuth", "true");
      setIsAuth(true);
      navigate("/");
    } catch (error) {
      console.error("Error handling login:", error);
    }
  };

  const signInWithGoogle = () => {
    signInWithPopup(auth, provider)
      .then((result) => {
        handleLoginSuccess(result.user);
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    try {
      let userCredential;
      if (isRegistering) {
        userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
      } else {
        userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );
      }
      const user = userCredential.user;
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { email: user.email }, { merge: true });

      localStorage.setItem("isAuth", true);
      setIsAuth(true);
      navigate("/");
    } catch (error) {
      console.error("Error with email authentication", error);
    }
  };

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
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <br />
        <input
          className="pass_input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
  );
}

export default Login;
