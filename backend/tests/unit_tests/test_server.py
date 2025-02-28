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
    Test a successful POST /recommend request with valid product_name.
    """
    # Mock the LLM chain
    mock_llm_chain = mocker.MagicMock()
    mock_llm_chain.invoke.return_value = "This is a safe product. Recommend it."

    # Patch the llm_chain global in server.py

    mocker.patch("backend.server.get_llm_chain", return_value=mock_llm_chain)

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


def test_recommend_product_with_session_id(client, mocker):
    """
    Test recommendation response while using an existing session ID.
    """
    mock_llm_chain = mocker.MagicMock()
    mock_llm_chain.invoke.return_value = "Session ID test passed."
    mocker.patch("backend.server.get_llm_chain", return_value=mock_llm_chain)

    request_json = {
        "product_name": "Product A",
        "ingredients": [
            {"name": "Ingredient 1", "score": 1},
            {"name": "Ingredient 2", "score": 2},
        ],
        "session_id": "test_session_123"
    }

    response = client.post("/recommend", json=request_json)
    assert response.status_code == 200

    data = response.get_json()
    assert data["session_id"] == "test_session_123"
    assert data["recommendation"] == "Session ID test passed."


def test_recommend_product_missing_name(client):
    """
    Test /recommend error if product_name is missing.
    """
    response = client.post(
        "/recommend",
        json={
            "ingredients": [{"name": "Ingredient 1", "score": "1"}]
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
    """
    Simulate an exception occurring during LLM response processing.
    """
    mock_llm_chain = mocker.MagicMock()
    mock_llm_chain.invoke.side_effect = Exception("LLM error")
    mocker.patch("backend.server.get_llm_chain", return_value=mock_llm_chain)

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


def test_recommend_product_conversation_chain_failure(client, mocker):
    """
    Simulate an exception when retrieving or creating the conversation chain.
    """
    mock_llm_chain = mocker.MagicMock()
    mock_llm_chain.invoke.return_value = "Some recommendation."
    mocker.patch("backend.server.get_llm_chain", return_value=mock_llm_chain)
    mocker.patch("backend.server.get_or_create_conversation", side_effect=Exception("Conversation error"))

    response = client.post(
        "/recommend",
        json={
            "product_name": "Product A",
            "ingredients": [{"name": "Ingredient 1", "score": "1"}],
        },
    )
    assert response.status_code == 500
    data = response.get_json()
    assert "error" in data
    assert "Failed to generate recommendation" in data["error"]

### Test for the /chat endpoint
def test_chat_success(client, mocker):
    """
    Test a successful chat response with a valid session ID and user message.
    """
    mock_conversation_chain = mocker.MagicMock()
    mock_conversation_chain.run.return_value = "This is a follow-up response."
    mocker.patch("backend.server.get_or_create_conversation", return_value=mock_conversation_chain)

    request_json = {
        "session_id": "abc123DEF",
        "message": "Is this product safe?"
    }

    response = client.post("/chat", json=request_json)
    assert response.status_code == 200

    data = response.get_json()
    assert "response" in data
    assert data["response"] == "This is a follow-up response."


def test_chat_missing_session_id(client):
    """
    Test error response when session_id is missing in the request.
    """
    response = client.post(
        "/chat",
        json={
            "message": "Can I use this product daily?"
        },
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
        json={
            "session_id": "abc123DEF"
        },
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "Missing user message"


def test_chat_non_existent_session(client, mocker):
    """
    Test that the API initializes a new conversation when a non-existent session ID is used.
    """
    mock_conversation_chain = mocker.MagicMock()
    mock_conversation_chain.run.return_value = "This is the first response in a new session."
    mocker.patch("backend.server.get_or_create_conversation", return_value=mock_conversation_chain)

    request_json = {
        "session_id": "non_existent_session",
        "message": "Tell me about safe skincare products."
    }

    response = client.post("/chat", json=request_json)
    assert response.status_code == 200

    data = response.get_json()
    assert "response" in data
    assert data["response"] == "This is the first response in a new session."


def test_chat_exception_handling(client, mocker):
    """
    Simulate an internal server error occurring during chat response processing.
    """
    mock_conversation_chain = mocker.MagicMock()
    mock_conversation_chain.run.side_effect = Exception("LLM processing error")
    mocker.patch("backend.server.get_or_create_conversation", return_value=mock_conversation_chain)

    response = client.post(
        "/chat",
        json={
            "session_id": "abc123DEF",
            "message": "What is a good fragrance-free moisturizer?"
        },
    )
    assert response.status_code == 500
    data = response.get_json()
    assert "error" in data
    assert "LLM processing error" in data["error"]


def test_chat_empty_message(client):
    """
    Test error response when the user message is empty.
    """
    response = client.post(
        "/chat",
        json={
            "session_id": "abc123DEF",
            "message": ""
        },
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "Missing user message"