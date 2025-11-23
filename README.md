# Travel-buddy: AI-Powered India Travel Chatbot

**Travel-buddy** is a full-stack AI travel assistant that helps users explore India with smart recommendations for places, hotels, restaurants, and travel tips.  
It combines **FastAPI**, **React**, **Groq LLM**, and **RAG (FAISS + embeddings)** to deliver personalized and accurate suggestions.

---

## ✨ Features

- 🤖 **AI Travel Guide** powered by Groq API  
- 🗺️ **Knowledge Base** of Indian cities, states, attractions, hotels & restaurants  
- 💬 **Conversational Chat Interface** with session management  
- 📍 **Location-aware recommendations** (state/city-based filters)  
- ⚡ **RAG Search** using Sentence Transformers + FAISS  
- 🎨 **Modern, responsive React UI**

---

## 📁 Project Structure

backend2/
├── backend/
│ ├── backend.py # FastAPI backend
│ └── knowledge_base.json # Travel knowledge data
└── frontend/
├── src/
│ ├── App.js # React main component
│ ├── App.css # Styles
│ ├── index.js # Entry point
│ └── services/
│ └── api.js # API wrapper
├── public/
└── package.json

yaml
Copy code

---

## 🧰 Prerequisites

- Python **3.8+**
- Node.js **16+** and npm
- Groq API Key → https://console.groq.com/

---

## 🚀 Setup Instructions

---

### 🔙 Backend Setup (FastAPI)

1. Go to backend folder:
   ```bash
   cd backend
Install Python dependencies:

bash
Copy code
pip install fastapi uvicorn groq sentence-transformers faiss-cpu python-dotenv
Create a .env file:

ini
Copy code
GROQ_API_KEY=your_groq_api_key_here
Start the backend server:

bash
Copy code
python backend.py
Backend runs at: http://localhost:8000

🎨 Frontend Setup (React)
Navigate to frontend:

bash
Copy code
cd frontend
Install React dependencies:

bash
Copy code
npm install
Start development server:

bash
Copy code
npm start
Frontend runs at: http://localhost:3000

🧑‍💻 Usage
Ensure both frontend & backend are running.

Open: http://localhost:3000

Ask anything, such as:

“What are the best places to visit in Mumbai?”

“Suggest good hotels in Goa.”

“What can I do in Rajasthan?”

“Where should I shop in Delhi?”

🔌 API
POST /chat
Request Body:

json
Copy code
{
  "message": "What are the best places in Mumbai?",
  "session_id": "optional-session-id",
  "state": "optional-state",
  "city": "optional-city"
}
Response:

json
Copy code
{
  "response": "Here are some great places in Mumbai...",
  "sources": [
    {
      "name": "Gateway of India",
      "type": "attraction",
      "description": "Iconic arch monument.",
      "location": "Mumbai",
      "price": "Free",
      "rating": 4.6,
      "state": "Maharashtra",
      "city": "Mumbai"
    }
  ],
  "session_id": "uuid-session-id"
}
🧠 Technologies Used
Backend
FastAPI

Groq API

Sentence Transformers

FAISS (RAG search)

Uvicorn

Python dotenv

Frontend
React

Axios

CSS3

🛠️ Development Tools
CLI Mode (Backend Only)
Run backend without frontend:

bash
Copy code
cd backend
python backend.py --cli
Environment Variables
Backend .env:

ini
Copy code
GROQ_API_KEY=your_api_key_here
Frontend (Production):

ini
Copy code
REACT_APP_API_URL=https://your-backend-url.com
🐞 Troubleshooting
Issue	Solution
Backend not responding	Ensure it runs on port 8000
Invalid API key	Check .env
CORS errors	Verify frontend proxy in package.json
Missing modules	Run npm install or pip install again






