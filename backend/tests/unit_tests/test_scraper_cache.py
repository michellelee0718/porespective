from unittest.mock import MagicMock

import pytest

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
        "ingredients": [
            {"name": "Water", "score": "1", "concerns": []},
            {
                "name": "Fragrance",
                "score": "8",
                "concerns": [
                    "Allergies/immunotoxicity (high)",
                    "Endocrine disruption (moderate)",
                ],
            },
        ],
    }

    result = scrape_product_ingredients("CeraVe Moisturizing Cream")

    assert result["product_name"] == "CeraVe Moisturizing Cream"
    assert len(result["ingredients"]) == 2

    assert result["ingredients"][0]["name"] == "Water"
    assert result["ingredients"][0]["score"] == "1"
    assert result["ingredients"][0]["concerns"] == []
    assert result["ingredients"][1]["name"] == "Fragrance"
    assert result["ingredients"][1]["score"] == "8"
    assert result["ingredients"][1]["concerns"] == [
        "Allergies/immunotoxicity (high)",
        "Endocrine disruption (moderate)",
    ]

    mock_cache_product_data.assert_not_called()  # Should NOT cache
    mock_get_cached_product.assert_called_once()  # Should check cache first


def test_scrape_product_ingredients_live_scrape(mock_browser, mock_cache):
    """Test scraping when no cached data is available."""
    mock_get_cached_product, mock_cache_product_data = mock_cache
    mock_get_cached_product.return_value = None  # No cache

    # Mock finding product link
    mock_browser.find_element.return_value.get_attribute.return_value = (
        "https://example.com"
    )

    # Mock product name extraction
    mock_browser.find_element.return_value.text.strip.return_value = "Unknown Product"

    # Mock ingredient elements
    def mock_find_elements(by, selector):
        if "td-ingredient-interior" in selector:
            return [MagicMock(text="Water"), MagicMock(text="Fragrance")]
        elif "td-score img.ingredient-score" in selector:
            return [
                MagicMock(get_attribute=lambda attr: "Ingredient score: 1"),
                MagicMock(get_attribute=lambda attr: "Ingredient score: 8"),
            ]
        elif "tr.ingredient-more-info-wrapper" in selector:
            concern_tbody = MagicMock()

            concern_row = MagicMock()
            concern_title_td = MagicMock()
            concern_title_td.get_attribute.return_value = (
                "CONCERNS"  # First TD contains "CONCERNS"
            )

            concern_data_td = MagicMock()
            concern_data_td.get_attribute.return_value = "<ul><li>Allergies/immunotoxicity (high)</li><li>Endocrine disruption (moderate)</li></ul>"

            concern_row.find_elements.return_value = [concern_title_td, concern_data_td]

            concern_tbody.find_elements.return_value = [concern_row]

            return [[], concern_tbody]  # water: []
        return []

    mock_browser.find_elements.side_effect = mock_find_elements

    result = scrape_product_ingredients("CeraVe Moisturizing Cream")

    # Assertions
    assert result["product_name"] == "Unknown Product"  # Mocked scenario
    assert len(result["ingredients"]) == 2

    assert result["ingredients"][0]["name"] == "Water"
    assert result["ingredients"][0]["score"] == "1"
    assert result["ingredients"][0]["concerns"] == []

    assert result["ingredients"][1]["name"] == "Fragrance"
    assert result["ingredients"][1]["score"] == "8"
    assert result["ingredients"][1]["concerns"] == [
        "Allergies/immunotoxicity (high)",
        "Endocrine disruption (moderate)",
    ]

    mock_cache_product_data.assert_called_once()  # Should save new cache
