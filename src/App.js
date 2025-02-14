import React, { useEffect } from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from './pages/Home';
import CreatePost from './pages/create-post/CreatePost';
import Login from './pages/Login';
import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from "./firebase-config";
import { useAuthState } from "react-firebase-hooks/auth";

function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [user] = useAuthState(auth);

  useEffect(() => { 
    if (user) {
      setIsAuth(true);
    }
  }, [user])

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
        <Link to="/"> Home </Link>
      </span>

      <div className="right-nav">
        <span className='user'>
          {!user ? (
            <Link to="/login"> Login </Link>
          ) : (
              <>
                <div>{user?.displayName}</div>
                <img src={user?.photoURL || ""} height="30px" width="30px" alt=""/>
                <Link onClick={signUserOut}> Log Out </Link>
              </>
            )}
        </span>
      </div>
    </nav>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/createpost" element={<CreatePost />} />
      <Route path="/login" element={<Login setIsAuth={setIsAuth} />} />
    </Routes>
  </Router>
  );
}

export default App;
