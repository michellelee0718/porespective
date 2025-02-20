from langchain_ollama import ChatOllama
from langchain.chains import LLMChain
from prompt import prompt_template
from config.settings import LLM_BASE_URL, LLM_MODEL, LLM_TEMPERATURE
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler


def get_llm():
    """Initialize and return the LLM instance."""
    return ChatOllama(
        base_url=LLM_BASE_URL,
        model=LLM_MODEL,
        temperature=LLM_TEMPERATURE,
        streaming=True,
        callbacks=[StreamingStdOutCallbackHandler()]
    )

def get_llm_chain():
    """Create and return the LLMChain instance."""
    llm = get_llm()
    return LLMChain(llm=llm, prompt=prompt_template)
