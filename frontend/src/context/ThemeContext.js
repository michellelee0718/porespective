import React, { createContext, useState, useEffect, useContext } from "react";

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const checkTime = () => {
    const hours = new Date().getHours();
    return hours >= 18 || hours < 6;
  };

  useEffect(() => {
    // load saved preferences
    const savedMode = localStorage.getItem("themeMode");
    const savedAutoMode = localStorage.getItem("autoMode");

    if (savedAutoMode) {
      setIsAutoMode(savedAutoMode === "true");
    }

    if (savedMode) {
      setIsDarkMode(savedMode === "dark");
    } else if (savedAutoMode === "true" || savedAutoMode === null) {
      const isDark = checkTime();
      setIsDarkMode(isDark);
    }

    setInitialLoadComplete(true);
  }, []);

  useEffect(() => {
    if (!initialLoadComplete) return;

    if (isAutoMode) {
      const isDark = checkTime();
      setIsDarkMode(isDark);
      localStorage.setItem("themeMode", isDark ? "dark" : "light");
    }
  }, [isAutoMode, initialLoadComplete]);

  const toggleTheme = () => {
    // toggle theme
    setIsDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem("themeMode", newMode ? "dark" : "light");
      return newMode;
    });
  };

  const toggleAutoMode = () => {
    // toggle auto mode
    setIsAutoMode((prev) => {
      const newAutoMode = !prev;
      localStorage.setItem("autoMode", newAutoMode.toString());
      return newAutoMode;
    });
  };

  return (
    <ThemeContext.Provider
      value={{ isDarkMode, isAutoMode, toggleTheme, toggleAutoMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
