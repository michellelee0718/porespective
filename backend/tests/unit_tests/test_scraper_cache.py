import pytest
from unittest.mock import patch, MagicMock
from backend.scraper import scrape_product_ingredients


@pytest.fixture
def mock_browser(mocker):
    """Fixture to mock Selenium WebDriver."""
    mock_browser = mocker.MagicMock()
    mocker.patch("backend.scraper.webdriver.Chrome", return_value=mock_browser)
    return mock_browser


@pytest.fixture
def mock_cache(mocker):
    """Fixture to mock cache functions."""
    mock_get = mocker.patch("backend.scraper.get_cached_product")
    mock_save = mocker.patch("backend.scraper.cache_product_data")
    return mock_get, mock_save


def test_scrape_product_ingredients_cached(mock_cache):
    """Test that cached data is used when available."""
    mock_get_cached_product, mock_cache_product_data = mock_cache

    mock_get_cached_product.return_value = {
        "product_url": "https://example.com",
        "product_name": "CeraVe Moisturizing Cream",
        "ingredients": [{"name": "Water", "score": "1"}]
    }

    result = scrape_product_ingredients("CeraVe Moisturizing Cream")

    assert result["product_name"] == "CeraVe Moisturizing Cream"
    assert len(result["ingredients"]) == 1
    assert result["ingredients"][0]["name"] == "Water"

    mock_cache_product_data.assert_not_called()  # Should NOT cache
    mock_get_cached_product.assert_called_once()  # Should check cache first


def test_scrape_product_ingredients_live_scrape(mock_browser, mock_cache):
    """Test scraping when no cached data is available."""
    mock_get_cached_product, mock_cache_product_data = mock_cache
    mock_get_cached_product.return_value = None  # No cache

    # Mock finding product link
    mock_browser.find_element.return_value.get_attribute.return_value = "https://example.com"

    # Mock product name extraction to return a real string
    mock_browser.find_element.return_value.text.strip.return_value = "Unknown Product"

    # Mock ingredient elements
    def mock_find_elements(by, selector):
        if "td-ingredient-interior" in selector:
            return [MagicMock(text="Water")]
        elif "td-score img.ingredient-score" in selector:
            return [MagicMock(get_attribute=lambda attr: "Ingredient score: 1")]
        return []

    mock_browser.find_elements.side_effect = mock_find_elements

    result = scrape_product_ingredients("CeraVe Moisturizing Cream")

    assert result["product_name"] == "Unknown Product"  # Mocked scenario
    assert len(result["ingredients"]) == 1
    assert result["ingredients"][0]["name"] == "Water"
    assert result["ingredients"][0]["score"] == "1"

    mock_cache_product_data.assert_called_once()  # Should save new cache


