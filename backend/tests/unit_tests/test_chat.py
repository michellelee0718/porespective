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
