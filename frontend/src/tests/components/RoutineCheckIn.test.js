import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Profile from "../../pages/Profile";
import { ThemeProvider } from "../../context/ThemeContext";

jest.mock("../../firebase/routineService");
jest.mock("firebase/firestore");
jest.mock("../../firebase-config", () => ({
  auth: {
    currentUser: { uid: "test-user-id", displayName: "Test User" },
  },
  db: {},
}));

import {
  initDailyCheckIn,
  markRoutineCompleted,
  getRoutineCheckInStatus,
} from "../../firebase/routineService";
import { getDoc } from "firebase/firestore";

describe("RoutineCheckIn UI", () => {
  beforeEach(() => {
    // Reset
    jest.clearAllMocks();

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

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        fullName: "Test User",
        skincareRoutine: {
          am: "8:00",
          pm: "20:00",
        },
      }),
    });
  });

  test("renders correctly in light mode", async () => {
    // Expect correct UI in light mode
    render(
      <ThemeProvider>
        <Profile />
      </ThemeProvider>,
    );

    // Verify result
    await screen.findByText("Today's Skincare Routine");
    const container = screen
      .getByText("Today's Skincare Routine")
      .closest(".routine-checkin-container");
    expect(container).toBeInTheDocument();

    const morningCard = screen
      .getByText("Morning Routine")
      .closest(".routine-card");
    const eveningCard = screen
      .getByText("Evening Routine")
      .closest(".routine-card");

    expect(morningCard).toBeInTheDocument();
    expect(eveningCard).toBeInTheDocument();

    const buttons = screen.getAllByText("Mark as Done");
    expect(buttons[0]).toHaveClass("checkin-button");
    expect(buttons[1]).toHaveClass("checkin-button");
  });

  test("disables button when routine time is not set", async () => {
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
    });

    render(
      <ThemeProvider>
        <Profile />
      </ThemeProvider>,
    );

    await screen.findByText("Today's Skincare Routine");
    const buttons = screen.getAllByText("Mark as Done");
    // Verify result
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();
  });

  test("correctly displays completed status", async () => {
    // Expect completed status for AM routine
    // Mock a completed morning routine
    getRoutineCheckInStatus.mockResolvedValue({
      lastResetDate: "2024-05-15",
      amCompleted: true,
      pmCompleted: false,
    });

    render(
      <ThemeProvider>
        <Profile />
      </ThemeProvider>,
    );

    await screen.findByText("Today's Skincare Routine");

    // Verify result
    expect(screen.getByText(/Completed/, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/Pending/, { exact: false })).toBeInTheDocument();
    const buttons = screen.getAllByText("Mark as Done");
    expect(buttons.length).toBe(1);
  });

  test("correctly displays both routines completed", async () => {
    // Expect both routines completed
    // Mock both routines completed
    getRoutineCheckInStatus.mockResolvedValue({
      lastResetDate: "2024-05-15",
      amCompleted: true,
      pmCompleted: true,
    });

    render(
      <ThemeProvider>
        <Profile />
      </ThemeProvider>,
    );

    await screen.findByText("Today's Skincare Routine");
    const completedTexts = screen.getAllByText(/Completed/, { exact: false });

    // Verify result
    expect(completedTexts.length).toBe(2);
    const buttons = screen.queryAllByText("Mark as Done");
    expect(buttons.length).toBe(0);
  });
});
