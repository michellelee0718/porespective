import pytest
from backend.server import app, fetch_product_data


# Fixture
@pytest.fixture
def client():
    """
    Flask test client for calling endpoints.
    """
    with app.test_client() as client:
        yield client


### Test fetch_product_data()
def test_fetch_product_data_valid(mocker):
    """
    Test fetch_product_data() when scrape_product_ingredients() returns valid product info.
    """
    # Mock the data returned by scrape_product_ingredients
    mock_scraped_data = {
        "product_name": "Product A",
        "ingredients": [
            {"name": "Ingredient 1", "score": "1"},
            {"name": "Ingredient 2", "score": "2"},
        ],
    }

    mocker.patch(
        "backend.server.scrape_product_ingredients", return_value=mock_scraped_data
    )

    result = fetch_product_data("Product A")

    assert result is not None
    # Should contain product name
    assert "Product Name: Product A" in result
    # Should contain ingredient names
    assert "Ingredients: Ingredient 1, Ingredient 2" in result


def test_fetch_product_data_no_ingredients(mocker):
    """
    Test fetch_product_data() when no ingredients are found.
    """
    mock_scraped_data = {"product_name": "Product A", "ingredients": []}
    mocker.patch(
        "backend.server.scrape_product_ingredients", return_value=mock_scraped_data
    )

    result = fetch_product_data("Product A")
    assert result is None, "Expected None if 'ingredients' is empty"


def test_fetch_product_data_error(mocker):
    """
    Test fetch_product_data() when there is an error in scraping the data.
    """
    mock_scraped_data = {"error": "No products found"}
    mocker.patch(
        "backend.server.scrape_product_ingredients", return_value=mock_scraped_data
    )

    result = fetch_product_data("Unknown Product")
    assert result is None, "Expected None if there is an error in scraping the data"


### Test for the /recommend endpoint
def test_recommend_product_success(client, mocker):
    """
    Test a successful POST /recommend request with valid product_name and ingredients.
    """
    # Mock the LLM chain
    mock_llm_chain = mocker.MagicMock()
    mock_llm_chain.invoke.return_value = "This is a safe product. Recommend it."

    # Patch the llm_chain global in server.py
    mocker.patch("backend.server.llm_chain", mock_llm_chain)

    # Prepare JSON body
    request_json = {
        "product_name": "Product A",
        "ingredients": [
            {"name": "Ingredient 1", "score": "1"},
            {"name": "Ingredient 2", "score": "2"},
        ],
    }

    response = client.post("/recommend", json=request_json)
    assert response.status_code == 200

    data = response.get_json()
    assert data["product_name"] == "Product A"
    assert "recommendation" in data
    assert data["recommendation"] == "This is a safe product. Recommend it."
    assert "product_url" in data


def test_recommend_product_missing_name(client):
    """
    Test /recommend error if product_name is missing.
    """
    response = client.post(
        "/recommend",
        json={
            "ingredients": [{"name": "Ingredient 1", "score": "1"}]  # No product name
        },
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "Missing product_name"


def test_recommend_product_invalid_ingredients(client):
    """
    Test /recommend error if ingredients is not a list.
    """
    response = client.post(
        "/recommend", json={"product_name": "Product A", "ingredients": "Ingredient 1"}
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "Missing or invalid ingredients"


def test_recommend_product_empty_ingredients(client):
    """
    Test /recommend error if ingredients is an empty list (invalid).
    """
    response = client.post(
        "/recommend", json={"product_name": "Product A", "ingredients": []}
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "Missing or invalid ingredients"


def test_recommend_product_exception(client, mocker):
    mock_llm_chain = mocker.MagicMock()
    mock_llm_chain.invoke.side_effect = Exception("LLM error")
    mocker.patch("backend.server.llm_chain", new=mock_llm_chain)

    response = client.post(
        "/recommend",
        json={
            "product_name": "Product",
            "ingredients": [{"name": "Ingredient 1", "score": "1"}],
        },
    )
    assert response.status_code == 500
    data = response.get_json()
    assert data["error"] == "Failed to generate recommendation"
