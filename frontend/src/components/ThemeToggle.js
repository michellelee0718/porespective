import React from "react"
import { useTheme } from "../context/ThemeContext"

const ThemeToggle = () => {
  const { isDarkMode, isAutoMode, toggleTheme, toggleAutoMode } = useTheme()

  return (
    <div className="theme-toggle">
      <div className="toggle-container">
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={isDarkMode}
            onChange={toggleTheme}
            disabled={isAutoMode}
          />
          <span className="toggle-slider"></span>
        </label>
        <span className="toggle-label">{isDarkMode ? "Night" : "Day"}</span>
      </div>

      <div className="auto-toggle">
        <label>
          <input
            type="checkbox"
            checked={isAutoMode}
            onChange={toggleAutoMode}
          />
          <span>Auto</span>
        </label>
      </div>
    </div>
  )
}

export default ThemeToggle
