from langchain_ollama import ChatOllama
from langchain.chains import LLMChain
from backend.prompt import prompt_template
from backend.config.settings import LLM_BASE_URL, LLM_MODEL, LLM_TEMPERATURE
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler


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
        callbacks=[StreamingStdOutCallbackHandler()]
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
    return LLMChain(llm=llm, prompt=prompt_template)
