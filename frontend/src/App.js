import React, { useEffect, useState } from "react"
import "./App.css"
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom"
import Home from "./pages/Home"
import Login from "./pages/Login"
import Profile from "./pages/Profile"
import Results from "./pages/Results" // Import Results page
import Registration from "./pages/Registration"
import ProfileCreation from "./pages/ProfileCreation"
import { ThemeProvider } from "./context/ThemeContext"
import { useTheme } from "./context/ThemeContext"
import { signOut } from "firebase/auth"
import { auth } from "./firebase-config"
import { useAuthState } from "react-firebase-hooks/auth"
import ThemeToggle from "./components/ThemeToggle"
import { scheduleNotifications } from "./components/Notification"
import { initDailyCheckIn } from "./firebase/routineService"
import "./components/RoutineCheckIn.css"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "./firebase-config"

function AppContent() {
  const { isDarkMode } = useTheme()
  const [isAuth, setIsAuth] = useState(false)
  const [user] = useAuthState(auth)
  const [userData, setUserData] = useState(null)

  useEffect(() => {
    if (user) {
      setIsAuth(true)

      const ensureUserDocument = async () => {
        const userRef = doc(db, "users", user.uid)
        const docSnap = await getDoc(userRef)

        if (!docSnap.exists()) {
          const userData = {
            fullName: user.displayName || "",
            email: user.email || "",
            displayName: user.displayName || user.email.split("@")[0],
            photoURL:
              user.photoURL ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user.displayName || user.email.split("@")[0],
              )}&background=ae7e7e&color=fff`,
            createdAt: new Date(),
            skincareRoutine: { am: "", pm: "" },
          }

          await setDoc(userRef, userData)
        }

        setUserData(docSnap.data())
        // Initialize today's check-in status
        initDailyCheckIn()

        // Schedule notifications
        scheduleNotifications()
      }

      ensureUserDocument()
    }
  }, [user])

  const signUserOut = () => {
    signOut(auth).then(() => {
      const themeMode = localStorage.getItem("themeMode")
      const autoMode = localStorage.getItem("autoMode")

      localStorage.clear()

      if (themeMode) localStorage.setItem("themeMode", themeMode)
      if (autoMode) localStorage.setItem("autoMode", autoMode)

      setIsAuth(false)
      setUserData(null)
      window.location.pathname = "/login"
    })
  }

  return (
    <div className={`app ${isDarkMode ? "dark-mode" : "light-mode"}`}>
      <Router>
        <nav>
          <div className="nav-content">
            <div className="nav-left">
              <Link to="/"> home </Link>
            </div>
            <div className="right-nav">
              <span className="user">
                {!user ? (
                  <div className="auth-links">
                    <Link to="/login"> login </Link>
                    <Link to="/registration"> register </Link>
                  </div>
                ) : (
                  <div className="user-menu">
                    <div className="user-top">
                      <div>{user.displayName || user.email.split("@")[0]}</div>
                      <img
                        src={
                          user.photoURL ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            user.displayName || user.email.split("@")[0],
                          )}&background=ae7e7e&color=fff`
                        }
                        height="30px"
                        width="30px"
                        alt=""
                        onError={e => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            user.displayName || user.email.split("@")[0],
                          )}&background=ae7e7e&color=fff`
                        }}
                      />
                      <Link to="/profile"> profile </Link>
                      <Link onClick={signUserOut}> log out </Link>
                    </div>
                    <ThemeToggle />
                  </div>
                )}
              </span>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login setIsAuth={setIsAuth} />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/results" element={<Results />} />{" "}
          {/* ✅ Keep this new route */}
          <Route path="/registration" element={<Registration />} />
          <Route path="/profile-creation" element={<ProfileCreation />} />
        </Routes>
      </Router>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
