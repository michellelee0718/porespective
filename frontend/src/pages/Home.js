import React, { useState } from "react"
import { auth } from "../firebase-config"
import { useAuthState } from "react-firebase-hooks/auth"
import Form from "../components/search"

function Home() {
  const [searchKeyword, setSearchKeyword] = useState("")

  return (
    <div className="homePage">
      <h1>Porespective</h1>
      <div>
        <h2>at UCLA</h2>
      </div>

      <div className="search-bar">
        <Form
          placeHolder="Search for a product"
          isSearching={event => setSearchKeyword(event.target.value)}
        />
      </div>

      {/* <div className="featured-products-label">
        <label>Featured Products:</label>
      </div> */}
    </div>
  )
}

export default Home
