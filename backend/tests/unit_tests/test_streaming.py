import json
from contextlib import closing

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


def test_recommend_streaming_response(client):
    """Test that /recommend endpoint returns a streaming response"""
    test_data = {
        "product_name": "Test Product",
        "ingredients": [
            {"name": "Ingredient A", "score": "1"},
            {"name": "Ingredient B", "score": "7"},
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


def test_chat_streaming_response(client):
    """Test that /chat endpoint returns a streaming response"""
    # First create a session through /recommend
    initial_data = {
        "product_name": "Test Product",
        "ingredients": [{"name": "Test Ingredient", "score": "1"}],
        "user_profile": {
            "skinType": "Normal",
            "skinConcerns": "None",
            "allergies": "None",
        },
    }

    # Use context manager for initial request
    with client.post("/recommend", json=initial_data) as initial_response:
        session_id = initial_response.headers["X-Session-Id"]
        # Read the initial response to completion
        if hasattr(initial_response, "response"):
            chunks = read_stream_response(initial_response)

    # Now test chat endpoint
    chat_data = {"session_id": session_id, "message": "Is this product safe?"}

    # Use context manager for chat request
    with client.post(
        "/chat", json=chat_data, headers={"Accept": "text/event-stream"}
    ) as response:
        # Check response headers - allow for charset in Content-Type
        assert "text/event-stream" in response.headers["Content-Type"]

        # Read and verify streaming response
        chunks = read_stream_response(response)

        # Verify we got some chunks
        assert len(chunks) > 0
        # Combine chunks to verify complete response
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
