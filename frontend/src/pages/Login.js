import React from "react"
import { auth, provider, db } from "../firebase-config"
import { signInWithPopup } from "firebase/auth"
import { useNavigate } from "react-router-dom"
import { doc, getDoc, setDoc } from "firebase/firestore"

function Login({ setIsAuth }) {
  let navigate = useNavigate()

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, provider)
    const user = result.user
    const userRef = doc(db, "users", user.uid)

    // Fetch existing user data to ensure we preserve the routine fields
    const userDoc = await getDoc(userRef)
    const userData = userDoc.exists() ? userDoc.data() : null

    // If user data exists, include routineCheckIn, else initialize it
    const routineCheckIn = userData
      ? userData.routineCheckIn || {
          lastResetDate: "",
          amCompleted: false,
          pmCompleted: false,
        }
      : {
          lastResetDate: "",
          amCompleted: false,
          pmCompleted: false,
        }

    // Merge routineCheckIn and other user data
    await setDoc(
      userRef,
      {
        email: user.email,
        routineCheckIn, // preserve the routine check-in fields
      },
      { merge: true },
    )

    localStorage.setItem("isAuth", true)
    setIsAuth(true)
    navigate("/")
  }

  return (
    <div className="loginPage">
      <p>Sign in with Google to Continue</p>
      <button className="login-with-google-btn" onClick={signInWithGoogle}>
        Sign in with Google
      </button>
    </div>
  )
}

export default Login

// function Login({ setIsAuth }) {
//   let navigate = useNavigate()

//   const signInWithGoogle = async () => {
//     const result = await signInWithPopup(auth, provider)
//     const user = result.user
//     const userRef = doc(db, "users", user.uid)
//     await setDoc(
//       userRef,
//       {
//         email: user.email,
//       },
//       { merge: true },
//     )

//     localStorage.setItem("isAuth", true)
//     setIsAuth(true)
//     navigate("/")
//   }
//   return (
//     <div className="loginPage">
//       <p>Sign in with Google to Continue</p>
//       <button className="login-with-google-btn" onClick={signInWithGoogle}>
//         Sign in with Google
//       </button>
//     </div>
//   )
// }

// export default Login
