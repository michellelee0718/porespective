import React from "react"
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"
import Profile from "../../pages/Profile"
import { ThemeProvider } from "../../context/ThemeContext"
import { getDoc, doc } from "firebase/firestore"
import { getRoutineCheckInStatus } from "../../firebase/routineService"

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(),
}))
jest.mock("firebase/analytics", () => ({
  getAnalytics: jest.fn(),
}))
jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
  getDoc: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn(),
}))
jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({})),
}))
jest.mock("react-firebase-hooks/auth", () => ({
  useAuthState: () => [
    { uid: "test-user-id", displayName: "Test User" },
    false,
    null,
  ],
}))
jest.mock("../../firebase/routineService", () => ({
  initDailyCheckIn: jest.fn(),
  markRoutineCompleted: jest.fn(),
  getRoutineCheckInStatus: jest.fn(),
}))

describe("Routine Check-in UI", () => {
  beforeEach(() => {
    // Reset
    jest.clearAllMocks()

    doc.mockReturnValue("mocked-doc-ref")

    getRoutineCheckInStatus.mockResolvedValue({
      lastResetDate: "2024-05-15",
      amCompleted: false,
      pmCompleted: false,
    })

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        fullName: "Test User",
        skincareRoutine: {
          am: "8:00",
          pm: "20:00",
        },
      }),
    })
  })

  test("renders correct UI", () => {
    // Expect correct UI
    render(
      <ThemeProvider>
        <Profile />
      </ThemeProvider>,
    )

    // Verify result
    return screen.findByText("Today's Skincare Routine").then(() => {
      expect(screen.getByText("Morning Routine")).toBeInTheDocument()
      expect(screen.getByText("Evening Routine")).toBeInTheDocument()

      expect(screen.getAllByText("Status: Pending")).toHaveLength(2)

      const buttons = screen.getAllByText("Mark as Done")
      expect(buttons.length).toBe(2)
    })
  })

  test("disables buttons when routine times are not set", () => {
    // Expect disabled button when user has no routine times
    // Override the mock to return no routine times
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        fullName: "Test User",
        skincareRoutine: {
          am: "",
          pm: "",
        },
      }),
    })

    render(
      <ThemeProvider>
        <Profile />
      </ThemeProvider>,
    )

    return screen.findByText("Today's Skincare Routine").then(() => {
      // Verify result
      return screen.findAllByText("Mark as Done").then(buttons => {
        expect(buttons[0]).toBeDisabled()
        expect(buttons[1]).toBeDisabled()
      })
    })
  })

  test("correctly displays completed status", () => {
    // Expect completed status for AM routine
    // Mock a completed morning routine
    getRoutineCheckInStatus.mockResolvedValue({
      lastResetDate: "2024-05-15",
      amCompleted: true,
      pmCompleted: false,
    })

    render(
      <ThemeProvider>
        <Profile />
      </ThemeProvider>,
    )

    // Verify result
    return screen.findByText("Today's Skincare Routine").then(() => {
      return screen.findByText("Status: Completed").then(element => {
        expect(element).toBeInTheDocument()
      })
    })
  })

  test("correctly displays both routines completed", () => {
    // Expect both routines completed
    // Mock both routines completed
    getRoutineCheckInStatus.mockResolvedValue({
      lastResetDate: "2024-05-15",
      amCompleted: true,
      pmCompleted: true,
    })

    render(
      <ThemeProvider>
        <Profile />
      </ThemeProvider>,
    )

    // Verify result
    return screen.findByText("Today's Skincare Routine").then(() => {
      return screen.findAllByText("Status: Completed").then(elements => {
        expect(elements.length).toBe(2)
        const buttons = screen.queryAllByText("Mark as Done")
        expect(buttons.length).toBe(0)
      })
    })
  })
})
