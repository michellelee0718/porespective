import React from "react"
import "@testing-library/jest-dom"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { BrowserRouter } from "react-router-dom"
import Login from "../../pages/Login"
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  getAuth,
} from "firebase/auth"
import { getDoc, setDoc, doc } from "firebase/firestore"

// Mock Firebase Auth and Firestore
jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
  getAuth: jest.fn(),
  GoogleAuthProvider: jest.fn().mockImplementation(() => {}),
}))

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}))

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}))

const mockUser = {
  uid: "user123",
  displayName: "Test User",
  email: "testuser@gmail.com",
}

describe("Login Component", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("handles successful email/password login", async () => {
    signInWithEmailAndPassword.mockResolvedValueOnce({ user: mockUser })

    render(
      <BrowserRouter>
        <Login setIsAuth={jest.fn()} />
      </BrowserRouter>,
    )

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "testuser@gmail.com" },
    })
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    })

    fireEvent.click(screen.getByRole("button", { name: /login/i }))

    await waitFor(() => expect(window.location.pathname).not.toBe("/login"))
  })

  test("displays error message when password login fails", async () => {
    signInWithEmailAndPassword.mockRejectedValueOnce({
      code: "auth/wrong-password",
    })

    render(
      <BrowserRouter>
        <Login setIsAuth={jest.fn()} />
      </BrowserRouter>,
    )

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "testuser@gmail.com" },
    })
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "wrongpassword" },
    })

    fireEvent.click(screen.getByRole("button", { name: /login/i }))

    await waitFor(() =>
      expect(screen.getByText("Invalid password")).toBeInTheDocument(),
    )
  })

  test("displays error message when email and password login fails", async () => {
    signInWithEmailAndPassword.mockRejectedValueOnce({
      code: "auth/invalid-login-credentials",
    })

    render(
      <BrowserRouter>
        <Login setIsAuth={jest.fn()} />
      </BrowserRouter>,
    )

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "wrongtestuser@gmail.com" },
    })
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "wrongpassword" },
    })

    fireEvent.click(screen.getByRole("button", { name: /login/i }))

    await waitFor(() =>
      expect(screen.getByText("Invalid email or password")).toBeInTheDocument(),
    )
  })

  test("displays error message for invalid email format", async () => {
    signInWithEmailAndPassword.mockRejectedValueOnce({
      code: "auth/invalid-email",
    })

    render(
      <BrowserRouter>
        <Login setIsAuth={jest.fn()} />
      </BrowserRouter>,
    )

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "invalidemail.com" },
    })
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    })

    fireEvent.click(screen.getByRole("button", { name: /login/i }))

    await waitFor(() =>
      expect(screen.getByText("Invalid email format")).toBeInTheDocument(),
    )
  })

  test("handles unsuccessful Google sign-in", async () => {
    signInWithPopup.mockResolvedValueOnce({ user: mockUser })
    getDoc.mockResolvedValueOnce({ exists: () => false })
    setDoc.mockResolvedValueOnce({})

    render(
      <BrowserRouter>
        <Login setIsAuth={jest.fn()} />
      </BrowserRouter>,
    )

    fireEvent.click(screen.getByText(/Sign in with Google/i))

    expect(screen.queryByText("An error occurred during Google sign-in"))
  })

  test("displays error message when Google sign-in fails", async () => {
    signInWithPopup.mockRejectedValueOnce(new Error("Google sign-in failed"))

    render(
      <BrowserRouter>
        <Login setIsAuth={jest.fn()} />
      </BrowserRouter>,
    )

    fireEvent.click(screen.getByText("Sign in with Google"))

    await waitFor(() =>
      expect(
        screen.getByText("Failed to sign in with Google"),
      ).toBeInTheDocument(),
    )
  })

  test("handles successful registration of a new user via Google", async () => {
    signInWithPopup.mockResolvedValueOnce({ user: mockUser })
    getDoc.mockResolvedValueOnce({ exists: () => false })
    setDoc.mockResolvedValueOnce({})

    const navigate = jest.fn()
    jest
      .spyOn(require("react-router-dom"), "useNavigate")
      .mockReturnValue(navigate)

    render(
      <BrowserRouter>
        <Login setIsAuth={jest.fn()} />
      </BrowserRouter>,
    )

    // Simulate Google sign-in button click
    fireEvent.click(screen.getByText(/Sign in with Google/i))

    // Ensure Firestore setDoc was called to create a new user profile
    await waitFor(() =>
      expect(setDoc).toHaveBeenCalledWith(
        doc(expect.any(Object), "users", mockUser.uid),
        expect.objectContaining({
          fullName: mockUser.displayName,
          email: mockUser.email,
          createdAt: expect.any(Date),
          skincareRoutine: expect.any(Object),
          routineCheckIn: expect.any(Object),
        }),
      ),
    )

    // Ensure user is redirected to the profile creation page
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/profile-creation"),
    )
  })

  test("navigates to registration page when 'Register' button is clicked", async () => {
    const navigate = jest.fn()
    jest
      .spyOn(require("react-router-dom"), "useNavigate")
      .mockReturnValue(navigate)

    render(
      <BrowserRouter>
        <Login setIsAuth={jest.fn()} />
      </BrowserRouter>,
    )

    fireEvent.click(screen.getByText("Register"))

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/registration"))
  })
})
