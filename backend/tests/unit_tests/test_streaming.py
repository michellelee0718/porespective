import json
from contextlib import closing
from unittest.mock import MagicMock, patch

import pytest

from backend.server import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def read_stream_response(response):
    """Helper function to safely read streaming response"""
    chunks = []
    try:
        # Use closing to ensure proper cleanup of the response
        with closing(response.response) as stream:
            for chunk in stream:
                chunk_str = chunk.decode("utf-8")
                if chunk_str.startswith("data: "):
                    data = json.loads(chunk_str[6:])  # Remove 'data: ' prefix
                    assert "content" in data
                    chunks.append(data["content"])
    finally:
        # Ensure response is closed
        if hasattr(response, "close"):
            response.close()
    return chunks


@pytest.fixture
def mock_llm():
    with patch("backend.server.get_llm") as mock:
        # Create a mock LLM that returns streamed responses
        mock_instance = MagicMock()
        mock_instance.stream.return_value = [
            {"content": "Test"},
            {"content": " response"},
            {"content": " stream"},
        ]
        mock.return_value = mock_instance
        yield mock


def test_recommend_streaming_response(client, mock_llm):
    """Test that /recommend endpoint returns a streaming response"""
    test_data = {
        "product_name": "Test Product",
        "ingredients": [
            {"name": "Ingredient A", "score": "1", "concerns": ["Concern X"]},
            {"name": "Ingredient B", "score": "7", "concerns": ["Concern Y"]},
        ],
        "user_profile": {
            "skinType": "Normal",
            "skinConcerns": "None",
            "allergies": "None",
        },
    }

    with client.post(
        "/recommend", json=test_data, headers={"Accept": "text/event-stream"}
    ) as response:
        # Check response headers - allow for charset in Content-Type
        assert "text/event-stream" in response.headers["Content-Type"]
        assert "X-Session-Id" in response.headers

        # Read and verify streaming response
        chunks = read_stream_response(response)

        # Verify we got some chunks
        assert len(chunks) > 0
        # Combine chunks to verify complete response
        full_response = "".join(chunks)
        assert len(full_response) > 0


def test_chat_streaming_response(client, mock_llm):
    """Test that /chat endpoint returns a streaming response"""
    # Mock the LLM responses for both recommend and chat endpoints
    mock_responses = [
        {"content": "Test"},
        {"content": " response"},
        {"content": " stream"},
    ]

    # Configure mock to return the same response for both calls
    mock_llm.return_value.stream.return_value = mock_responses

    initial_data = {
        "product_name": "Test Product",
        "ingredients": [
            {"name": "Test Ingredient", "score": "1", "concerns": ["Concern X"]}
        ],
        "user_profile": {
            "skinType": "Normal",
            "skinConcerns": "None",
            "allergies": "None",
        },
    }

    # First create a session through /recommend
    with client.post("/recommend", json=initial_data) as initial_response:
        session_id = initial_response.headers["X-Session-Id"]
        if hasattr(initial_response, "response"):
            chunks = read_stream_response(initial_response)

    # Mock needs to be reconfigured for chat response
    mock_llm.return_value.stream.return_value = [
        {"content": "Chat"},
        {"content": " response"},
        {"content": " test"},
    ]

    chat_data = {"session_id": session_id, "message": "Is this product safe?"}

    # Test chat endpoint
    with patch("backend.server.get_or_create_conversation") as mock_get_conv:
        # Configure the conversation chain mock
        mock_chain = MagicMock()
        mock_chain.llm = mock_llm.return_value
        mock_chain.memory.buffer = "Previous conversation history"
        mock_get_conv.return_value = mock_chain

        with client.post(
            "/chat", json=chat_data, headers={"Accept": "text/event-stream"}
        ) as response:
            assert "text/event-stream" in response.headers["Content-Type"]
            chunks = read_stream_response(response)
            assert len(chunks) > 0
            full_response = "".join(chunks)
            assert len(full_response) > 0


def test_streaming_error_handling(client):
    """Test error handling in streaming responses"""
    # Test with invalid data
    invalid_data = {
        "product_name": "Test Product",
        # Missing required fields
    }

    with client.post(
        "/recommend", json=invalid_data, headers={"Accept": "text/event-stream"}
    ) as response:
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "error" in data
