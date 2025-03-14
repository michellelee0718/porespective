import hashlib
import json

import pytest

from backend.server import app, get_formatted_ingredients, ingredient_summary_cache


def test_get_formatted_ingredients_success():
    """
    Test successful formatting of ingredient details.
    """
    test_data = {
        "ingredients": [
            {"name": "Water", "score": 1, "concerns": ["None"]},
            {"name": "Fragrance", "score": 8, "concerns": ["Allergen"]},
        ]
    }
    expected_output = (
        "Water (Hazard Score: 1)\n  - Concerns: None\n"
        "Fragrance (Hazard Score: 8)\n  - Concerns: Allergen"
    )
    assert get_formatted_ingredients(test_data) == expected_output


def test_get_formatted_ingredients_missing_ingredients():
    """
    Test error handling when `ingredients` field is missing.
    """
    test_data = {}
    with pytest.raises(ValueError, match="Missing ingredients"):
        get_formatted_ingredients(test_data)


def test_get_formatted_ingredients_not_list():
    """
    Test error handling when `ingredients` is not a list.
    """
    test_data = {"ingredients": "Not a list"}
    with pytest.raises(ValueError, match="Invalid ingredients \(Should be a list\)"):
        get_formatted_ingredients(test_data)


def test_get_formatted_ingredients_missing_name():
    """
    Test error handling when an ingredient is missing the `name` field.
    """
    test_data = {"ingredients": [{"score": 2, "concerns": ["Irritant"]}]}
    with pytest.raises(ValueError, match="Ingredient missing 'name' field"):
        get_formatted_ingredients(test_data)


def test_get_formatted_ingredients_missing_score():
    """
    Test error handling when an ingredient is missing the `score` field.
    """
    test_data = {"ingredients": [{"name": "Water", "concerns": ["None"]}]}
    with pytest.raises(ValueError, match="Ingredient 'Water' missing 'score' field"):
        get_formatted_ingredients(test_data)


def test_get_formatted_ingredients_missing_concerns():
    """
    Test error handling when an ingredient is missing the `concerns` field.
    """
    test_data = {"ingredients": [{"name": "Water", "score": 1}]}
    with pytest.raises(
        ValueError,
        match="Ingredient 'Water' missing 'concerns' field or the 'concern' field is not a list",
    ):
        get_formatted_ingredients(test_data)


@pytest.fixture
def client():
    """
    Flask test client for calling endpoints.
    """
    with app.test_client() as client:
        yield client


def test_get_formatted_ingredients_success():
    """
    Test successful formatting of ingredient details.
    """
    test_data = {
        "ingredients": [
            {"name": "Water", "score": 1, "concerns": ["None"]},
            {"name": "Fragrance", "score": 8, "concerns": ["Allergen"]},
        ]
    }
    expected_output = (
        "Water (Hazard Score: 1)\n  - Concerns: None\n"
        "Fragrance (Hazard Score: 8)\n  - Concerns: Allergen"
    )
    assert get_formatted_ingredients(test_data) == expected_output


def test_ingredient_summary_success(client, mocker):
    """
    Test a successful POST /ingredient-summary request with mock LLM response.
    """
    mock_llm_chain = mocker.MagicMock()
    mock_llm_chain.invoke.return_value = {"text": '["Hydrating", "Soothing"]'}
    mocker.patch(
        "backend.server.get_ingredient_summary_chain", return_value=mock_llm_chain
    )

    response = client.post(
        "/ingredient-summary",
        json={
            "ingredients": [
                {"name": "Hyaluronic Acid", "score": 1, "concerns": ["None"]},
                {"name": "Salicylic Acid", "score": 4, "concerns": ["Irritant"]},
            ]
        },
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "summary" in data
    assert data["summary"] == ["Hydrating", "Soothing"]


def test_ingredient_summary_cache(client, mocker):
    """
    Test caching mechanism of /ingredient-summary to ensure cached results are used.
    """
    test_ingredients = [
        {"name": "Hyaluronic Acid", "score": 1, "concerns": ["None"]},
        {"name": "Salicylic Acid", "score": 4, "concerns": ["Irritant"]},
    ]
    ingredients_key = hashlib.md5(
        json.dumps(test_ingredients, sort_keys=True).encode()
    ).hexdigest()
    ingredient_summary_cache[ingredients_key] = ["Hydrating", "Soothing"]

    response = client.post(
        "/ingredient-summary",
        json={"ingredients": test_ingredients},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "summary" in data
    assert data["summary"] == ["Hydrating", "Soothing"]
    assert response.json["summary"] == ingredient_summary_cache[ingredients_key]


def test_ingredient_summary_invalid_ingredients(client):
    """
    Test /ingredient-summary error when `ingredients` field is not a list.
    """
    response = client.post("/ingredient-summary", json={"ingredients": "Not a list"})
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "Invalid ingredients (Should be a list)"


def test_ingredient_summary_empty_list(client):
    """
    Test /ingredient-summary when given an empty list of ingredients.
    """
    response = client.post("/ingredient-summary", json={"ingredients": []})
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "Missing ingredients"
