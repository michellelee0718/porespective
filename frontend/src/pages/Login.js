import React, { useState } from "react";
import { auth, db } from "../firebase-config";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getTodayDateString } from "../firebase/routineService";
import "./Login.css";
import { FcGoogle } from "react-icons/fc";

function Login({ setIsAuth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  let navigate = useNavigate();
  const provider = new GoogleAuthProvider();

  const handleLoginSuccess = async (user) => {
    try {
      console.log("Attempting to fetch user document for:", user.uid);
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

      console.log("Document exists:", docSnap.exists());
      if (docSnap.exists()) {
        console.log("User document data:", docSnap.data());
        localStorage.setItem("isAuth", "true");
        setIsAuth(true);
        navigate("/");
      } else {
        // If the user exists in Auth but not in Firestore
        console.log("User exists in Auth but not in Firestore");
        setError("User profile not found. Please complete registration.");
        navigate("/profile-creation");
      }
    } catch (error) {
      console.error("Error handling login:", error);
      setError("An error occurred during login");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const trimmedEmail = email.trim().toLowerCase();
      console.log("Attempting login for email:", trimmedEmail);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        trimmedEmail,
        password.trim(),
      );
      console.log("Login successful, user:", userCredential.user);
      await handleLoginSuccess(userCredential.user);
    } catch (error) {
      console.error("Login error details:", {
        code: error.code,
        message: error.message,
        fullError: error,
      });

      if (error.code === "auth/user-not-found") {
        setError("User not found");
      } else if (error.code === "auth/wrong-password") {
        setError("Invalid password");
      } else if (error.code === "auth/invalid-login-credentials") {
        setError("Invalid email or password");
      } else if (error.code === "auth/invalid-email") {
        setError("Invalid email format");
      } else {
        setError(`Login error: ${error.message}`);
      }
    }
  };

  const handleGoogleLoginSuccess = async (user) => {
    try {
      console.log("Attempting to fetch Google user document for:", user.uid);
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        console.log("New Google user, redirecting to profile creation");
        // Set minimal user data
        const userData = {
          fullName: user.displayName || "",
          email: user.email || "",
          createdAt: new Date(),
          skincareRoutine: {
            am: { hour: "6", minute: "00", period: "AM" },
            pm: { hour: "6", minute: "00", period: "PM" },
          },
          routineCheckIn: {
            lastResetDate: getTodayDateString(),
            amCompleted: false,
            pmCompleted: false,
          },
          amNotification: false, 
          pmNotification: false,
        };
        await setDoc(userRef, userData);
        localStorage.setItem("isAuth", "true");
        setIsAuth(true);
        navigate("/profile-creation");
      } else {
        console.log("Existing Google user, redirecting to home");
        localStorage.setItem("isAuth", "true");
        setIsAuth(true);
        navigate("/");
      }
    } catch (error) {
      console.error("Error handling Google login:", error);
      setError("An error occurred during Google sign-in");
    }
  };

  const signInWithGoogle = () => {
    signInWithPopup(auth, provider)
      .then((result) => {
        handleGoogleLoginSuccess(result.user);
      })
      .catch((error) => {
        console.error("Google sign-in error:", error);
        setError("Failed to sign in with Google");
      });
  };

  const navigateToRegistration = () => {
    navigate("/registration");
  };

  return (
    <div className="loginPage">
      <h1>Login</h1>
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleLogin} className="login-form">
        <div className="input-row">
          <div className="form-group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="button-group">
          <button type="submit" className="login-btn">
            Login
          </button>
          <button
            type="button"
            className="register-btn"
            onClick={navigateToRegistration}
          >
            Register
          </button>
          <button
            type="button"
            className="google-btn"
            onClick={signInWithGoogle}
          >
            <FcGoogle size={20} /> Sign in with Google
          </button>
        </div>
      </form>
    </div>
  );
}

export default Login;
