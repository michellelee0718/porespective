import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { ThemeProvider } from "../../context/ThemeContext"
import ThemeToggle from "../../components/ThemeToggle"

// Mock Firebase authentication
jest.mock("react-firebase-hooks/auth", () => ({
  useAuthState: jest.fn(),
}))

import { useAuthState } from "react-firebase-hooks/auth"

describe("Theme Toggle Tests", () => {
  beforeEach(() => {
    // Ensure user is authenticated
    useAuthState.mockReturnValue([{ uid: "test-user" }, false])

    // Clear localStorage before each test
    localStorage.clear()

    // set initial time to be 12:00 p.m
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2025-01-01T12:00:00"))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test("initialize with auto mode and correct theme based on time", async () => {
    // Set system time to night for testing dark mode auto behavior
    jest.setSystemTime(new Date("2025-01-01T21:00:00"))

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    )

    const autoCheckbox = screen.getByLabelText("Auto")
    const themeToggle = screen.getByRole("checkbox", { name: "" })

    expect(autoCheckbox).toBeChecked()
    expect(themeToggle).toBeDisabled()
    // expect dark theme
    expect(themeToggle).toBeChecked()
  })

  test("toggle theme enabled when auto mode is disabled", async () => {
    // expect successful toggle when auto mode is disabled
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    )

    const autoCheckbox = screen.getByLabelText("Auto")
    const themeToggle = screen.getByRole("checkbox", { name: "" })

    // disable auto mode
    fireEvent.click(autoCheckbox)
    expect(autoCheckbox).not.toBeChecked()
    expect(themeToggle).not.toBeDisabled()

    // nitial state is light mode
    expect(themeToggle).not.toBeChecked()
    expect(screen.getByText("Day")).toBeInTheDocument()

    // toggle to dark mode
    fireEvent.click(themeToggle)
    expect(themeToggle).toBeChecked()
    expect(screen.getByText("Night")).toBeInTheDocument()
  })

  test("should persist theme preferences in localStorage", async () => {
    // expect the dark theme to be persisted in localStorage as we toggle
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    )

    const autoCheckbox = screen.getByLabelText("Auto")
    const themeToggle = screen.getByRole("checkbox", { name: "" })

    // disable auto mode
    fireEvent.click(autoCheckbox)
    expect(localStorage.getItem("autoMode")).toBe("false")

    // toggle to dark mode
    fireEvent.click(themeToggle)
    expect(localStorage.getItem("themeMode")).toBe("dark")
  })
})
