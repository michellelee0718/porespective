import random
import string

from backend.model import create_conversation_chain


def generate_session_id(length=16) -> string:
    """
    Generate a random session ID.

    Args:
        length (int, optional): The length of the generated session ID. Defaults to 16.

    Returns:
        str: A randomly generated session ID of the specified length.

    Example:
        >>> session_id = generate_session_id(8)
        >>> print(session_id)  # e.g., 'abc123DEF'
        >>> len(session_id)
        8
    """
    return "".join(random.choices(string.ascii_letters + string.digits, k=length))


def get_or_create_conversation(conversation_store: dict, session_id: str) -> dict:
    """
    Retrieve or create a conversation chain for the given session ID.

    This function checks if a conversation chain already exists in the global
    `conversation_store` for the provided `session_id`. If it does not exist,
    a new conversation chain is created via `create_conversation_chain()` and
    stored under `conversation_store[session_id]`.

    Args:
        session_id (str): The unique identifier for the user's session or conversation.

    Returns:
        ConversationChain: A conversation chain instance (e.g., from LangChain),
        which includes memory to track the ongoing conversation.

    Example:
        >>> # Suppose 'conversation_store' is a global dictionary
        >>> # and 'create_conversation_chain()' returns a ConversationChain object.
        >>> chain = get_or_create_conversation("user123")
        >>> # If 'user123' did not exist in conversation_store before,
        >>> # it will be created and stored. Otherwise, the existing chain is returned.
    """
    if session_id not in conversation_store:
        conversation_store[session_id] = create_conversation_chain()
    return conversation_store[session_id]
