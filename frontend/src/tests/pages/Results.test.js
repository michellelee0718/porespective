import { render, waitFor, act, screen, fireEvent } from "@testing-library/react"
import { BrowserRouter } from "react-router-dom"
import Results from "../../pages/Results"
import { auth, db } from "../../firebase-config"
import { doc, getDoc } from "firebase/firestore"

global.ReadableStream = require("stream/web").ReadableStream

global.fetch = jest.fn()
global.TextDecoder = require("util").TextDecoder
global.TextEncoder = require("util").TextEncoder

jest.mock("../../firebase-config", () => ({
  auth: { currentUser: { uid: "testUserId" } },
  db: {},
}))

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}))

// Helper function to create mock streaming response
const createMockStream = chunks => {
  let index = 0
  return new ReadableStream({
    start(controller) {
      chunks.forEach(chunk => {
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ content: chunk })}\n\n`,
          ),
        )
      })
      controller.close()
    },
  })
}

describe("fetchRecommendation function", () => {
  beforeEach(() => {
    fetch.mockClear()
    getDoc.mockClear()
  })

  it("fetches user profile successfully when authenticated user exists", async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ age: 25 }),
    })

    await act(async () => {
      render(
        <BrowserRouter>
          <Results />
        </BrowserRouter>,
      )
    })

    const component = screen.getByText("Ask AI for Recommendation")
    act(() => {
      component.click()
    })

    await waitFor(() => expect(getDoc).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  })

  it("handles missing user profile in Firestore gracefully", async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false })

    await act(async () => {
      render(
        <BrowserRouter>
          <Results />
        </BrowserRouter>,
      )
    })

    const component = screen.getByText("Ask AI for Recommendation")
    act(() => {
      component.click()
    })

    await waitFor(() => expect(getDoc).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  })

  it("handles Firestore errors gracefully", async () => {
    getDoc.mockRejectedValueOnce(new Error("Firestore error"))

    await act(async () => {
      render(
        <BrowserRouter>
          <Results />
        </BrowserRouter>,
      )
    })

    const component = screen.getByText("Ask AI for Recommendation")
    act(() => {
      component.click()
    })

    await waitFor(() => expect(getDoc).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  })

  it("handles missing authenticated user gracefully", async () => {
    auth.currentUser = null

    await act(async () => {
      render(
        <BrowserRouter>
          <Results />
        </BrowserRouter>,
      )
    })

    const component = screen.getByText("Ask AI for Recommendation")
    act(() => {
      component.click()
    })

    await waitFor(() => expect(getDoc).not.toHaveBeenCalled())
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  })
})

// New test suite for streaming functionality
describe("Streaming functionality", () => {
  beforeEach(() => {
    fetch.mockClear()
    getDoc.mockClear()
    auth.currentUser = { uid: "testUserId" }
  })

  it("handles streaming recommendation response", async () => {
    const mockChunks = ["Hello", ", this", " is a", " streaming", " response"]
    const mockStream = createMockStream(mockChunks)

    fetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({
        "Content-Type": "text/event-stream",
        "X-Session-Id": "test-session-id",
      }),
      body: mockStream,
    })

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ age: 25 }),
    })

    await act(async () => {
      render(
        <BrowserRouter>
          <Results />
        </BrowserRouter>,
      )
    })

    const askButton = screen.getByText("Ask AI for Recommendation")
    await act(async () => {
      askButton.click()
    })

    // Wait for the complete streamed response
    await waitFor(() => {
      const fullResponse = mockChunks.join("")
      const messages = screen.getAllByText(fullResponse)
      expect(messages.length).toBeGreaterThan(0)
    })
  })

  it("handles streaming chat response", async () => {
    const mockRecommendChunks = ["Initial recommendation"]
    const mockChatChunks = ["Chat", " response", " stream"]

    // Mock initial recommendation
    fetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({
        "Content-Type": "text/event-stream",
        "X-Session-Id": "test-session-id",
      }),
      body: createMockStream(mockRecommendChunks),
    })

    // Mock chat response
    fetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({
        "Content-Type": "text/event-stream",
        "X-Session-Id": "test-session-id",
      }),
      body: createMockStream(mockChatChunks),
    })

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ age: 25 }),
    })

    await act(async () => {
      render(
        <BrowserRouter>
          <Results />
        </BrowserRouter>,
      )
    })

    // Trigger initial recommendation
    const askButton = screen.getByText("Ask AI for Recommendation")
    await act(async () => {
      askButton.click()
    })

    // Wait for initial recommendation
    await waitFor(() => {
      expect(screen.getByText(mockRecommendChunks[0])).toBeInTheDocument()
    })

    // Send chat message
    const input = screen.getByPlaceholderText("Type your follow-up question...")
    const sendButton = screen.getByText("Send")

    await act(async () => {
      fireEvent.change(input, { target: { value: "Is this product safe?" } })
      fireEvent.click(sendButton)
    })

    // Wait for chat response
    await waitFor(() => {
      const fullChatResponse = mockChatChunks.join("")
      expect(screen.getByText(fullChatResponse)).toBeInTheDocument()
    })
  })

  it("handles streaming errors gracefully", async () => {
    fetch.mockRejectedValueOnce(new Error("Network error"))

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ age: 25 }),
    })

    await act(async () => {
      render(
        <BrowserRouter>
          <Results />
        </BrowserRouter>,
      )
    })

    const askButton = screen.getByText("Ask AI for Recommendation")
    await act(async () => {
      askButton.click()
    })

    await waitFor(() => {
      expect(
        screen.getByText("Failed to fetch recommendation."),
      ).toBeInTheDocument();
    });
  });
});
describe("fetchIngredientSummary function", () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorage.clear();
  });

  it("fetches ingredient summary successfully and updates state", async () => {
    const mockSummary = ["Hydrating", "Anti-inflammatory", "Brightening"];

    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ summary: mockSummary }),
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <Results />
        </BrowserRouter>,
      );
    });

    const summaryButton = screen.getByText("Get Ingredient Summary");
    await act(async () => {
      fireEvent.click(summaryButton);
    });

    await waitFor(() => {
      mockSummary.forEach((word) => {
        expect(screen.getByText(word)).toBeInTheDocument();
      });
    });

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("uses cached ingredient summary from localStorage if available", async () => {
    const cachedSummary = ["Antioxidant", "Exfoliating"];
    localStorage.setItem(JSON.stringify([]), JSON.stringify(cachedSummary));

    await act(async () => {
      render(
        <BrowserRouter>
          <Results />
        </BrowserRouter>,
      );
    });

    const summaryButton = screen.getByText("Get Ingredient Summary");
    await act(async () => {
      fireEvent.click(summaryButton);
    });

    await waitFor(() => {
      cachedSummary.forEach((word) => {
        expect(screen.getByText(word)).toBeInTheDocument();
      });
    });

    expect(fetch).not.toHaveBeenCalled(); // Should not fetch when using cache
  });

  it("handles API errors gracefully", async () => {
    fetch.mockRejectedValueOnce(new Error("Network error"));

    await act(async () => {
      render(
        <BrowserRouter>
          <Results />
        </BrowserRouter>,
      );
    });

    const summaryButton = screen.getByText("Get Ingredient Summary");
    await act(async () => {
      fireEvent.click(summaryButton);
    });

    await waitFor(() => {
      expect(
        screen.queryByText("Loading AI Summary of Key Words..."),
      ).not.toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Key Words")).not.toBeInTheDocument(); // Should not display summary
  });

  it("sets loading state correctly", async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ summary: ["Soothing"] }),
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <Results />
        </BrowserRouter>,
      );
    });

    const summaryButton = screen.getByText("Get Ingredient Summary");
    act(() => {
      fireEvent.click(summaryButton);
    });

    expect(
      screen.getByText("Loading AI Summary of Key Words..."),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.queryByText("Loading AI Summary of Key Words..."),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Soothing")).toBeInTheDocument();
    });
  });

  it("fetches and updates UI correctly after multiple clicks", async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ summary: ["Moisturizing"] }),
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <Results />
        </BrowserRouter>,
      );
    });

    const summaryButton = screen.getByText("Get Ingredient Summary");

    await act(async () => {
      fireEvent.click(summaryButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Moisturizing")).toBeInTheDocument();
    });

    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ summary: ["Moisturizing"] }),
    });

    await act(async () => {
      fireEvent.click(summaryButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Moisturizing")).toBeInTheDocument();
    });
  });
});
