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
        "If the user profile doesn't have anything specified, you should also tell them to fill in their profile information. "
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

prompt_template_ingredient_summary = PromptTemplate(
    input_variables=["ingredients"],
    template=(
        "You are a skincare expert analyzing ingredient lists.\n"
        "Given this skincare ingredient list:\n"
        "{ingredients}\n\n"
        "The hazard score represents the potential risk level of the ingredient. "
        "A lower score (1-2) means it's considered low risk, 3-6 indicates moderate risk, "
        "and 7-10 suggests a higher hazard potential. "
        "Extract the **5 most relevant skincare benefits** as a structured JSON array.\n"
        "Focus on properties like Hydrating, Exfoliating, Soothing, Brightening, Antioxidant, etc.\n"
        "Return only a **valid JSON list** with no extra text.\n"
        'Example output: ["Hydrating", "Brightening", "Exfoliating", "Soothing", "Antioxidant"]'
    ),
)
