from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager

from backend.cache import cache_product_data, get_cached_product


def scrape_product_ingredients(product_name):
    """
    Search for a skincare product on the EWG Skin Deep database and extract ingredient details.

    Args:
        product_name (str): The searching keyword.

    Returns:
        JSON: A JSON response containing the product's URL, name, and a list of ingredients with their hazard scores.
              If the product is not found, an error message is returned.

    Description:
        - First checks if cached data exists for the product to avoid unnecessary web scraping.
        - If no cache is available, performs a web search on the EWG website.
        - Extracts the first product result, navigates to its details page, and scrapes ingredient information.
        - Stores the retrieved data in a local cache to optimize future requests.

    Response Format:
    ```
    {
        "product_url": "https://www.ewg.org/skindeep/products/123456-CeraVe_Moisturizing_Cream/",
        "product_name": "CeraVe Moisturizing Cream",
        "ingredients": [
            { "name": "Water", "score": "1" },
            { "name": "Fragrance", "score": "8" }
        ]
    }
    ```

    Example Request:
    ```python
    scrape_product_ingredients("CeraVe")
    ```

    Example Response:
    ```json
    {
        "product_url": "https://www.ewg.org/skindeep/products/123456-CeraVe_Moisturizing_Cream/",
        "product_name": "CeraVe Moisturizing Cream",
        "ingredients": [
            { "name": "Water", "score": "1" },
            { "name": "Fragrance", "score": "8" }
        ]
    }
    ```

    Errors:
        - If no products are found, returns: `{ "error": "No products found" }`
        - If no ingredient data is available, returns: `{ "error": "No ingredient data found" }`
        - If an exception occurs, returns: `{ "error": "<error message>" }`
    """

    # First check if cached
    cached = get_cached_product(product_name)
    if cached:
        print(f"✅ Using cached data for {product_name}")
        return cached

    # Construct the search results page URL
    search_url = f"https://www.ewg.org/skindeep/search/?search={product_name.replace(' ', '%20')}"

    # Set up Selenium WebDriver
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")  # Run without opening a browser
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()), options=options
    )

    # Load the search results page
    driver.get(search_url)

    # Get the first product link from the search results
    try:
        # switching to WebDriverWait, wait until the exact element is present
        product_element = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, "section.product-listings a")
            )
        )
        product_url = product_element.get_attribute("href")
        print(f"✅ Found product: {product_url}")
    except:
        driver.quit()
        return {"error": "No products found"}

    # Load the product page
    driver.get(product_url)

    try:
        # Wait until ingredient table is present
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, "td.td-ingredient .td-ingredient-interior")
            )
        )
    except:
        driver.quit()
        return {"error": "Ingredient table did not load"}

    # product name
    try:
        product_name_element = driver.find_element(
            By.CSS_SELECTOR, "h2.product-name.text-block"
        )
        actual_product_name = product_name_element.text.strip()
    except:
        actual_product_name = "Unknown Product"

    # Extract ingredient names
    ingredient_elements = driver.find_elements(
        By.CSS_SELECTOR,
        "tr.ingredient-overview-tr td.td-ingredient .td-ingredient-interior",
    )
    ingredients = [elem.text.strip() for elem in ingredient_elements]

    # Extract hazard scores
    score_elements = driver.find_elements(
        By.CSS_SELECTOR, "tr.ingredient-overview-tr td.td-score img.ingredient-score"
    )
    scores = [
        elem.get_attribute("alt").replace("Ingredient score: ", "").strip()
        for elem in score_elements
    ]

    # Extract concerns from 'ingredient-more-info-wrapper' sections
    concern_data = []
    concern_rows = driver.find_elements(
        By.CSS_SELECTOR,
        "tr.ingredient-more-info-wrapper div.ingredient-more-info table tbody",
    )

    print(f"🧐 Found {len(concern_rows)} concern sections")  # Debugging output

    for tbody in concern_rows:
        try:
            print(
                f"🔍 Inspecting tbody: {tbody.get_attribute('outerHTML')}"
            )  # Print full HTML of tbody

            # Locate all <tr> inside the tbody
            rows = tbody.find_elements(By.TAG_NAME, "tr")

            concerns_list = []
            for tr in rows:
                td_elements = tr.find_elements(By.TAG_NAME, "td")

                # Debugging: Print text in each <td>
                td_texts = [td.get_attribute("outerHTML") for td in td_elements]
                print(f"🔹 Found TDs:\n{td_texts}")

                # Look for the row where the first <td> is "CONCERNS"
                if len(td_texts) > 1 and "CONCERNS" in td_texts[0]:
                    # Extract concerns from the second <td>
                    concerns_html = td_elements[1].get_attribute("innerHTML").strip()
                    soup = BeautifulSoup(concerns_html, "html.parser")
                    concerns_cleaned = soup.get_text(
                        separator="\n"
                    )  # Extract clean text

                    # Format concerns properly into an array
                    concerns_list = [
                        c.strip().replace("•", "")
                        for c in concerns_cleaned.split("\n")
                        if c
                    ]
                    print(f"✅ Extracted concerns: {concerns_list}")  # Debugging output
                    break  # Stop after finding the concerns section

            concern_data.append(concerns_list)

        except Exception as e:
            print(f"❌ Error extracting concerns: {e}")
            concern_data.append([])

    driver.quit()

    if not ingredients:
        return {"error": "No ingredient data found"}

    # Match ingredients with scores
    ingredient_data = []
    for i in range(len(ingredients)):
        score = scores[i] if i < len(scores) else "N/A"
        concerns = concern_data[i] if i < len(concern_data) else []
        ingredient_data.append(
            {"name": ingredients[i], "score": score, "concerns": concerns}
        )

    print("Scraped ingredient data:", ingredient_data)

    result = {
        "product_url": product_url,
        "product_name": actual_product_name,
        "ingredients": ingredient_data,
    }

    # cache before return
    cache_product_data(product_name, result)
    return result


# 🔥 Test the scraper
if __name__ == "__main__":
    print(scrape_product_ingredients("CeraVe Moisturizing Cream"))
