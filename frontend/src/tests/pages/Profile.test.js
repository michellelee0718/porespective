import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Profile from "../../pages/Profile";
import {
  initDailyCheckIn,
  markRoutineCompleted,
  getRoutineCheckInStatus,
} from "../../firebase/routineService";
import { getDoc } from "firebase/firestore";

jest.mock("../../firebase/routineService");
jest.mock("firebase/firestore");
jest.mock("../../firebase-config", () => ({
  auth: {
    currentUser: { uid: "test-user-id", displayName: "Test User" },
  },
  db: {},
}));

describe("Profile Component", () => {
  beforeEach(() => {
    // Reset
    jest.clearAllMocks();

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

  test("marks AM routine as completed when button is clicked", async () => {
    // Expect AM routine to be marked as completed when button is clicked
    render(<Profile />);

    // Mock am rountine done
    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });
    const amButton = screen.getAllByText("Mark as Done")[0];
    fireEvent.click(amButton);

    expect(markRoutineCompleted).toHaveBeenCalledWith("am");

    // Mock the update
    getRoutineCheckInStatus.mockResolvedValue({
      lastResetDate: "2024-05-15",
      amCompleted: true,
      pmCompleted: false,
    });

    // Verify result
    await waitFor(() => {
      expect(screen.getAllByText(/Pending/, { exact: false })).toHaveLength(1);
      expect(
        screen.getByText(/Completed/, { exact: false }),
      ).toBeInTheDocument();
    });
  });

  test("marks PM routine as completed when button is clicked", async () => {
    // Expect PM routine to be marked as completed when button is clicked
    render(<Profile />);

    // Mock pm rountine done
    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });
    const pmButton = screen.getAllByText("Mark as Done")[1];
    fireEvent.click(pmButton);

    expect(markRoutineCompleted).toHaveBeenCalledWith("pm");

    // Mock the update
    getRoutineCheckInStatus.mockResolvedValue({
      lastResetDate: "2024-05-15",
      amCompleted: false,
      pmCompleted: true,
    });

    // Verify result
    await waitFor(() => {
      expect(screen.getAllByText(/Pending/, { exact: false })).toHaveLength(1);
      expect(
        screen.getByText(/Completed/, { exact: false }),
      ).toBeInTheDocument();
    });
  });

  test("handles errors when marking routine as completed", async () => {
    // Expect error to be logged
    // Mock console.error
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    // Mock the markRoutineCompleted to throw an error
    markRoutineCompleted.mockRejectedValue(new Error("Failed to mark routine"));

    render(<Profile />);

    // Mock routine as done
    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });
    const amButton = screen.getAllByText("Mark as Done")[0];
    fireEvent.click(amButton);

    // Verify error was logged
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error marking routine as completed:",
        expect.any(Error),
      );
    });

    consoleErrorSpy.mockRestore();
  });
});
