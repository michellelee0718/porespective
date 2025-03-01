from flask import Flask, request, jsonify
from flask_cors import CORS
from backend.scraper import scrape_product_ingredients
from backend.model import get_llm_chain
from backend.utils import generate_session_id, get_or_create_conversation

app = Flask(__name__)
CORS(app)
# Store of active conversations: {session_id -> conversation chain}
conversation_store = {}

@app.route("/get_ingredients", methods=["GET"])
def get_ingredients():
    """
    Retrieve ingredient information for a given skincare product.

    Query Parameters:
            product (str): The name of the skincare product to look up.

    Returns:
            JSON: A JSON response containing the product's name, URL, and a list of ingredients with their safety scores.
                If the product name is missing, returns a 400 error.
                If the product is not found, returns an empty result.

    Description:
            Calls the `scrape_product_ingredients` function to retrieve product details from the EWG Skin Deep database.
            If no product name is provided, returns a JSON error response.
            If scraping fails or no product is found, the response contains a default product name.

    Response Format:
        ```
        {
            "product_name": "CeraVe Moisturizing Cream",
            "product_url": "https://www.ewg.org/skindeep/products/123456-CeraVe_Moisturizing_Cream/",
            "ingredients": [
                { "name": "Water", "score": "1" },
                { "name": "Fragrance", "score": "8" }
            ]
        }
        ```
    Example Request:
            GET /get_ingredients?product=CeraVe%20Moisturizing%20Cream

    Example Response:
        ```json
        {
            "product_name": "CeraVe Moisturizing Cream",
            "product_url": "https://www.ewg.org/skindeep/products/123456-CeraVe_Moisturizing_Cream/",
            "ingredients": [
                { "name": "Water", "score": "1" },
                { "name": "Fragrance", "score": "8" }
            ]
        }
        ```
    """
    product_name = request.args.get("product")

    if not product_name:
        return jsonify({"error": "Missing product name"}), 400

    result = scrape_product_ingredients(product_name)

    if "product_name" not in result or not result["product_name"]:
        result["product_name"] = product_name  # Default to query if actual name not found

    return jsonify(result)

@app.route("/recommend", methods=["POST"])
def recommend_product():
    """
    Get AI-based recommendations based on product ingredients, and initialize a conversation
    session for follow-up Q&A if desired.

    Args:
        None: Expects JSON input with the following fields:
            - `product_name` (str): The name of the product.
            - `ingredients` (list of dicts): A list of ingredient objects, each containing:
                - `name` (str): Ingredient name.
                - `score` (int): Hazard score (1-10).
            - `session_id` (str, optional): A unique identifier for maintaining conversation context.
              If omitted, a new session_id is generated.

    Returns:
        dict: A JSON object containing:
            - `session_id` (str): The session identifier for follow-up questions.
            - `product_name` (str): The name of the product.
            - `recommendation` (str): The AI-generated recommendation.
            - `product_url` (str): An EWG Skin Deep URL for additional product research.

    Description:
        This endpoint sends the product's name and ingredient list to an LLM (Large Language Model)
        for an initial recommendation about the product's safety and potential concerns.

        - If a `session_id` is provided, the existing conversation chain associated with that session
          will be retrieved and updated with this initial recommendation step.
        - If a `session_id` is not provided, a new conversation chain will be created, and the server
          will return the new `session_id`.
        - The conversation chain memory is stored on the server side, enabling follow-up questions
          via the `/chat` endpoint, where the LLM will recall the context of this recommendation.

        Expected output format:
        ```json
        {
            "session_id": "<unique_session_id>",
            "product_name": "<product_name>",
            "recommendation": "<AI-generated recommendation>",
            "product_url": "https://www.ewg.org/skindeep/search/?search=<product_name>"
        }
        ```

    Example:
        >>> curl -X POST "http://localhost:5000/recommend" \
                 -H "Content-Type: application/json" \
                 -d '{
                       "product_name": "Product_1", 
                       "ingredients": [
                         {"name": "Ingredient A", "score": 1}, 
                         {"name": "Ingredient B", "score": 7}
                       ]
                     }'
        {
            "session_id": "abc123DEF",
            "product_name": "Product_1",
            "recommendation": "This product contains Ingredient B, which has a high hazard score. Consider using a safer alternative.",
            "product_url": "https://www.ewg.org/skindeep/search/?search=Product_1"
        }
    """
    data = request.json
    product_name = data.get("product_name")
    ingredients = data.get("ingredients")
    session_id = data.get("session_id")

    if not product_name:
        return jsonify({"error": "Missing product_name"}), 400
    if not ingredients or not isinstance(ingredients, list):
        return jsonify({"error": "Missing or invalid ingredients"}), 400

    # If client didn't provide a session_id, generate one automatically
    if not session_id:
        session_id = generate_session_id()

    # Format the ingredients for the LLM
    ingredient_details = "\n".join(
        [f"{i['name']} (Hazard Score: {i['score']})" for i in ingredients]
    )

    # Explain hazard ratings to the LLM
    explanation = (
        "The hazard score represents the potential risk level of the ingredient. "
        "A lower score (1-2) means it's considered low risk, 3-6 indicates moderate risk, "
        "and 7-10 suggests a higher hazard potential. Please analyze the safety of the product based on these scores."
    )

    llm_input = f"Product Name: {product_name}\nIngredients:\n{ingredient_details}\n\n{explanation}"

    print("\n=== LLM Input ===")
    print(llm_input)
    print("=================\n")

    try:
        llm_chain = get_llm_chain()
        ai_response = llm_chain.invoke({"input": llm_input})

        # Ensure response is extracted properly
        if isinstance(ai_response, dict) and "text" in ai_response:
            ai_response = ai_response["text"]
        ai_response = ai_response.strip()
        
        # Add the recommendation to the conversation memory,
        conversation_chain = get_or_create_conversation(conversation_store, session_id)

        # Add the user request and the AI response to the conversation memory
        conversation_chain.memory.save_context(
            {"input": llm_input},
            {"output": ai_response}
        )

        return jsonify({
            "session_id": session_id,
            "product_name": product_name,
            "recommendation": ai_response,
            "product_url": f"https://www.ewg.org/skindeep/search/?search={product_name.replace(' ', '%20')}"
        })

    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Failed to generate recommendation"}), 500


@app.route("/chat", methods=["POST"])
def chat():
    """
    Handle user follow-up questions for an ongoing conversation.

    Args:
        None: Expects a JSON payload containing:
            - `session_id` (str): The unique identifier for the current conversation session.
            - `message` (str): The user's follow-up question or input.

    Returns:
        dict: A JSON object containing:
            - `response` (str): The AI's answer based on the conversation context so far.

    Description:
        This endpoint allows the user to ask follow-up questions after an initial
        product recommendation has been generated (via the `/recommend` endpoint).
        It leverages the conversation chain, which includes memory of previous 
        interactions (product data, initial recommendations, etc.), to provide context-aware
        answers.

        - If a conversation with the provided `session_id` does not exist, a new one is created.
          However, for continuity of context, it is expected that the session ID from a 
          `/recommend` response be reused here.
        - The conversation chain retains prior input-output pairs, enabling the AI to 
          reference earlier messages or details.
        - In case of any error (e.g., missing or invalid input), the endpoint returns a 
          JSON object with an `error` key.

    Example:
        >>> curl -X POST "http://localhost:5000/chat" \
                 -H "Content-Type: application/json" \
                 -d '{
                       "session_id": "abc123xyz",
                       "message": "What if I want a fragrance-free alternative?"
                     }'
        {
            "response": "You might look for a similar product that omits fragrance ingredients..."
        }
    """
    data = request.json
    session_id = data.get("session_id")
    user_message = data.get("message")

    if not session_id:
        return jsonify({"error": "Missing session_id"}), 400
    if not user_message:
        return jsonify({"error": "Missing user message"}), 400

    # Retrieve or create the conversation chain
    conversation_chain = get_or_create_conversation(conversation_store, session_id)

    try:
        ai_response = conversation_chain.run(input=user_message)
        return jsonify({"response": ai_response})
    except Exception as e:
        print("Error in /chat:", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
