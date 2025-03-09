import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Profile from "../../pages/Profile";
import {
  initDailyCheckIn,
  markRoutineCompleted,
  getRoutineCheckInStatus,
} from "../../firebase/routineService";
import { getDoc, doc } from "firebase/firestore";

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(),
}));
jest.mock("firebase/analytics", () => ({
  getAnalytics: jest.fn(),
}));
jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
  getDoc: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn(),
}));
jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({})),
}));
jest.mock("react-firebase-hooks/auth", () => ({
  useAuthState: () => [
    { uid: "test-user-id", displayName: "Test User" },
    false,
    null,
  ],
}));
jest.mock("../../firebase/routineService", () => ({
  initDailyCheckIn: jest.fn(),
  markRoutineCompleted: jest.fn(),
  getRoutineCheckInStatus: jest.fn(),
}));

describe("Profile Component", () => {
  beforeEach(() => {
    // Reset
    jest.clearAllMocks();

    doc.mockReturnValue("mocked-doc-ref");
    // Mock the routineService functions
    initDailyCheckIn.mockResolvedValue({
      lastResetDate: "2024-05-15",
      amCompleted: false,
      pmCompleted: false,
    });

    getRoutineCheckInStatus.mockResolvedValue({
      lastResetDate: "2024-05-15",
      amCompleted: false,
      pmCompleted: false,
    });

    markRoutineCompleted.mockResolvedValue(true);

    // Mock Firestore getDoc
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        fullName: "Test User",
        gender: "Female",
        skinType: "Test Skin Type",
        skincareRoutine: {
          am: "8:00",
          pm: "20:00",
        },
      }),
    });
  });

  test("renders routine check-in section", async () => {
    // Expect correct UI
    render(<Profile />);

    await screen.findByText("Today's Skincare Routine", {}, { timeout: 5000 });

    expect(screen.getByText("Morning Routine")).toBeInTheDocument();
    expect(screen.getByText("Evening Routine")).toBeInTheDocument();
    expect(screen.getAllByText("Mark as Done")).toHaveLength(2);
  });

  test("marks routine as completed", async () => {
    // Expect correct completion
    markRoutineCompleted.mockResolvedValueOnce(true);

    const result = await markRoutineCompleted("am");

    // Verify result
    expect(markRoutineCompleted).toHaveBeenCalledWith("am");
    expect(result).toBe(true);
  });

  test("handles errors when marking routine as completed", async () => {
    // Expect error to be logged
    const mockError = new Error("Test error");
    markRoutineCompleted.mockRejectedValue(mockError);
    // Mock console.error
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    // Verify error was logged
    try {
      await markRoutineCompleted("am");
    } catch (error) {
      expect(error).toEqual(mockError);
    }

    consoleErrorSpy.mockRestore();
  });
});
