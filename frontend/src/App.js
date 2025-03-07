import React, { useEffect, useState } from "react"
import "./App.css"
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom"
import Home from "./pages/Home"
import Login from "./pages/Login"
import Profile from "./pages/Profile"
import Results from "./pages/Results" // Import Results page
import { ThemeProvider } from "./context/ThemeContext"
import { useTheme } from "./context/ThemeContext"
import { signOut } from "firebase/auth"
import { auth } from "./firebase-config"
import { useAuthState } from "react-firebase-hooks/auth"
import ThemeToggle from "./components/ThemeToggle"
import { scheduleNotifications } from "./components/Notification"
import { initDailyCheckIn } from "./firebase/routineService"
import "./components/RoutineCheckIn.css"

function AppContent() {
  const { isDarkMode } = useTheme()
  const [isAuth, setIsAuth] = useState(false)
  const [user] = useAuthState(auth)

  useEffect(() => {
    if (user) {
      setIsAuth(true)

      // Initialize today's check-in status
      initDailyCheckIn()

      // Schedule notifications
      scheduleNotifications()
    }
  }, [user])

  const signUserOut = () => {
    signOut(auth).then(() => {
      // localStorage.clear();
      setIsAuth(false)
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
                  <Link to="/login"> login </Link>
                ) : (
                  <div className="user-menu">
                    <div className="user-top">
                      <div>{user?.displayName}</div>
                      <img
                        src={user?.photoURL || ""}
                        height="30px"
                        width="30px"
                        alt=""
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
