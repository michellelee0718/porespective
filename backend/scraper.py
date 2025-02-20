from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time

def scrape_product_ingredients(product_name):
    """Search for a product and scrape its ingredient details from EWG Skin Deep"""

    # Construct the search results page URL
    search_url = f"https://www.ewg.org/skindeep/search/?search={product_name.replace(' ', '%20')}"

    # Set up Selenium WebDriver
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")  # Run without opening a browser
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    
    # Load the search results page
    driver.get(search_url)
    time.sleep(3)  # Wait for JavaScript to load

    # Get the first product link from the search results
    try:
        product_element = driver.find_element(By.CSS_SELECTOR, "section.product-listings a")
        product_url = product_element.get_attribute("href")
        print(f"✅ Found product: {product_url}")
    except:
        driver.quit()
        return {"error": "No products found"}

    # Load the product page
    driver.get(product_url)
    time.sleep(3)  # Wait for page load

    # Extract **actual product name** from the page
    try:
        product_name_element = driver.find_element(By.CSS_SELECTOR, "h2.product-name.text-block")
        actual_product_name = product_name_element.text.strip()
    except:
        actual_product_name = "Unknown Product"

    # Extract ingredient names
    ingredient_elements = driver.find_elements(By.CSS_SELECTOR, "td.td-ingredient .td-ingredient-interior")
    ingredients = [elem.text.strip() for elem in ingredient_elements]

    # Extract hazard scores from `alt` attribute of `<img>` tags
    score_elements = driver.find_elements(By.CSS_SELECTOR, "td.td-score img.ingredient-score")
    scores = [elem.get_attribute("alt").replace("Ingredient score: ", "").strip() for elem in score_elements]

    driver.quit()

    # Ensure both lists have the same length
    if not ingredients:
        return {"error": "No ingredient data found"}

    # Match ingredients with scores
    ingredient_data = []
    for i in range(len(ingredients)):
        score = scores[i] if i < len(scores) else "N/A"
        ingredient_data.append({"name": ingredients[i], "score": score})

    return {
        "product_url": product_url,
        "product_name": actual_product_name,  # ✅ Now returning the real product name!
        "ingredients": ingredient_data
    }

# 🔥 Test the scraper
if __name__ == "__main__":
    print(scrape_product_ingredients("CeraVe Moisturizing Cream"))
