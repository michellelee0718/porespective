import React, { useState } from "react"
import { useLocation } from "react-router-dom"
import "./Results.css"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "../firebase-config"

const Results = () => {
  const location = useLocation()
  const { productName, ingredients, productUrl } = location.state || {
    productName: "Unknown Product",
    ingredients: [],
    productUrl: "#",
  }

  const [recommendation, setRecommendation] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [expandedConcerns, setExpandedConcerns] = useState({});
  const [ingredientSummary, setIngredientSummary] = useState([]); // Store as an array
  const [isSummaryLoading, setIsSummaryLoading] = useState(false); // Loading state for summary

  const fetchIngredientSummary = async () => {
    const cacheKey = JSON.stringify(ingredients); // Unique key based on ingredients

    // Check local storage cache
    const cachedSummary = localStorage.getItem(cacheKey);
    if (cachedSummary) {
      setIngredientSummary(JSON.parse(cachedSummary));
      return;
    }

    setIsSummaryLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:5000/ingredient-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ingredients }),
      });

      const data = await response.json();
      if (Array.isArray(data.summary)) {
        setIngredientSummary(data.summary);
        localStorage.setItem(cacheKey, JSON.stringify(data.summary)); // Cache it
      } else {
        setIngredientSummary([]);
      }
    } catch (error) {
      console.error("Error fetching ingredient summary:", error);
      setIngredientSummary([]);
    }
    setIsSummaryLoading(false);
  };

  const fetchRecommendation = async () => {
    console.log("Fetching user profile...")
    let userProfile = {}

    if (auth.currentUser) {
      try {
        const userRef = doc(db, "users", auth.currentUser.uid)
        const docSnap = await getDoc(userRef)

        if (docSnap.exists()) {
          userProfile = docSnap.data()
          console.log("Retrieved user profile from Firestore:", userProfile)
        } else {
          console.warn("User profile not found in Firestore.")
        }
      } catch (error) {
        console.error("Error fetching user profile from Firestore:", error)
      }
    } else {
      console.warn("No authenticated user found.")
    }

    console.log("Final User Profile sent to backend:", userProfile)

    console.log("Fetching recommendation...")
    setIsLoading(true)
    try {
      const response = await fetch("http://127.0.0.1:5000/recommend", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          product_name: productName,
          ingredients: ingredients,
          user_profile: userProfile,
        }),
      })

      const receivedSessionId = response.headers.get("X-Session-Id")

      // Set the session ID immediately when we receive it
      if (receivedSessionId) {
        setSessionId(receivedSessionId)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ""

      // Add initial AI message
      setMessages(prevMessages => [
        ...prevMessages,
        { type: "ai", content: "", isStreaming: true },
      ])

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const text = decoder.decode(value)

        const lines = text.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.content) {
                fullResponse += data.content

                setMessages(prevMessages => {
                  const lastMessage = prevMessages[prevMessages.length - 1]
                  if (lastMessage && lastMessage.isStreaming) {
                    return [
                      ...prevMessages.slice(0, -1),
                      { ...lastMessage, content: fullResponse },
                    ]
                  }
                  return prevMessages
                })
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e)
              console.error("Problematic line:", line)
            }
          }
        }
      }

      // Final update to remove streaming flag
      setMessages(prevMessages => {
        const lastMessage = prevMessages[prevMessages.length - 1]
        if (lastMessage && lastMessage.isStreaming) {
          return [
            ...prevMessages.slice(0, -1),
            { ...lastMessage, content: fullResponse, isStreaming: false },
          ]
        }
        return prevMessages
      })

      setRecommendation(fullResponse)
      setSessionId(receivedSessionId)
    } catch (error) {
      console.error("Error:", error)
      setMessages(prevMessages => [
        ...prevMessages,
        { type: "ai", content: "Failed to fetch recommendation." },
      ])
    }
    setIsLoading(false)
  }

  const handleAskAI = async () => {
    setIsChatOpen(true)
    setMessages(prevMessages => [
      ...prevMessages,
      {
        type: "ai",
        content: `Hello! I'd be happy to analyze ${productName} for you.`,
      },
    ])

    if (!recommendation) {
      await fetchRecommendation()
    } else {
      setMessages(prevMessages => [
        ...prevMessages,
        { type: "ai", content: recommendation },
      ])
    }
  }

  // Follow up questions
  const handleSendMessage = async e => {
    e.preventDefault()
    if (!userMessage.trim()) return

    // Add user message to chat
    setMessages(prevMessages => [
      ...prevMessages,
      { type: "user", content: userMessage },
    ])
    const currentMessage = userMessage
    setUserMessage("")
    setIsLoading(true)

    try {
      if (!sessionId) {
        console.log("No session ID found!")
        setMessages(prev => [
          ...prev,
          {
            type: "ai",
            content:
              "No session found. Please click 'Ask AI for Recommendation' first.",
          },
        ])
        setIsLoading(false)
        return
      }

      const response = await fetch("http://127.0.0.1:5000/chat", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: currentMessage,
        }),
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ""

      // Add initial AI message
      setMessages(prevMessages => [
        ...prevMessages,
        { type: "ai", content: "", isStreaming: true },
      ])

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.content) {
                fullResponse += data.content

                setMessages(prevMessages => {
                  const lastMessage = prevMessages[prevMessages.length - 1]
                  if (lastMessage && lastMessage.isStreaming) {
                    return [
                      ...prevMessages.slice(0, -1),
                      { ...lastMessage, content: fullResponse },
                    ]
                  }
                  return prevMessages
                })
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e)
            }
          }
        }
      }

      // Final update to remove streaming flag
      setMessages(prevMessages => {
        const lastMessage = prevMessages[prevMessages.length - 1]
        if (lastMessage && lastMessage.isStreaming) {
          return [
            ...prevMessages.slice(0, -1),
            { ...lastMessage, content: fullResponse, isStreaming: false },
          ]
        }
        return prevMessages
      })
    } catch (error) {
      console.error("Error during chat request:", error)
      setMessages(prev => [
        ...prev,
        { type: "ai", content: "An error occurred. Please try again." },
      ])
    }
    setIsLoading(false)
  }

  const handleCloseChat = () => {
    setIsChatOpen(false)
    // setMessages([]); // Optional: clear messages when closing
  }

  return (
    <div className="results-container">
      <h1 className="product-name">
        <a href={productUrl} target="_blank" rel="noopener noreferrer">
          {productName}
        </a>
      </h1>

      <h2 className="ingredient-title">Ingredient List</h2>
      <ul className="ingredient-list">
        {ingredients.map((item, index) => (
          <li key={index} className={`ingredient-item score-${item.score}`}>
            <div className="ingredient-header">
              {item.name} - <strong>Score: {parseInt(item.score, 10)}</strong>
              {item.concerns && item.concerns.length > 0 && (
                <button
                  className="toggle-concerns"
                  onClick={() =>
                    setExpandedConcerns(prevState => ({
                      ...prevState,
                      [index]: !prevState[index],
                    }))
                  }
                >
                  {expandedConcerns[index]
                    ? "▼ Hide Concerns"
                    : "▶ Show Concerns"}
                </button>
              )}
            </div>

            {/* Conditionally show concerns when expanded */}
            {expandedConcerns[index] && item.concerns.length > 0 && (
              <ul className="concerns-list">
                {item.concerns.map((concern, idx) => (
                  <li key={idx} className="concern-item">
                    {concern}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      <button className="summary-button" onClick={fetchIngredientSummary}>
        Get Ingredient Summary
      </button>

      {/* AI Summary Section */}
      {isSummaryLoading ? (
        <p>Loading AI Summary of Key Words...</p>
      ) : (
        ingredientSummary.length > 0 && (
          <div className="ingredient-summary">
            <h2>Key Words</h2>
            <ul className="summary-list">
              {ingredientSummary.map((word, index) => (
                <li key={index} className="summary-item">
                  {word}
                </li>
              ))}
            </ul>
          </div>
        )
      )}

      <button className="ask-ai-button" onClick={handleAskAI}>
        Ask AI for Recommendation
      </button>

      {isChatOpen && (
        <div className="chat-container">
          <div className="chat-header">
            <h3>AI Analysis</h3>
            <button onClick={handleCloseChat} className="chat-close-button">
              ×
            </button>
          </div>
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.type}-message`}>
                <div className="message-avatar">
                  {message.type === "ai" ? "AI" : "You"}
                </div>
                <div className="message-content">{message.content}</div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="chat-input-container">
            <input
              type="text"
              value={userMessage}
              onChange={e => setUserMessage(e.target.value)}
              placeholder="Type your follow-up question..."
              className="chat-input"
            />
            <button type="submit" className="chat-send-button">
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default Results
