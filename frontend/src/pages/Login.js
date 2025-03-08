import React from "react";
import { auth, provider, db } from "../firebase-config";
import { signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getTodayDateString } from "../firebase/routineService";

function Login({ setIsAuth }) {
  let navigate = useNavigate();

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
  return (
    <div className="loginPage">
      <p>Sign in with Google to Continue</p>
      <button className="login-with-google-btn" onClick={signInWithGoogle}>
        Sign in with Google
      </button>
    </div>
  );
}

export default Login;
