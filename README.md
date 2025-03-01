#  Porespective
Find your next favorite skincare product with **Porespective**.

## 💻 Features
- User-Authentication and Google Login
- Product Search for Detailed Ingredient Information
- Personalized AI Recommendation for the Product

## 💫 What is it?
Porespective is a web application built with
[Firebase](https://firebase.google.com/) and [React](https://reactjs.org/) that ...

## 🧳 How to Locally Host App
## Frontend
1. Open the terminal
2. Clone the Git repository with ```$ git clone https://github.com/michellelee0718/porespective```
3. After cloning, run ```$ npm install``` to install all necessary dependencies
4. Then run ```$ npm start``` to launch the app

## Backend
### Install the Dependencies
1. Create and activate a virtual environment: ```python -m venv venv```; Mac/Linux: ```source venv/bin/activate```; Windows: ```venv\Scripts\activate```; conda: ```conda create --name {environment_name} python=3.11``` and ```conda activate {environment_name}```
2. Install backend dependencies: ```pip install -r requirements.txt```

### Launch the LLM
1. Install Ollama following the requirement on [Ollama](https://github.com/ollama/ollama).
2. Download a model on your local computer. For example, if we want to launch llama3.2, 
run ```ollama run llama3.2```
3. Start the server by running ```ollama serve```. It runs on ```127.0.0.1:11434``` by default, 
but you can specify a different address. For example:
```OLLAMA_HOST=127.0.0.1:11500 ollama serve```
4. Set the enviornment file. In the ```.env``` file, set the model configuration. For example,
```
LLM_BASE_URL=http://127.0.0.1:11500 # Address that is serving the model
LLM_MODEL=llama3.2 # Model name
LLM_TEMPERATURE=0.0 # Controls the randomness of a model's output. Lower values mean the responses are more deterministic and higher values increases variability.
```

### Start the Server
1. Start the server by running ```python -m backend.server```.
---

## Tests
Frontend tests: 
https://github.com/michellelee0718/porespective/tree/main/src/tests

Backend tests:
https://github.com/michellelee0718/porespective/tree/main/backend/tests

To run all the backend tests:

1. Run ```pip install pytest```
2. Run ```pytest backend/tests -v```


## Project Structure:
```
.
├── README.md
├── backend
│   ├── __init__.py
│   ├── config
│   │   ├── __init__.py
│   │   └── settings.py
│   ├── model.py
│   ├── prompt.py
│   ├── scraper.py
│   ├── server.py
│   └── tests
│       ├── __init__.py
│       └── test_server.py
├── public
│   ├── index.html
│   ├── magnifying-glass.png
│   └── manifest.json
├── src
│   ├── App.css
│   ├── App.js
│   ├── App.test.js
│   ├── components
│   │   ├── Dropdown.js
│   │   ├── ThemeToggle.js
│   │   └── search.js
│   ├── context
│   │   └── ThemeContext.js
│   ├── firebase-config.js
│   ├── index.css
│   ├── index.js
│   ├── pages
│   │   ├── Home.js
│   │   ├── Login.js
│   │   ├── Profile.js
│   │   ├── Results.css
│   │   └── Results.js
│   ├── reportWebVitals.js
│   ├── setupTests.js
│   └── tests
│       └── ThemeToggle.test.js
├── .gitignore
├── requirements.txt
├── package.json
├── package-lock.json
```

**Porespective** was created by 
