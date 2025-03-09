import React, { useState } from "react";
import { auth, db } from "../firebase-config";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./Registration.css";

function Registration() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // Set display name and default photo URL
      await updateProfile(user, {
        displayName: username,
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          username,
        )}&background=ae7e7e&color=fff`,
      });

      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        username: username,
        email: email,
        displayName: username,
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          username,
        )}&background=ae7e7e&color=fff`,
        createdAt: new Date(),
        skincareRoutine: { am: "", pm: "" },
        routineCheckIn: {
          lastResetDate: new Date().toISOString().split("T")[0],
          amCompleted: false,
          pmCompleted: false,
        },
      });

      // Navigate to profile creation
      navigate("/profile-creation");
    } catch (error) {
      console.error("Registration error:", error);
      if (error.code === "auth/email-already-in-use") {
        setError("Email is already registered");
      } else if (error.code === "auth/invalid-email") {
        setError("Invalid email format");
      } else if (error.code === "auth/weak-password") {
        setError("Password should be at least 6 characters");
      } else {
        setError("An error occurred during registration");
      }
    }
  };

  return (
    <div className="registrationPage">
      <h1>Create Account</h1>
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSignUp} className="registration-form">
        <div className="form-group">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
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
        <button type="submit" className="signup-btn">
          Sign Up
        </button>
      </form>
    </div>
  );
}

export default Registration;
