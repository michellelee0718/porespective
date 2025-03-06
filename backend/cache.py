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

def get_cached_product(product_name, max_age_days=7):
    cache = load_cache()
    if product_name in cache:
        cached_data = cache[product_name]
        cached_time = datetime.fromisoformat(cached_data['last_updated'])
        if datetime.now() - cached_time < timedelta(days=max_age_days):
            return cached_data  # ✅ Valid cache hit
    return None  # ❌ Cache miss or expired

def cache_product_data(product_name, data):
    cache = load_cache()
    data['last_updated'] = datetime.now().isoformat()
    cache[product_name] = data
    save_cache(cache)
