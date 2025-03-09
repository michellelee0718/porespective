import pytest

from backend.server import app


# Fixture
@pytest.fixture
def client():
    """
    Flask test client for calling endpoints.
    """
    with app.test_client() as client:
        yield client


### Test for the /recommend endpoint
def test_recommend_product_success(client, mocker):
    """
    Test a successful POST /recommend request with valid product_name, ingredients, and user_profile.
    """
    # Mock the streaming function
    mock_stream = mocker.MagicMock()
    mock_stream.return_value = iter(
        ['data: {"content": "This is a safe product. Recommend it."}\n\n']
    )

    mocker.patch("backend.server.stream_recommend", mock_stream)

    # Prepare JSON body
    request_json = {
        "product_name": "Product A",
        "ingredients": [
            {"name": "Ingredient 1", "score": "1", "concerns": ["Concern A"]},
            {
                "name": "Ingredient 2",
                "score": "2",
                "concerns": ["Concern B", "Concern C"],
            },
        ],
        "user_profile": {
            "skinType": "Oily",
            "skinConcerns": "Acne",
            "allergies": "None",
        },
    }

    response = client.post("/recommend", json=request_json)
    assert response.status_code == 200
    response_data = "".join([line.decode() for line in response.response])

    assert 'data: {"content": "This is a safe product. Recommend it."}' in response_data


def test_recommend_product_with_session_id(client, mocker):
    """
    Test recommendation response while using an existing session ID.
    """
    mock_stream = mocker.MagicMock()
    mock_stream.return_value = iter(
        ['data: {"content": "Session ID test passed."}\n\n']
    )

    mocker.patch("backend.server.stream_recommend", mock_stream)

    request_json = {
        "product_name": "Product A",
        "ingredients": [
            {"name": "Ingredient 1", "score": 1, "concerns": ["Concern X"]},
            {"name": "Ingredient 2", "score": 2, "concerns": ["Concern Y"]},
        ],
        "session_id": "test_session_123",
        "user_profile": {
            "skinType": "Dry",
            "skinConcerns": "Eczema",
            "allergies": "Fragrance",
        },
    }

    response = client.post("/recommend", json=request_json)
    assert response.status_code == 200
    response_data = "".join([line.decode() for line in response.response])

    assert 'data: {"content": "Session ID test passed."}' in response_data


def test_recommend_product_missing_user_profile(client, mocker):
    """
    Test that missing user profile will not raise an error
    """
    mock_stream = mocker.MagicMock()
    mock_stream.return_value = iter(
        [
            'data: {"content": "Enter the user profile for customized recommendation."}\n\n'
        ]
    )

    mocker.patch("backend.server.stream_recommend", mock_stream)

    request_json = {
        "product_name": "Product A",
        "ingredients": [
            {"name": "Ingredient 1", "score": 1, "concerns": ["Concern X"]},
            {"name": "Ingredient 2", "score": 2, "concerns": ["Concern Y"]},
        ],
        "session_id": "test_session_123",
    }

    response = client.post("/recommend", json=request_json)
    assert response.status_code == 200
    response_data = "".join([line.decode() for line in response.response])

    assert (
        'data: {"content": "Enter the user profile for customized recommendation."}'
        in response_data
    )


def test_recommend_product_missing_score(client):
    """
    Test /recommend error if an ingredient is missing a score.
    """
    response = client.post(
        "/recommend",
        json={
            "product_name": "Product A",
            "ingredients": [{"name": "Ingredient 1", "concerns": ["Concern A"]}],
            "user_profile": {"skinType": "Oily"},
        },
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "Ingredient 'Ingredient 1' missing 'score' field"


def test_recommend_product_missing_concerns(client):
    """
    Test /recommend error if an ingredient is missing the concerns field.
    """
    response = client.post(
        "/recommend",
        json={
            "product_name": "Product A",
            "ingredients": [{"name": "Ingredient 1", "score": "3"}],
            "user_profile": {"skinType": "Oily"},
        },
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert (
        data["error"]
        == "Ingredient 'Ingredient 1' missing 'concerns' field or the 'concern' field is not a list"
    )


def test_recommend_product_invalid_concerns_type(client):
    """
    Test /recommend error if concerns is not a list.
    """
    response = client.post(
        "/recommend",
        json={
            "product_name": "Product B",
            "ingredients": [
                {"name": "Ingredient 1", "score": "2", "concerns": "Not a list"}
            ],
            "user_profile": {"skinType": "Dry"},
        },
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert (
        data["error"]
        == "Ingredient 'Ingredient 1' missing 'concerns' field or the 'concern' field is not a list"
    )


def test_recommend_product_missing_name_empty(client):
    """
    Test /recommend error if product name is missing (empty string).
    """
    response = client.post(
        "/recommend",
        json={
            "product_name": "",
            "ingredients": [
                {"name": "Ingredient 1", "score": "1", "concerns": ["Concern A"]}
            ],
            "user_profile": {"skinType": "Oily"},
        },
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "Missing product_name"


def test_recommend_product_missing_name_none(client):
    """
    Test /recommend error if product name is None.
    """
    response = client.post(
        "/recommend",
        json={
            "product_name": None,
            "ingredients": [
                {"name": "Ingredient 1", "score": "1", "concerns": ["Concern A"]}
            ],
            "user_profile": {"skinType": "Oily"},
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
        "/recommend",
        json={
            "product_name": "Product A",
            "ingredients": "Ingredient 1",
            "user_profile": {"skinType": "Oily"},
        },
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "Invalid ingredients (Should be a list)"


def test_recommend_stream_error(client, mocker):
    """
    Simulate LLM streaming error during recommendation.
    """
    # Mock the streaming function to simulate an error
    mock_stream = mocker.MagicMock()
    mock_stream.return_value = iter(['data: {"error": "LLM Streaming error"}\n\n'])
    mocker.patch("backend.server.stream_recommend", mock_stream)

    response = client.post(
        "/recommend",
        json={
            "product_name": "Product",
            "ingredients": [
                {"name": "Ingredient 1", "score": "1", "concerns": ["Concern X"]}
            ],
            "user_profile": {
                "skinType": "Combination",
                "skinConcerns": "Hyperpigmentation",
                "allergies": "None",
            },
        },
    )
    assert (
        response.status_code == 200
    )  # SSE responses should not use 500, instead return errors in the stream

    response_data = "".join([line.decode() for line in response.response])
    assert 'data: {"error": "LLM Streaming error"}' in response_data
