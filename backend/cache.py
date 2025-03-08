import json
import os
from datetime import datetime, timedelta

CACHE_FILE = "product_cache.json"


def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r") as f:
            return json.load(f)
    return {}


def save_cache(cache):
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2)


def get_cached_product(product_name, max_age_days=30):
    """
    Retrieve product data from the local cache if available and not expired (default 30 days).

    Args:
        product_name (str): The name of the skincare product to retrieve from the cache.
        max_age_days (int, optional): The maximum age (in days) for cached data to be considered valid. Default is 30 days.

    Returns:
        JSON: A cached product entry containing:
            - "product_url" (str): The URL of the product.
            - "product_name" (str): The product's official name.
            - "ingredients" (list): A list of ingredients and their hazard scores.

        If the cache is expired or the product is not found, returns `None`.

    Description:
        - Loads the cached data from `product_cache.json`.
        - Checks if the requested product exists in the cache.
        - Verifies whether the cached entry is still valid based on `max_age_days`.
        - If valid, returns the cached product details; otherwise, returns `None`.

    Example Request:
    ```python
    get_cached_product("CeraVe Moisturizing Cream")
    ```

    Example Response:
    ```json
    {
        "product_url": "https://www.ewg.org/skindeep/products/123456-CeraVe_Moisturizing_Cream/",
        "product_name": "CeraVe Moisturizing Cream",
        "ingredients": [
            { "name": "Water", "score": "1" },
            { "name": "Fragrance", "score": "8" }
        ],
        "last_updated": "2025-03-01T12:00:00"
    }
    ```

    Errors:
        - Returns `None` if no valid cache entry is found.
    """

    cache = load_cache()
    if product_name in cache:
        cached_data = cache[product_name]
        cached_time = datetime.fromisoformat(cached_data["last_updated"])
        if datetime.now() - cached_time < timedelta(days=max_age_days):
            return cached_data  # ✅ Valid cache hit
    return None  # ❌ Cache miss or expired


def cache_product_data(product_name, data):
    """
    Store product data in the local cache for future use.

    Args:
        product_name (str): The searching keyword.
        data (dict): A dictionary containing:
            - "product_url" (str): The product's URL.
            - "product_name" (str): The official product name.
            - "ingredients" (list): A list of ingredients and their safety scores.

    Returns:
        None

    Description:
        - Loads existing cached data from `product_cache.json`.
        - Adds the new product entry along with a timestamp (`last_updated`).
        - Saves the updated cache back to the file.

    Example Request:
    ```python
    cache_product_data("CeraVe", {
        "product_url": "https://www.ewg.org/skindeep/products/123456-CeraVe_Moisturizing_Cream/",
        "product_name": "CeraVe Moisturizing Cream",
        "ingredients": [
            { "name": "Water", "score": "1" },
            { "name": "Fragrance", "score": "8" }
        ]
    })
    ```

    Example Cache File (`product_cache.json`):
    ```json
    {
        "CeraVe": {
            "product_url": "https://www.ewg.org/skindeep/products/123456-CeraVe_Moisturizing_Cream/",
            "product_name": "CeraVe Moisturizing Cream",
            "ingredients": [
                { "name": "Water", "score": "1" },
                { "name": "Fragrance", "score": "8" }
            ],
            "last_updated": "2025-03-01T12:00:00"
        }
    }
    ```
    """
    cache = load_cache()
    data["last_updated"] = datetime.now().isoformat()
    cache[product_name] = data
    save_cache(cache)
