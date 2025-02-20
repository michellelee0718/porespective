import React, { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Results from "./pages/Results"; // Import Results page
import { signOut } from "firebase/auth";
import { auth } from "./firebase-config";
import { useAuthState } from "react-firebase-hooks/auth";

function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [user] = useAuthState(auth);

  useEffect(() => { 
    if (user) {
      setIsAuth(true);
    }
  }, [user]);

  const signUserOut = () => {
    signOut(auth).then(() => {
      localStorage.clear();
      setIsAuth(false);
      window.location.pathname = "/login";
    });
  };

  return (
    <Router>
      <nav>
        <span>
          <Link to="/"> home </Link>
        </span>

        <div className="right-nav">
          <span className="user">
            {!user ? (
              <Link to="/login"> login </Link>
            ) : (
              <>
                <div>{user?.displayName}</div>
                <img src={user?.photoURL || ""} height="30px" width="30px" alt=""/>
                <Link to="/profile"> profile </Link>
                <Link onClick={signUserOut}> log out </Link>
              </>
            )}
          </span>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login setIsAuth={setIsAuth} />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/results" element={<Results />} /> {/* ✅ New route for results */}
      </Routes>
    </Router>
  );
}

export default App;
