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
            {"name": "Ingredient 1", "score": "1"},
            {"name": "Ingredient 2", "score": "2"},
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
            {"name": "Ingredient 1", "score": 1},
            {"name": "Ingredient 2", "score": 2},
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


def test_recommend_product_missing_name_empty(client):
    """
    Test /recommend error if ingredient name is missing.
    """
    response = client.post(
        "/recommend",
        json={
            "product_name": "",
            "ingredients": "Ingredient 1",
            "user_profile": {"skinType": "Oily"},
        },
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "Missing product_name"


def test_recommend_product_missing_name_none(client):
    """
    Test /recommend error if ingredient name is None.
    """
    response = client.post(
        "/recommend",
        json={
            "product_name": None,
            "ingredients": "Ingredient 1",
            "user_profile": {"skinType": "Oily"},
        },
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "Missing product_name"


def test_recommend_product_no_ingredients(client):
    """
    Test /recommend error if ingredients is missing when there is no "ingredient" key.
    """
    response = client.post(
        "/recommend",
        json={"product_name": "Product A", "user_profile": {"skinType": "Oily"}},
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "Missing ingredients"


def test_recommend_product_ingredients_none(client):
    """
    Test /recommend error if ingredients is missing when the ingredients is None.
    """
    response = client.post(
        "/recommend",
        json={
            "product_name": "Product A",
            "ingredients": None,
            "user_profile": {"skinType": "Oily"},
        },
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "Missing ingredients"


def test_recommend_product_ingredients_empty(client):
    """
    Test /recommend error if ingredients is missing when the ingredients is empty".
    """
    response = client.post(
        "/recommend",
        json={
            "product_name": "Product A",
            "ingredients": "",
            "user_profile": {"skinType": "Oily"},
        },
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "Missing ingredients"


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
            "ingredients": [{"name": "Ingredient 1", "score": "1"}],
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


### Test for the /chat endpoint
def test_chat_success(client, mocker):
    """
    Test a successful chat response with a valid session ID and user message.
    """
    mock_stream = mocker.MagicMock()
    mock_stream.return_value = iter(
        ['data: {"content": "This is a follow-up response."}\n\n']
    )

    mocker.patch("backend.server.stream_chat", mock_stream)

    request_json = {"session_id": "abc123DEF", "message": "Is this product safe?"}

    response = client.post("/chat", json=request_json)
    assert response.status_code == 200

    response_data = "".join([line.decode() for line in response.response])

    assert 'data: {"content": "This is a follow-up response."}' in response_data


def test_chat_missing_session_id(client):
    """
    Test error response when session_id is missing in the request.
    """
    response = client.post(
        "/chat",
        json={"message": "Can I use this product daily?"},
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "Missing session_id"


def test_chat_missing_user_message(client):
    """
    Test error response when the user message is missing.
    """
    response = client.post(
        "/chat",
        json={"session_id": "abc123DEF"},
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "Missing user message"


def test_chat_non_existent_session(client, mocker):
    """
    Test that the API initializes a new conversation when a non-existent session ID is used.
    """
    mock_stream = mocker.MagicMock()
    mock_stream.return_value = iter(
        ['data: {"content": "This is the first response in a new session."}\n\n']
    )

    mocker.patch("backend.server.stream_chat", mock_stream)

    request_json = {
        "session_id": "non_existent_session",
        "message": "Tell me about safe skincare products.",
    }

    response = client.post("/chat", json=request_json)
    assert response.status_code == 200

    response_data = "".join([line.decode() for line in response.response])

    assert (
        'data: {"content": "This is the first response in a new session."}'
        in response_data
    )


def test_chat_streaming_error(client, mocker):
    """
    Simulate an LLM streaming error during chat response processing.
    """
    mock_stream = mocker.MagicMock()
    mock_stream.return_value = iter(['data: {"error": "LLM Streaming error"}\n\n'])

    mocker.patch("backend.server.stream_chat", mock_stream)

    response = client.post(
        "/chat",
        json={
            "session_id": "abc123DEF",
            "message": "What is a good fragrance-free moisturizer?",
        },
    )
    assert response.status_code == 200

    response_data = "".join([line.decode() for line in response.response])

    assert 'data: {"error": "LLM Streaming error"}' in response_data


def test_chat_empty_message(client):
    """
    Test error response when the user message is empty.
    """
    response = client.post(
        "/chat",
        json={"session_id": "abc123DEF", "message": ""},
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "Missing user message"
