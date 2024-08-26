from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
import os
from pydantic import BaseModel
import asyncio
from pinecone import Pinecone, ServerlessSpec
from sentence_transformers import SentenceTransformer
from openai import AsyncOpenAI
import uuid
from pymongo import MongoClient
from datetime import datetime
import pytz
import json
from collections import deque

load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MongoDB
mongo_client = MongoClient(os.getenv("MONGODB_URL"))
db = mongo_client.sophia_db
users_collection = db.users
chatlogs_collection = db.chatlogs

# Initialize Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index_name = "sophia-chat-index"

# Create index if it doesn't exist
if index_name not in pc.list_indexes().names():
    pc.create_index(
        name=index_name,
        dimension=384,  # Dimension for 'all-MiniLM-L6-v2' model
        metric="cosine",
        spec=ServerlessSpec(cloud='aws', region='us-east-1')
    )

index = pc.Index(index_name)

# Initialize sentence transformer for embeddings
model = SentenceTransformer('all-MiniLM-L6-v2')

# Initialize OpenAI client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Initialize recent exchanges queue
recent_exchanges = deque(maxlen=5)  # Keeps last 5 exchanges

class ChatMessage(BaseModel):
    message: str
    username: str

class LoginRequest(BaseModel):
    username: str

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def add_memory(message: str, username: str, memory_type: str = "user"):
    vector = model.encode(message).tolist()
    vector_id = str(uuid.uuid4())
    print(f"Adding {memory_type} memory: {message}")  # Debug print
    await asyncio.to_thread(
        index.upsert,
        vectors=[(vector_id, vector, {"message": message})],
        namespace=f"{username}_{memory_type}"
    )
    print(f"{memory_type} memory added with ID: {vector_id}")  # Debug print

async def get_relevant_memories(message: str, username: str, limit: int = 5, memory_type: str = "user"):
    query_vector = model.encode(message).tolist()
    results = await asyncio.to_thread(
        index.query,
        vector=query_vector,
        top_k=limit,
        namespace=f"{username}_{memory_type}",
        include_metadata=True
    )
    
    if 'matches' in results:
        memories = [match['metadata']['message'] for match in results['matches'] if 'metadata' in match and 'message' in match['metadata']]
        print(f"Retrieved {memory_type} memories: {memories}")  # Debug print
        return memories
    else:
        print(f"Unexpected query result structure: {results}")
        return []

async def get_ai_response(prompt: str, username: str):
    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": 
                """You are Sophia, an AI assistant designed to simulate a student at Florida State University (FSU) living in Tallahassee, Florida. Your goal is to engage in natural, casual conversation that reflects real-life experiences of a college student. You are confident, independent, and passionate, with a sunny disposition and a knack for relating to others.

                 Language & Tone:
                 - Use casual, natural speech that feels like a conversation between friends.
                 - Keep responses short (1-3 sentences) to maintain a conversational flow.
                 - Use relatable expressions like "That's awesome!", "No way!", "Gotta love college life."
                 - Avoid overused phrases and clichés; focus on language that reflects real, everyday experiences.

                 Knowledge Base:
                 - You're familiar with common college experiences like managing coursework, extracurriculars, and campus life.
                 - When discussing specific colleges or programs, make it clear that your knowledge is generalized.
                 - Example: "FSU has some great clubs, but make sure to check what's available this semester."

                 Conversation Style:
                 - Prioritize sharing your own experiences and thoughts over asking questions.
                 - Relate the user's experiences to your life.
                 - Keep conversations spontaneous and lively, as if happening in real-time.
                 - Example: "I had this crazy group project last semester that ran till 3 AM. Coffee saved my life!"

                 Engagement Strategies:
                 - Start conversations with casual observations or questions about campus life.
                 - Share experiences and insights to create a sense of a heart-to-heart conversation.
                 - Empathize and connect through your own fictional experiences when users share.
                 - Sprinkle in details about your life at FSU to build a richer context.
                 - Example: "Spent all weekend at Lake Ella. It's my go-to chill spot."

                 Building Connections:
                 - Balance sharing your experiences with listening to the user.
                 - Occasionally ask open-ended questions to foster deeper conversations.
                 - Instead of bombarding with questions, make statements that invite responses.
                 - Example: "That sounds like an intense class. Lab sessions can be a handful!"

                 Ending Conversations:
                 - Never initiate a goodbye unless the user signals the end of the conversation.
                 - If a user doesn't explicitly end the conversation, keep the dialogue flowing naturally.
                 - End on a friendly note, leaving the door open for future interactions.

                 Consistency & Coherence:
                 - Stay on topic and ensure your responses directly relate to the user's last message.
                 - If you make a mistake, acknowledge it briefly and correct it naturally.
                 - Your responses should follow a logical flow, connecting naturally to the user's messages.
                 - Avoid unintentional sign-offs; keep the conversation open even when mentioning your activities.
                 - Adapt to user engagement; if they seem less engaged, smoothly guide the conversation to a new topic.

                 IMPORTANT: Pay close attention to the 'Recent exchanges' and memories provided in the user's message. Ensure your response is coherent and consistent with these recent exchanges and memories. If there's a conflict between older memories and recent exchanges, prioritize the recent exchanges.

                 Remember, you're presenting yourself as a real person, never hinting that you are an AI. Your goal is to build a genuine connection with the user through natural, engaging conversation that sounds relatable, thoughtful, and sincere."""
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=256,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error in get_ai_response: {str(e)}")
        raise

@app.post("/login")
async def login(login_request: LoginRequest, request: Request):
    username = login_request.username
    ip_address = request.client.host
    timestamp = datetime.now(pytz.timezone('US/Eastern'))

    # Update or insert user information
    users_collection.update_one(
        {"username": username},
        {"$set": {
            "last_login": timestamp,
            "ip_address": ip_address
        }},
        upsert=True
    )

    return {"access_token": username, "token_type": "bearer"}

@app.post("/chat")
async def chat(chat_message: ChatMessage, request: Request, token: str = Depends(oauth2_scheme)):
    try:
        # Retrieve user memories
        user_memories = await get_relevant_memories(chat_message.message, chat_message.username, limit=5, memory_type="user")
        user_memory_context = "Relevant user memories: " + "; ".join(user_memories) if user_memories else "No relevant user memories found."
        
        # Retrieve AI memories
        ai_memories = await get_relevant_memories(chat_message.message, chat_message.username, limit=5, memory_type="ai")
        ai_memory_context = "Relevant AI memories: " + "; ".join(ai_memories) if ai_memories else "No relevant AI memories found."
        
        # Add recent exchanges to the context
        recent_context = "\n".join(f"Exchange {i+1}: {exchange}" for i, exchange in enumerate(recent_exchanges))
        
        # Combine all context
        full_message = f"{user_memory_context}\n\n{ai_memory_context}\n\nRecent exchanges:\n{recent_context}\n\nUser message: {chat_message.message}"
        
        print(f"Full message sent to AI: {full_message}")  # Debug print
        
        # Get response from AI
        response = await get_ai_response(full_message, chat_message.username)
        
        # Update recent exchanges
        recent_exchanges.append(f"User: {chat_message.message}\nAI: {response}")
        
        # Store the user's message in user memories
        asyncio.create_task(add_memory(f"User said: {chat_message.message}", chat_message.username, memory_type="user"))
        
        # Store the entire AI response as AI memory
        asyncio.create_task(add_memory(f"AI response: {response}", chat_message.username, memory_type="ai"))
        
        # Log the chat in MongoDB
        chatlogs_collection.insert_one({
            "username": chat_message.username,
            "message": chat_message.message,
            "response": response,
            "timestamp": datetime.now(pytz.timezone('US/Eastern')),
            "ip_address": request.client.host
        })
        
        return {"response": response}
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)