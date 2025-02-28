from backend.model import get_llm, get_llm_chain, create_conversation_chain
from langchain_ollama import ChatOllama
from langchain.chains import LLMChain, ConversationChain
from langchain.memory import ConversationBufferMemory
from langchain.schema import HumanMessage, AIMessage

### Test for the get_llm() function
def test_get_llm(mocker):
    """
    Test that `get_llm()` correctly initializes and returns a `ChatOllama` instance.
    """
    mock_chat_ollama = mocker.patch("backend.model.ChatOllama", autospec=True)

    llm_instance = get_llm()
    
    # Ensure ChatOllama is instantiated correctly
    mock_chat_ollama.assert_called_once_with(
        base_url=mocker.ANY,
        model=mocker.ANY,
        temperature=mocker.ANY,
        streaming=True,
        callbacks=mocker.ANY
    )
    
    assert isinstance(llm_instance, ChatOllama)  # Check for correct type


### Test for the get_llm_chain() function
def test_get_llm_chain(mocker):
    """
    Test that `get_llm_chain()` correctly initializes and returns an `LLMChain` instance.
    """
    mock_llm = mocker.patch("backend.model.get_llm", autospec=True)
    mock_llm_instance = mocker.Mock(spec=ChatOllama)
    mock_llm.return_value = mock_llm_instance

    llm_chain = get_llm_chain()

    # Verify `get_llm()` was called correctly
    mock_llm.assert_called_once()

    # Ensure valid LLMChain instance is returned
    assert isinstance(llm_chain, LLMChain)
    assert llm_chain.llm == mock_llm_instance


### Test for the create_conversation_chain() function
def test_create_conversation_chain(mocker):
    """
    Test that `create_conversation_chain()` correctly initializes and returns a `ConversationChain` instance.
    """
    mock_llm = mocker.patch("backend.model.get_llm", autospec=True)
    mock_llm_instance = mocker.Mock(spec=ChatOllama)  # Ensure proper type
    mock_llm.return_value = mock_llm_instance

    conversation_chain = create_conversation_chain()

    mock_llm.assert_called_once()

    assert isinstance(conversation_chain, ConversationChain)
    assert conversation_chain.llm == mock_llm_instance
    assert isinstance(conversation_chain.memory, ConversationBufferMemory)


def test_conversation_chain_memory():
    """
    Test that `create_conversation_chain()` correctly retains conversation context.
    """
    conversation_chain = create_conversation_chain()

    # Reset memory before starting the new conversation
    conversation_chain.memory.chat_memory.clear()

    conversation_chain.memory.save_context(
        {"input": "What are the benefits of hyaluronic acid?"},
        {"output": "Hyaluronic acid helps retain skin moisture and hydration."}
    )
    conversation_chain.memory.save_context(
        {"input": "How often should I use it?"},
        {"output": "It is safe for daily use, especially in moisturizers and serums."}
    )

    history = conversation_chain.memory.load_memory_variables({})["history"]
    
    # Ensure history contains 4 messages (2 user inputs + 2 AI responses)
    assert len(history) == 4
    assert isinstance(history[0], HumanMessage)
    assert isinstance(history[1], AIMessage)
    assert isinstance(history[2], HumanMessage)
    assert isinstance(history[3], AIMessage)

    assert history[0].content == "What are the benefits of hyaluronic acid?"
    assert history[1].content == "Hyaluronic acid helps retain skin moisture and hydration."
    assert history[2].content == "How often should I use it?"
    assert history[3].content == "It is safe for daily use, especially in moisturizers and serums."