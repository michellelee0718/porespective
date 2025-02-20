from langchain.prompts import PromptTemplate

prompt_template = PromptTemplate(
    input_variables=["input"],  
    template=(
        "You are a helpful skincare recommendation assistant.\n"
        "The user provided this product information:\n"
        "{input}\n\n"
        "Should the user use this product? Provide a concise explanation within 50 words."
    )
)
