import hashlib
import json

from flask import Flask, Response, jsonify, request, stream_with_context
from flask_cors import CORS

from backend.model import get_ingredient_summary_chain, get_llm
from backend.prompt import prompt_template_followup, prompt_template_recommendation
from backend.scraper import scrape_product_ingredients
from backend.utils import generate_session_id, get_or_create_conversation

app = Flask(__name__)
CORS(
    app,
    expose_headers=["X-Session-Id"],
    supports_credentials=True,
    resources={
        r"/*": {
            "origins": ["http://localhost:3000"],
            "allow_headers": ["Content-Type"],
            "methods": ["POST", "OPTIONS", "GET"],
        }
    },
)
# Store of active conversations: {session_id -> conversation chain}
conversation_store = {}
# In-memory cache for AI-generated summaries
ingredient_summary_cache = {}


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
        result["product_name"] = (
            product_name  # Default to query if actual name not found
        )

    return jsonify(result)


def get_formatted_ingredients(data: dict):
    """
    Format skincare ingredient details for AI processing.

    Args:
        data (dict): JSON input containing the following fields:
            - ingredients (list of dicts): A list of ingredient objects, where each object includes:
                - name (str): The name of the ingredient.
                - score (int): The hazard score of the ingredient (1-10).
                - concerns(str): The concerns of the ingredient.

    Returns:
        str: A formatted string where each ingredient is displayed with its name and hazard score.

        Example:
        ```
        "Hyaluronic Acid (Hazard Score: 1)\nFragrance (Hazard Score: 8)\nSalicylic Acid (Hazard Score: 4)"
        ```

        OR

        Response: A JSON error response if the input is invalid.

    Errors:
        - If the `ingredients` key is missing, returns:
            ```
            { "error": "Missing ingredients" }, 400
            ```
        - If `ingredients` is not a list, returns:
            ```
            { "error": "Invalid ingredients (Should be a list)" }, 400
            ```

    Description:
        This function validates and formats a list of skincare ingredients into a structured
        string format.
    """
    data = request.json
    ingredients = data.get("ingredients")

    if not ingredients:
        return jsonify({"error": "Missing ingredients"}), 400
    if not isinstance(ingredients, list):
        return jsonify({"error": "Invalid ingredients (Should be a list)"}), 400

    for i in ingredients:
        if "name" not in i:
            return jsonify({"error": "Ingredient missing 'name' field"}), 400
        if "score" not in i:
            return (
                jsonify({"error": f"Ingredient '{i['name']}' missing 'score' field"}),
                400,
            )
        if "concerns" not in i or not isinstance(i["concerns"], list):
            return (
                jsonify(
                    {
                        "error": f"Ingredient '{i['name']}' missing 'concerns' field or the 'concern' field is not a list"
                    }
                ),
                400,
            )

    ingredient_details = "\n".join(
        [f"{i['name']} (Hazard Score: {i['score']})" for i in ingredients]
    )

    return ingredient_details


@app.route("/ingredient-summary", methods=["POST"])
def ingredient_summary():
    """
    Generate an AI-powered summary of skincare ingredient benefits.

    Args:
        None: Expects a JSON input with the following field:
            - ingredients (list of dicts): A list of ingredient objects, where each object contains:
                - name (str): The name of the ingredient.
                - score (int): The hazard score of the ingredient (1-10).
                - concerns(str): The concerns of the ingredient.

    Returns:
        dict: A JSON object containing:
            - summary (list of str): A list of up to 5 keywords summarizing the main skincare benefits of the ingredients.

        Example Success Response:
        ```json
        {
            "summary": ["Hydrating", "Soothing", "Brightening", "Antioxidant", "Exfoliating"]
        }
        ```

        Example Empty Response (No valid ingredients):
        ```json
        {
            "summary": []
        }
        ```

    Errors:
        - If `ingredients` is missing or is not a list:
            ```json
            { "error": "Invalid ingredients (Should be a list)" }, 400
            ```
        - If an internal server error occurs:
            ```json
            { "error": "Internal Server Error" }, 500
            ```

    Description:
        This API endpoint receives a list of skincare ingredients and their hazard scores,
        formats them into a structured text format, and then invokes a language model (LLM)
        to generate a concise summary of key skincare benefits. The response is a list of up to
        5 keywords highlighting the main properties of the ingredients.

        The AI is prompted to return a **valid JSON list** containing only relevant benefits
        such as **"Hydrating"**, **"Brightening"**, **"Exfoliating"**, etc.
    """
    try:
        data = request.json
        ingredients = data.get("ingredients", [])

        if not isinstance(ingredients, list):
            return jsonify({"error": "Invalid ingredients (Should be a list)"}), 400

        if not ingredients:
            return jsonify({"summary": []})  # Return empty list if no valid ingredients

        # Generate a hash key based on ingredient names and scores
        ingredients_key = hashlib.md5(
            json.dumps(ingredients, sort_keys=True).encode()
        ).hexdigest()

        # Check cache first
        if ingredients_key in ingredient_summary_cache:
            print("Using cached summary")
            return jsonify({"summary": ingredient_summary_cache[ingredients_key]})

        ingredient_details = get_formatted_ingredients({"ingredients": ingredients})

        llm_input = (
            f"Skincare Ingredients:\n{ingredient_details}\n\n"
            "Generate a **list** (max 5 words) of key skincare benefits. Return only a JSON list."
        )

        llm_chain = get_ingredient_summary_chain()
        response = llm_chain.invoke({"ingredients": llm_input})

        try:
            summary_list = json.loads(response["text"].strip())
            if isinstance(summary_list, list):
                summary_list = summary_list[:5]  # Ensure max 5 words
                ingredient_summary_cache[ingredients_key] = (
                    summary_list  # Store in cache
                )
                return jsonify({"summary": summary_list})
            else:
                return jsonify({"summary": []})  # Return empty if not a valid list
        except json.JSONDecodeError:
            return jsonify({"summary": []})  # Handle JSON parsing errors

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def stream_recommend(llm_input: str, session_id: str):
    """
    Stream AI-generated recommendations based on product details and user profile.

    Args:
        llm_input (str): Formatted input string containing product name, ingredients, and user profile.
        session_id (str): Unique session identifier for conversation context tracking.

    Yields:
        Streaming JSON chunks containing the AI's response.

    Description:
        - Feeds prompt and input into the LLM and streams the response.
        - Saves the full response to conversation memory for follow-up questions.
    """
    llm = get_llm()

    # Add the prompt to the LLM input
    llm_input = prompt_template_recommendation.format(input=llm_input)  # Add prompt

    full_response = ""

    try:
        for chunk in llm.stream(llm_input):
            if isinstance(chunk, str):
                content = chunk
            else:
                content = chunk.content if hasattr(chunk, "content") else str(chunk)

            print(f"Streaming chunk: {content}")  # Debug log
            full_response += content
            yield f"data: {json.dumps({'content': content})}\n\n"

        # Save to conversation memory after complete
        conversation_chain = get_or_create_conversation(conversation_store, session_id)
        conversation_chain.memory.save_context(
            {"input": llm_input}, {"output": full_response}
        )
    except Exception as e:
        print("Error during streaming:", str(e))
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


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
                - `concerns` (str): Concerns for the ingredient.
            - `session_id` (str, optional): A unique identifier for maintaining conversation context.
              If omitted, a new session_id is generated.
            - `user_profile` (dict): The user's profile.

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
    session_id = data.get("session_id")
    user_profile = data.get(
        "user_profile"
    )  # Get user profile information for customized recommendation

    if not product_name:
        return jsonify({"error": "Missing product_name"}), 400
    if not user_profile:
        return jsonify({"error": "Missing user profile"}), 400

    ingredient_details = get_formatted_ingredients(data)

    # If client didn't provide a session_id, generate one automatically
    if not session_id:
        session_id = generate_session_id()

    profile_details = (
        f"User Profile:\n"
        f"- Skin Type: {user_profile.get('skinType', 'Unknown')}\n"
        f"- Skin Concerns: {user_profile.get('skinConcerns', 'None')}\n"
        f"- Allergies: {user_profile.get('allergies', 'None')}\n"
    )

    # Explain hazard ratings to the LLM
    explanation = (
        "The hazard score represents the potential risk level of the ingredient. "
        "A lower score (1-2) means it's considered low risk, 3-6 indicates moderate risk, "
        "and 7-10 suggests a higher hazard potential. "
        "Please analyze the safety of the product based on these scores along with the concerns for the ingredients. "
        "In addition, use user's skin type, skin concerns, and allergies while making recommendations."
    )

    llm_input = f"Product Name: {product_name}\nIngredients:\n{ingredient_details}\n\n{profile_details}\n\n{explanation}"
    return Response(
        stream_with_context(stream_recommend(llm_input, session_id)),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Session-Id": session_id},
    )


def stream_chat(user_message: str, session_id: str):
    """
    Stream AI-generated responses for user follow-up questions.

    Args:
        user_message (str): User's query.
        session_id (str): Unique session identifier for conversation context tracking.

    Yields:
        Streaming JSON chunks with AI responses.

    Description:
        - Retrieves or initializes a conversation chain.
        - Streams response using `prompt_template_followup`.
        - Saves conversation context for future queries.
    """
    try:
        # Get the conversation chain
        conversation_chain = get_or_create_conversation(conversation_store, session_id)
        print(f"Retrieved conversation chain: {conversation_chain}")
        full_response = ""

        print("Starting stream processing...")
        for chunk in conversation_chain.llm.stream(
            prompt_template_followup.format(
                history=conversation_chain.memory.buffer, input=user_message
            )
        ):
            if isinstance(chunk, str):
                content = chunk
            else:
                content = chunk.content if hasattr(chunk, "content") else str(chunk)

            print(f"Processing chunk: {content}")
            full_response += content
            yield f"data: {json.dumps({'content': content})}\n\n"

        # Save to conversation memory after complete
        conversation_chain.memory.save_context(
            {"input": user_message}, {"output": full_response}
        )

    except Exception as e:
        print(f"Error during streaming: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback

        print(f"Traceback: {traceback.format_exc()}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


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

    print("\n=== Chat Endpoint Debug ===")
    print(f"Received data: {data}")
    print(f"Session ID: {session_id}")
    print(f"User message: {user_message}")
    print(f"Active conversations: {list(conversation_store.keys())}")
    print(f"Conversation store content: {conversation_store}")

    if not session_id:
        print("Error: No session ID provided")
        return jsonify({"error": "Missing session_id"}), 400
    if not user_message:
        print("Error: No user message provided")
        return jsonify({"error": "Missing user message"}), 400

    return Response(
        stream_with_context(
            stream_chat(user_message=user_message, session_id=session_id)
        ),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Session-Id": session_id},
    )


if __name__ == "__main__":
    app.run(debug=True, port=5000)
