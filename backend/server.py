from flask import Flask, request, jsonify
from flask_cors import CORS
from backend.scraper import scrape_product_ingredients
from backend.model import get_llm_chain

app = Flask(__name__)
CORS(app)
llm_chain = get_llm_chain()


def fetch_product_data(product_name: str) -> str | None:
    """
    Fetch the product data using the scraper and format it for the LLM.

    Args:
        product_name (str): The name of the product.

    Returns:
        str | None: A string containing the product's name and ingredient list
                    if available, otherwise None.

    Description:
        Calls the `scrape_product_ingredients` to retrieve product details.
        If the product name is missing, it defaults to the input `product_name`.
        If ingredients are missing, it returns None.

        The output format is:
        ```
        Product Name: <product_name>
        Ingredients: <ingredient_1>, <ingredient_2>, ...
        ```

    Example:
        >>> fetch_product_data("Product A")
        'Product Name: Product A\nIngredients: Ingredient A, Ingredient B\n'
    """
    product_data = scrape_product_ingredients(product_name)

    if not product_data or "error" in product_data:
        return None

    # Ensure the product name exists
    if "product_name" not in product_data or not product_data["product_name"]:
        product_data["product_name"] = product_name  # Use input name as fallback

    # Ensure ingredients exist
    if "ingredients" not in product_data or not product_data["ingredients"]:
        return None  # If ingredients are missing, return None

    # Format product data string
    product_data_str = f"Product Name: {product_data['product_name']}\n"
    product_data_str += f"Ingredients: {', '.join([i.get('name', 'Unknown') for i in product_data['ingredients']])}\n"

    return product_data_str

@app.route("/get_ingredients", methods=["GET"])
def get_ingredients():
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
    Get AI-based recommendations based on product ingredients.

    Args:
        None: Expects JSON input with `product_name` (str) and `ingredients` (list of dicts).

    Returns:
        dict: A JSON object containing the product name, AI-generated recommendation, and the product URL.

    Description:
        This endpoint sends the ingredients for the product to an LLM for recommendation.

        Expected output format:
        ```json
        {
            "product_name": "<product_name>",
            "recommendation": "<AI-generated recommendation>",
            "product_url": "https://www.ewg.org/skindeep/search/?search=<product_name>"
        }
        ```

    Example:
        >>> curl -X POST "http://localhost:5000/recommend" \
                 -H "Content-Type: application/json" \
                 -d '{"product_name": "Product_1", "ingredients": [{"name": "Ingredient A", "score": 1}, {"name": "Ingredient B", "score": 7}]}'
        {
            "product_name": "Product_1",
            "recommendation": "This product contains Ingredient B, which has a high hazard score. Consider using a safer alternative.",
            "product_url": "https://www.ewg.org/skindeep/search/?search=Product_1"
        }
    """
    data = request.json
    product_name = data.get("product_name")
    ingredients = data.get("ingredients")

    if not product_name:
        return jsonify({"error": "Missing product_name"}), 400
    if not ingredients or not isinstance(ingredients, list):
        return jsonify({"error": "Missing or invalid ingredients"}), 400

    # Format the ingredients for the LLM
    ingredient_details = "\n".join([f"{i['name']} (Hazard Score: {i['score']})" for i in ingredients])

    # Explain hazard ratings to the LLM
    explanation = (
        "The hazard score represents the potential risk level of the ingredient. "
        "A lower score (1-2) means it's considered low risk, 3-6 indicates moderate risk, "
        "and 7-10 suggests a higher hazard potential. Please analyze the safety of the product based on these scores."
    )

    llm_input = {
        "input": f"Product Name: {product_name}\nIngredients:\n{ingredient_details}\n\n{explanation}"
    }

    print("\n=== LLM Input ===")
    print(llm_input)
    print("=================\n")

    try:
        ai_response = llm_chain.invoke(llm_input)

        # Ensure response is extracted properly
        if isinstance(ai_response, dict) and "text" in ai_response:
            ai_response = ai_response["text"]

        return jsonify({
            "product_name": product_name,
            "recommendation": ai_response.strip(),
            "product_url": f"https://www.ewg.org/skindeep/search/?search={product_name.replace(' ', '%20')}"
        })

    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Failed to generate recommendation"}), 500



if __name__ == "__main__":
    app.run(debug=True, port=5000)
