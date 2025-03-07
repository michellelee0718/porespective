import { render, waitFor, act, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Results from "../../pages/Results";
import { auth, db } from "../../firebase-config";
import { doc, getDoc } from "firebase/firestore";

global.ReadableStream = require("stream/web").ReadableStream;

global.fetch = jest.fn();
global.TextDecoder = require("util").TextDecoder;
global.TextEncoder = require("util").TextEncoder;

jest.mock("../../firebase-config", () => ({
  auth: { currentUser: { uid: "testUserId" } },
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

describe("fetchRecommendation function", () => {
  it("fetches user profile successfully when authenticated user exists", async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ age: 25 }),
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <Results />
        </BrowserRouter>,
      );
    });

    const component = screen.getByText("Ask AI for Recommendation");
    act(() => {
      component.click();
    });

    await waitFor(() => expect(getDoc).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });

  it("handles missing user profile in Firestore gracefully", async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false });

    await act(async () => {
      render(
        <BrowserRouter>
          <Results />
        </BrowserRouter>,
      );
    });

    const component = screen.getByText("Ask AI for Recommendation");
    act(() => {
      component.click();
    });

    await waitFor(() => expect(getDoc).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });

  it("handles Firestore errors gracefully", async () => {
    getDoc.mockRejectedValueOnce(new Error("Firestore error"));

    await act(async () => {
      render(
        <BrowserRouter>
          <Results />
        </BrowserRouter>,
      );
    });

    const component = screen.getByText("Ask AI for Recommendation");
    act(() => {
      component.click();
    });

    await waitFor(() => expect(getDoc).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });

  it("handles missing authenticated user gracefully", async () => {
    auth.currentUser = null;

    await act(async () => {
      render(
        <BrowserRouter>
          <Results />
        </BrowserRouter>,
      );
    });

    const component = screen.getByText("Ask AI for Recommendation");
    act(() => {
      component.click();
    });

    await waitFor(() => expect(getDoc).not.toHaveBeenCalled());
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });
});
