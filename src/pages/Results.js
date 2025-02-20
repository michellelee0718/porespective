import React from "react";
import { useLocation } from "react-router-dom";
import "./Results.css"; 

const Results = () => {
  const location = useLocation();
  const { productName, ingredients, productUrl } = location.state || { productName: "Unknown Product", ingredients: [], productUrl: "#" };

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
    </div>
  );
};

export default Results;
