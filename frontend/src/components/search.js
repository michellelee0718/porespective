import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";


const Search = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!query.trim()) return;

    try {
      const response = await fetch(
        `http://127.0.0.1:5000/get_ingredients?product=${encodeURIComponent(
          query,
        )}`,
      );
      const data = await response.json();

      if (data.ingredients) {
        navigate("/results", {
          state: {
            productName: data.product_name || query, // Use actual product name from server
            ingredients: data.ingredients,
            productUrl: data.product_url, // Pass product URL as well
          },
        });
      } else {
        navigate("/results", {
          state: {
            productName: data.product_name || query,
            ingredients: [{ name: "No data found", score: "N/A" }],
            productUrl: data.product_url,
          },
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      navigate("/results", {
        state: {
          productName: query,
          ingredients: [{ name: "Error fetching data", score: "N/A" }],
          productUrl: "",
        },
      });
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch}>
        <div className="search-input">
          <input className="search-bar"
            type="text"
            placeholder="Enter product name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit">
            <i className="fa-solid fa-magnifying-glass"></i>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Search;
