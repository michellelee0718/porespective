import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ThemeProvider } from "../../context/ThemeContext";
import ThemeToggle from "../../components/ThemeToggle";

describe("Theme Toggle Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
    // set initial time to be 12:00 p.m
    jest.setSystemTime(new Date("2025-01-01T12:00:00"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("initialize with auto mode and correct theme based on time", () => {
    // expect dark theme under auto mode with success
    jest.setSystemTime(new Date("2025-01-01T21:00:00"));

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const autoCheckbox = screen.getByLabelText("Auto");
    const themeToggle = screen.getByRole("checkbox", { name: "" });

    expect(autoCheckbox).toBeChecked();
    expect(themeToggle).toBeDisabled();
    // expect dark theme
    expect(themeToggle).toBeChecked();
  });

  test("toggle theme enabled when auto mode is disabled", () => {
    // expect successful toggle when auto mode is disabled
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const autoCheckbox = screen.getByLabelText("Auto");
    const themeToggle = screen.getByRole("checkbox", { name: "" });

    // disable auto mode
    fireEvent.click(autoCheckbox);
    // initial state is light mode
    expect(themeToggle).not.toBeChecked();
    expect(screen.getByText("Day")).toBeInTheDocument();
    // toggle to dark mode
    fireEvent.click(themeToggle);
    expect(themeToggle).toBeChecked();
    expect(screen.getByText("Night")).toBeInTheDocument();
  });

  test("should persist theme preferences in localStorage", () => {
    // expect the dark theme to be persisted in localStorage as we toggle
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const autoCheckbox = screen.getByLabelText("Auto");
    const themeToggle = screen.getByRole("checkbox", { name: "" });
    // disable auto mode
    fireEvent.click(autoCheckbox);
    expect(localStorage.getItem("autoMode")).toBe("false");
    // toggle to dark mode
    fireEvent.click(themeToggle);
    expect(localStorage.getItem("themeMode")).toBe("dark");
  });
});
