import string
from unittest.mock import MagicMock, patch

import pytest

from backend.utils import generate_session_id, get_or_create_conversation


### Test for the generate_session_id() function
def test_generate_session_id_length():
    """
    Test that `generate_session_id()` generates a session ID of the correct length.
    """
    session_id = generate_session_id(16)
    assert len(session_id) == 16

    session_id = generate_session_id(8)
    assert len(session_id) == 8


def test_generate_session_id_characters():
    """
    Test that `generate_session_id()` generates a session ID containing only letters and digits.
    """
    session_id = generate_session_id(20)
    valid_chars = string.ascii_letters + string.digits
    assert all(char in valid_chars for char in session_id)


def test_generate_session_id_uniqueness():
    """
    Test that `generate_session_id()` generates unique session IDs.
    """
    session_ids = {generate_session_id(16) for _ in range(100)}
    assert len(session_ids) == 100  # Ensure all are unique


### Test for the get_or_create_conversation() function
@pytest.fixture
def mock_conversation_chain():
    """
    Mock the conversation chain object.
    """
    return MagicMock(name="MockConversationChain")


@pytest.fixture
def mock_create_conversation_chain(mock_conversation_chain):
    """
    Patch create_conversation_chain and return a mock conversation chain.
    """
    with patch(
        "backend.utils.create_conversation_chain", return_value=mock_conversation_chain
    ) as mock:
        yield mock


def test_create_new_conversation(mock_create_conversation_chain):
    """
    Test that a new conversation is created when session_id does not exist.
    """
    conversation_store = {}
    session_id = "session_123"

    result = get_or_create_conversation(conversation_store, session_id)

    assert session_id in conversation_store
    assert result is conversation_store[session_id]
    assert isinstance(result, MagicMock)
    mock_create_conversation_chain.assert_called_once()


def test_retrieve_existing_conversation(
    mock_create_conversation_chain, mock_conversation_chain
):
    """
    Test that an existing conversation is retrieved instead of creating a new one.
    """
    session_id = "session_123"
    conversation_store = {session_id: mock_conversation_chain}

    result = get_or_create_conversation(conversation_store, session_id)

    assert result is conversation_store[session_id]
    mock_create_conversation_chain.assert_not_called()


def test_multiple_sessions():
    """
    Test that multiple session IDs get separate conversation instances.
    """
    conversation_store = {}
    session_id_1 = "session_123"
    session_id_2 = "session_456"

    mock_conversation_chain_1 = MagicMock(name="MockConversationChain1")
    mock_conversation_chain_2 = MagicMock(name="MockConversationChain2")

    with patch(
        "backend.utils.create_conversation_chain",
        side_effect=[mock_conversation_chain_1, mock_conversation_chain_2],
    ):
        result_1 = get_or_create_conversation(conversation_store, session_id_1)
        result_2 = get_or_create_conversation(conversation_store, session_id_2)

    assert session_id_1 in conversation_store
    assert session_id_2 in conversation_store
    assert result_1 is conversation_store[session_id_1]
    assert result_2 is conversation_store[session_id_2]
    assert result_1 is not result_2  # Ensure different sessions get different instances
