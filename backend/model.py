from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain.chains import ConversationChain, LLMChain
from langchain.memory import ConversationBufferMemory
from langchain_ollama import ChatOllama

from backend.config.settings import LLM_BASE_URL, LLM_MODEL, LLM_TEMPERATURE
from backend.prompt import (
    prompt_template_followup,
    prompt_template_ingredient_summary,
    prompt_template_recommendation,
)


def get_llm() -> ChatOllama:
    """
    Initialize and return the LLM instance.

    Args:
        None

    Returns:
        ChatOllama: An instance of the ChatOllama language model.

    Description:
        This function initializes a `ChatOllama` instance.

    Example:
        >>> llm = get_llm()
        >>> print(llm)
        <ChatOllama instance>
    """
    return ChatOllama(
        base_url=LLM_BASE_URL,
        model=LLM_MODEL,
        temperature=LLM_TEMPERATURE,
        streaming=True,
        callbacks=[StreamingStdOutCallbackHandler()],
    )


def get_llm_chain() -> LLMChain:
    """
    Create and return the LLMChain instance.

    Args:
        None

    Returns:
        LLMChain: An instance of LLMChain configured with the initialized LLM and prompt template.

    Description:
        This function first initializes the LLM using `get_llm()`, then constructs an `LLMChain`
        with the given prompt template. The chain is used to process input through the model.

    Example:
        >>> llm_chain = get_llm_chain()
        >>> response = llm_chain.invoke({"input": "Hi."})
        >>> print(response)
        {'text': 'Hi! How can I assist you today?'}
    """
    llm = get_llm()
    return LLMChain(llm=llm, prompt=prompt_template_recommendation)


def create_conversation_chain() -> ConversationChain:
    """
    Create and return a conversation chain with memory.

    Args:
        None

    Returns:
        ConversationChain: An instance of `ConversationChain` configured with an initialized LLM
                           and a `ConversationBufferMemory` to store conversation context.

    Description:
        This function initializes a conversational AI chain using a language model (`LLM`) and
        a buffer memory (`ConversationBufferMemory`). The buffer memory retains previous messages
        in the session, allowing for contextual follow-ups. The function applies a predefined
        prompt template (`prompt_template_followup`) to guide the conversation.

    Example:
        >>> conversation_chain = create_conversation_chain()
        >>> response = conversation_chain.run("Tell me about safe skincare products.")
        >>> print(response)
        'Safe skincare products are those that avoid harsh chemicals and allergens. Do you have a specific concern?'
    """
    llm = get_llm()
    memory = ConversationBufferMemory(return_messages=True)
    return ConversationChain(llm=llm, memory=memory, prompt=prompt_template_followup)


def get_ingredient_summary_chain() -> LLMChain:
    llm = get_llm()
    return LLMChain(llm=llm, prompt=prompt_template_ingredient_summary)
