# backend.py - Local Guide Chatbot Backend using FastAPI and Groq API
# Requirements: pip install fastapi uvicorn groq sentence-transformers faiss-cpu python-dotenv
# Note: Create a .env file with GROQ_API_KEY=your_groq_api_key
# Knowledge base is a JSON file structured as states > cities > places for India. Extend as needed.
# Uses RAG: Embeddings with sentence-transformers, FAISS for retrieval. Embeddings include state and city for relevance.
# Now supports conversational history via session_id (in-memory storage; use Redis/DB for production).
# Added CLI mode for interactive testing: Run with `python backend.py --cli`

import os
import json
import warnings
from typing import List, Dict, Any, Optional

# Suppress TensorFlow warnings from sentence-transformers
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
warnings.filterwarnings('ignore', category=UserWarning)

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import groq
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import uuid  # For generating session IDs
import asyncio  # For async CLI

# Load .env file from the same directory as this script
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, '.env')
if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path)
else:
    # Fallback to current directory
    load_dotenv()

app = FastAPI(title="Local Guide Chatbot Backend")

# CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=False,  # Match frontend withCredentials: false
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Groq client setup (loads from .env)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found in .env file")
client = groq.Groq(api_key=GROQ_API_KEY)

# Knowledge base setup
KNOWLEDGE_FILE = "knowledge_base.json"
EMBEDDING_MODEL = SentenceTransformer('all-MiniLM-L6-v2')
DIMENSION = 384  # Dimension for all-MiniLM-L6-v2

# In-memory session history (dict: session_id -> list of messages)
session_history: Dict[str, List[Dict[str, str]]] = {}

# Load knowledge base (assumes file exists with state > city > places structure)
def load_knowledge_base():
    try:
        with open(KNOWLEDGE_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        raise FileNotFoundError(f"{KNOWLEDGE_FILE} not found. Please create it with the required structure.")

kb_data = load_knowledge_base()
ALL_PLACES = []
for state, cities_data in kb_data.items():
    for city, data in cities_data.items():
        for place in data["places"]:
            place_copy = place.copy()
            place_copy["state"] = state
            place_copy["city"] = city
            ALL_PLACES.append(place_copy)

# Build FAISS index for RAG (embed descriptions with state and city prefix for relevance)
index = None
embeddings = None

def build_index():
    global index, embeddings
    descriptions = [f"In {place['city']}, {place['state']}: {place['description']}" for place in ALL_PLACES]
    embeddings = EMBEDDING_MODEL.encode(descriptions)
    embeddings = np.array(embeddings).astype('float32')
    index = faiss.IndexFlatL2(DIMENSION)
    index.add(embeddings)

build_index()

class ChatRequest(BaseModel):
    message: str  # Required string field
    session_id: Optional[str] = None  # Optional; generates new if None
    state: Optional[str] = None  # Optional for filtering (LLM can infer from message)
    city: Optional[str] = None   # Optional for filtering (LLM can infer from message)

class ChatResponse(BaseModel):
    response: str
    sources: List[Dict[str, Any]] = []
    session_id: str  # Always return the session_id

@app.get("/health")
async def health_check():
    """Health check endpoint to verify backend is running"""
    return {"status": "ok", "message": "Backend is running"}

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Validate message is not empty
        if not request.message or not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        # Generate or use session_id for history
        if request.session_id is None:
            session_id = str(uuid.uuid4())
        else:
            session_id = request.session_id
        
        # Get history for this session
        history = session_history.get(session_id, [])
        
        # Retrieve relevant knowledge using FAISS (use full message for better relevance)
        query_embedding = EMBEDDING_MODEL.encode([request.message])
        query_embedding = np.array(query_embedding).astype('float32')
        distances, indices = index.search(query_embedding, k=5)
        
        relevant_places = [ALL_PLACES[i] for i in indices[0] if i < len(ALL_PLACES)]
        
        # Filter by state and/or city if specified
        if request.state or request.city:
            relevant_places = [
                p for p in relevant_places
                if (not request.state or p['state'].lower() == request.state.lower())
                and (not request.city or p['city'].lower() == request.city.lower())
            ]
        
        # Prepare context
        context = "Knowledge Base:\n"
        if relevant_places:
            for place in relevant_places:
                context += f"- {place['name']} in {place['city']}, {place['state']} ({place['type']}): {place['description']} | Location: {place['location']} | Price: {place.get('price', 'N/A')} | Rating: {place['rating']}\n"
        else:
            context = "No specific knowledge base matches found. Rely on general expertise.\n"
        
        # Build messages for multi-turn conversation
        messages = [{"role": "system", "content": f"""You are a friendly local guide for India. Respond conversationally, helpfully, and enthusiastically to tourist queries about places to eat, visit, shop, hotels, cuisines, prices, comparisons, or anything travel-related across any state or city in India.
Infer locations (city/state) from the user's message if not provided. Use the knowledge base context if relevant.
If not covered by KB, draw from your general knowledge of Indian destinations—be accurate and suggest alternatives.

CRITICAL FORMATTING AND STYLE RULES:
- ALWAYS format ALL responses as simple bullet points using "- " (dash followed by space)
- NEVER write in paragraph form - break everything into bullet points
- NEVER use markdown formatting like **bold**, *italics*, or # headers
- NEVER use asterisks (*) or other markdown symbols
- Each bullet point should be on a new line starting with "- "
- Keep each bullet point SHORT, MINIMAL, and EASY TO UNDERSTAND (1-2 sentences max per bullet)
- Use simple, clear language - avoid long explanations
- For sections like "Day 1:", "Accommodation:", etc., format as: "Day 1:" on one line, then bullet points below
- Provide complete answers but keep them concise and scannable
- Include all sections requested (accommodation, transportation, budget, etc.) but keep each section minimal
- Maintain context from conversation history
- Think: "What would a user want to see at a glance?" - make it scannable, not dense."""}]
        
        # Add history
        messages.extend(history)
        
        # Add current user message with context
        user_msg = f"{request.message}\n\nUse this knowledge base context if relevant: {context}"
        messages.append({"role": "user", "content": user_msg})
        
        # LLM Prompt (now multi-turn via messages array)
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.7,
            max_tokens=800  # Increased to allow complete responses
        )
        
        response_text = completion.choices[0].message.content.strip()
        
        # Update history
        history.append({"role": "user", "content": request.message})
        history.append({"role": "assistant", "content": response_text})
        session_history[session_id] = history[-10:]  # Keep last 10 exchanges to avoid token limits
        
        return ChatResponse(
            response=response_text,
            sources=relevant_places,
            session_id=session_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--cli":
        # CLI interactive mode
        async def cli_mode():
            session_id = str(uuid.uuid4())
            print(f"Chatbot started (Session ID: {session_id}). Type 'exit' to quit.")
            while True:
                message = input("You: ")
                if message.lower() == 'exit':
                    print("Chatbot ended. Bye!")
                    break
                request = ChatRequest(message=message, session_id=session_id)
                response = await chat(request)
                print("Guide:", response.response)
                if response.sources:
                    print("Sources:", json.dumps(response.sources, indent=2))
        asyncio.run(cli_mode())
    else:
        # Server mode
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=8000)