import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import "./Results.css";

const Results = () => {
  const location = useLocation();
  const { productName, ingredients, productUrl } = location.state || { productName: "Unknown Product", ingredients: [], productUrl: "#" };

  const [recommendation, setRecommendation] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const fetchRecommendation = async () => {
    console.log('fetch recommendation')
    setIsLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:5000/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          product_name: productName,
          ingredients: ingredients
        })
      });
  
      const data = await response.json();
      if (data.error) {
        setRecommendation(`Error: ${data.error}`);
      } else {
        setRecommendation(data.recommendation);
        setMessages(prevMessages => [
          ...prevMessages,
          { type: 'ai', content: data.recommendation }
        ]);
      }
    } catch (error) {
      setRecommendation("Failed to fetch recommendation.");
    }
    setIsLoading(false);
  };

  const handleAskAI = async () => {
    setIsChatOpen(true);
    setMessages(prevMessages => [
      ...prevMessages,
      { type: 'ai', content: `Hello! I'd be happy to analyze ${productName} for you.` }
    ]);
    
    if (!recommendation) {
      await fetchRecommendation();
    } else {
      setMessages(prevMessages => [
        ...prevMessages,
        { type: 'ai', content: recommendation }
      ]);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!userMessage.trim()) return;

    // Add user message to chat
    setMessages(prevMessages => [...prevMessages, { type: 'user', content: userMessage }]);
    
    // TODO: Send to backend and get AI response
    // For now, just add a mock response
    setIsLoading(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { type: 'ai', content: "I apologize, but I can only provide the initial analysis at this time. Follow-up questions feature is coming soon!" }]);
      setIsLoading(false);
    }, 1000);

    setUserMessage("");
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
    setMessages([]); // Optional: clear messages when closing
  };

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
            {item.name} - <strong>Score: {parseInt(item.score, 10)}</strong>
          </li>
        ))}
      </ul>

      <button 
        className="ask-ai-button" 
        onClick={handleAskAI}
      >
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
                  {message.type === 'ai' ? 'AI' : 'You'}
                </div>
                <div className="message-content">
                  {message.content}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="message ai-message">
                <div className="message-avatar">AI</div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSendMessage} className="chat-input-container">
            <input
              type="text"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
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
  );
};

export default Results;
