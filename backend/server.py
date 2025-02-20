from flask import Flask, request, jsonify
from flask_cors import CORS
from scraper import scrape_product_ingredients  # Import scraper function

app = Flask(__name__)
CORS(app)

@app.route("/get_ingredients", methods=["GET"])
def get_ingredients():
    product_name = request.args.get("product")

    if not product_name:
        return jsonify({"error": "Missing product name"}), 400

    result = scrape_product_ingredients(product_name)

    if "product_name" not in result or not result["product_name"]:
        result["product_name"] = product_name  # Default to query if actual name not found

    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True, port=5000)
