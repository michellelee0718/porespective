import React, { createContext, useState, useEffect, useContext } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "../firebase-config"

export const ThemeContext = createContext()

export const ThemeProvider = ({ children }) => {
  const [user] = useAuthState(auth)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isAutoMode, setIsAutoMode] = useState(true)

  const checkTime = () => {
    const hours = new Date().getHours()
    return hours >= 18 || hours < 6
  }

  useEffect(() => {
    // Load saved preferences only if the user is authenticated
    if (user) {
      const savedMode = localStorage.getItem("themeMode")
      const savedAutoMode = localStorage.getItem("autoMode")

      if (savedMode) {
        setIsDarkMode(savedMode === "dark")
      }
      if (savedAutoMode) {
        setIsAutoMode(savedAutoMode === "true")
      }
    }
  }, [user]) // will run when the user state changes

  useEffect(() => {
    // Switch to dark mode if auto mode is enabled and time is night
    if (isAutoMode) {
      const isDark = checkTime()
      setIsDarkMode(isDark)
    }
  }, [isAutoMode])

  const toggleTheme = () => {
    // Toggle theme
    setIsDarkMode(prev => {
      const newMode = !prev
      if (user) {
        localStorage.setItem("themeMode", newMode ? "dark" : "light")
      }
      return newMode
    })
  }

  const toggleAutoMode = () => {
    // Toggle auto mode
    setIsAutoMode(prev => {
      const newAutoMode = !prev
      if (user) {
        localStorage.setItem("autoMode", newAutoMode.toString())
      }
      return newAutoMode
    })
  }

  return (
    <ThemeContext.Provider
      value={{ isDarkMode, isAutoMode, toggleTheme, toggleAutoMode }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
