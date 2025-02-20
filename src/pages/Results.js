import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "./Results.css";

const Results = () => {
  const location = useLocation();
  const { productName, ingredients, productUrl } = location.state || { productName: "Unknown Product", ingredients: [], productUrl: "#" };

  const [recommendation, setRecommendation] = useState("Loading recommendation...");

  useEffect(() => {
    const fetchRecommendation = async () => {
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
        }
      } catch (error) {
        setRecommendation("Failed to fetch recommendation.");
      }
    };
    fetchRecommendation();
  }, [productName]);

  return (
    <div className="results-container">
            {/* Product Name - Now Styled as a Title */}
      <h1 className="product-name">
        <a href={productUrl} target="_blank" rel="noopener noreferrer">
          {productName}
        </a>
      </h1>


      {/* Ingredient List Title */}
      <h2 className="ingredient-title">Ingredient List</h2>

      {/* Ingredients Table */}
      <ul className="ingredient-list">
        {ingredients.map((item, index) => (
          <li key={index} className={`ingredient-item score-${item.score}`}>
            {item.name} - <strong>Score: {parseInt(item.score, 10)}</strong>
          </li>
        ))}
      </ul>

      <h2 className="recommendation-title">AI Recommendation</h2>
      <div className="recommendation-box">
        <pre>{recommendation}</pre> {}
      </div>
    </div>
  );
};

export default Results;
