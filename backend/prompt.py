from langchain.prompts import PromptTemplate

prompt_template_recommendation = PromptTemplate(
    input_variables=["input"],
    template=(
        "You are a helpful skincare recommendation assistant.\n"
        "The user provided this product information:\n"
        "{input}\n\n"
        "Should the user use this product? Provide a concise explanation within 80 words."
        "Provide your response in text format without any special formatting, headers, or bullet points."
        "Always refer to the user as 'you' and avoid using 'the user'. "
    ),
)

prompt_template_followup = PromptTemplate(
    input_variables=["history", "input"],
    template=(
        "You are a helpful skincare recommendation assistant.\n"
        "Here is your previous conversation with the user:\n"
        "{history}\n\n"
        "The user now asks:\n"
        "{input}\n\n"
        "Provide a concise response within 100 words."
        "Always refer to the user as 'you' and avoid using 'the user'. "
    ),
)
