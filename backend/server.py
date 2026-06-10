from fastapi import FastAPI,Header,BackgroundTasks
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os
from dotenv import load_dotenv
from pylatexenc.latex2text import LatexNodes2Text
from  backend.data_base import  init_db,Inserting,Get,refresh_token,extracting_data,getting_user,updating_refresh_token,deleting_everything,Get_users,inserting_payment,increment_tries,get_tries,get_payment,payment_status,get_payment,stroing_embedings,stroing_question,printing_crumbs_embeddings,printing_crumbs,printing_crumbs_embedding_froentend,get_topics, Editing_crumbs
from openai import AsyncAzureOpenAI
import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from datetime import datetime, timezone,timedelta
import base64
from io import BytesIO
from PIL import Image
from backend.stripe_routes import router as stripe_router
import uuid
from backend.session import sessions
from contextlib import asynccontextmanager
from backend.building_embeding_text import build_embedding_text,embed
import numpy as np
from backend.helper_function import is_duplicate,cosine_similarity,to_blob,stroing_question_and_embedding
from backend.redis_verification import check_rate_limit, get_cached_answer, set_cached_answer,check_paid_rate_limit
import json
import time
import asyncio

load_dotenv()
our_secret_key = os.getenv("our_secret_key")




endpoint = "https://foundry-ai-prd-eus2-01.cognitiveservices.azure.com/"
model_name = "gpt-4o-mini"
deployment = "gpt-4o-mini"
subscription_key = os.getenv("subscription_key")
api_version = "2024-12-01-preview"
client = AsyncAzureOpenAI(
    api_version=api_version,
    azure_endpoint=endpoint,
    api_key=subscription_key,
)




converter = LatexNodes2Text()
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(lifespan=lifespan)

app.include_router(stripe_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



class Problem(BaseModel):
    message: str
    type:str
    history:list
class Geti(BaseModel):
    Auth: dict
class RefreshTokenRequest(BaseModel):
    Refresh_token: str
class EditedCrumbs(BaseModel):
    message:dict


async def extract_and_store_crumbs(user_id, problem_data, answer):
    if problem_data.type == "image":
        print("Not storing the image in crumbs")
        return
    data = await get_topics(user_id)
    final_subtopics = ", ".join(item[0] for item in data)
    print(final_subtopics)
    
    for attempt in range(3):
        try:
            response = await client.chat.completions.create(
                model=deployment,
                temperature=0,
                messages=[
                    {
                        "role": "system",
                        "content": f"""
    You are a learning assistant.

    Extract ONLY important learning concepts from the solution.

    Rules:
    - Ignore filler text
    - Never use backslashes
    - Keep only Questions(only correct spellings), definitions, formulas, and mistakes
    - If the question and answer are unrelated to Maths, Physics, or Political Science, set topic to "Ignore"
    - First check whether the Sub-Topic matches to one of the Available subtopics
    - Only create a new Sub-Topic if none match
    - Return JSON ONLY
    - No explanations outside JSON
    - Return exactly ONE object inside the JSON array
    - Never return multiple objects
    - If multiple facts exist, combine them into a single concise fact

    Format:
    [
      {{
        "Question": "...",
        "fact": "...",
        "topic": "Maths | Physics | Political Science | Ignore",
        "Sub-Topic": "May be one of: {final_subtopics} or a new one which you think from the question if none match",
        "confidence": 0-1
      }}
    ]
    """
                    },
                    {
                        "role": "user",
                        "content": f"""
    Question:
    {problem_data.message}

    Answer:
    {answer}
    """
                    }
                ]
            )

            crumbs_raw = response.choices[0].message.content
            print(crumbs_raw)
            try:
                crumbs = json.loads(crumbs_raw)
            except Exception as e:
                print("JSON parse failed:", e)
                return

            if crumbs[0]["topic"].lower()  == "ignore" :
                return
                
            Question_text, fact_text = await build_embedding_text(crumbs[0])
            Question_embedding = await embed(Question_text)
            fact_embedding = await embed(fact_text)
            duplicate = await is_duplicate(user_id, Question_embedding,fact_embedding)
            if duplicate:
                print("DUPLICATE FOUND → SKIPPING STORAGE")
                return
            
            await stroing_question_and_embedding(user_id,crumbs[0]["Question"],crumbs[0]["fact"],crumbs[0]["topic"],crumbs[0]["Sub-Topic"],crumbs[0]["confidence"],Question_embedding,fact_embedding)
           
            return
        except Exception as e:
            print(f"Crumb extraction attempt {attempt + 1} failed:", e)
            if attempt < 2:
                await asyncio.sleep(2)
            else:
                print("Max retries reached for crumb extraction.")


@app.post("/solve")
async def solve(problem_data:Problem, authorization:str= Header(None),background_tasks: BackgroundTasks = None):
    print(*problem_data.history)
    # await deleting_everything()
    # return

    
    global our_secret_key
    # print(await get_payment())
    # #await deleting_everything()

    #await adding_column()


    token = authorization.replace("Bearer ", "")

    if token == "undefined":
        return {"answer":"Login_again"}
    print(token)
    
    try:
        print("Hjk")
        payload = jwt.decode(token,our_secret_key,algorithms=["HS256"])
        print("jn")
        user_id = payload["key"]
        print("ujn")

    except ExpiredSignatureError:
        print("as")
        return {"answer":"Login_again"}
    
    # if not await check_rate_limit(user_id):
    #     print("rate limit reached")
    #     return {"answer": "Too many requests. Please wait a minute."}
    # if problem_data.type != "image":
    #     cached = await get_cached_answer(problem_data.message)
    #     if cached:
    #         print("answer:", cached["answer"])
    #         return {"answer": cached["answer"]}

    user = await getting_user(user_id)
    if not user:
        print("1")
        return {"answer": "Login_again"}  
    
    total_tries = await get_tries(user_id)
    status = await payment_status(user_id)
    print(status)


    # Pay Wall
    if not status and total_tries > 500:
        return {"answer":"False", "overly":"True"}
    if not status and not await check_rate_limit(user_id):
        return {"answer": "Too many requests. Please wait a minute.Or get the premimum","overly":"True"}
    if not await check_paid_rate_limit(user_id):
        return {"answer": "I know You have paid version but calm down"}
    
    user_content = []
    if problem_data.type == "image":
        user_content = [
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{problem_data.message}",
                    "detail": "low"
                }
            }
        ]
    else:
        print("1")
        user_content = problem_data.message
        print("2")
        print(user_content)
    

    response1 = await client.chat.completions.create(
        messages = [
                {
                    "role": "system",
                    "content": f"""Solve the following math problem, or any subject text question given to you. Format your response using Markdown:
            - Use **bold** for Steps Headings,important things and final answers
            - Use bullet points for steps
            - If an image  is sent in your repsone you must mention i nthe heading Image
            - YOU MUST wrap every math expression in $ or $$
            - NEVER use unicode symbols like ∑ ∞ · — use LaTeX commands like \\sum \\infty \\cdot
            - WRONG: ∑_n=1^∞n/n+2
            - Get_users() is the  function to get the users"""
            
                },
                *problem_data.history,
                {
                    "role": "user",
                    "content": user_content
                }
        ],
        max_completion_tokens=600,
        temperature=0,
        model=deployment,
        stream=True
    )
    print("3")
    print("sd")
    
    answer = response1.choices[0].message.content

    background_tasks.add_task(
        extract_and_store_crumbs,
        user_id,
        problem_data,
        answer
    )
    print(response1.usage)
    
    await increment_tries(user_id)



    return {"answer":answer}

@app.post("/crumbs")
async def get(authorization: str = Header(None)):
    global our_secret_key
    token = authorization.replace("Bearer ", "")
    print(token)
    try:
        payload = jwt.decode(token, our_secret_key, algorithms=["HS256"])
        user_id = payload["key"]
        data = await printing_crumbs_embedding_froentend(user_id)
        print(data)
        return {"Crumbs": data, "Status":"True"}
    
    except ExpiredSignatureError:
        return {"logout": "false", "reason": "token_expired"}
    
    except InvalidTokenError:
        return {"logout": "false", "reason": "invalid_token"}




@app.post("/get")
async def get(data:Geti):
    global our_secret_key
    user_data = data.Auth
    await Inserting(user_data["id"],user_data["email"],user_data["name"],user_data["given_name"],user_data["family_name"],user_data["picture"])
    # await inserting_payment(user_data["id"],0,0,None)

    Refresh_token = jwt.encode(
        {"user_id": "generatingrefreshtoken", "exp": datetime.utcnow() + timedelta(days=100)},
        our_secret_key,
        algorithm="HS256"
    )
    Access_token = jwt.encode(
        {"key": user_data["id"], "exp": datetime.utcnow() + timedelta(seconds=10)},
        our_secret_key,
        algorithm="HS256"
    )
    

    print(Refresh_token)
    decoded = jwt.decode(Refresh_token, options={"verify_signature": False})
    print("hello")
    exp = decoded['exp']
    print("hello")
    expiration_date = datetime.fromtimestamp(exp, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    print("hello")

    
    
    await refresh_token(user_data["id"],Refresh_token,expiration_date,0)
   
    return {"Access_token":Access_token,"Refresh_token":Refresh_token}

@app.post("/refresh_token")
async def validating(request:RefreshTokenRequest):


    print("yellow")
    if(request == None):
        return {"log":"true"}
    print(request.Refresh_token)
    data = await extracting_data(request.Refresh_token)
    print(data)
    if len(data) == 0:
        print("yellow1")
        return {"Data":"No"}

    else:
        print("yellow2")
        Access_token = jwt.encode(
            {"key": data[0][1], "exp": datetime.utcnow() + timedelta(seconds=10)},
            our_secret_key,
            algorithm="HS256"
        )
        print("yellow3")


        return {"Data":Access_token}
        


@app.post("/logout")
async def logout(authorization: str = Header(None)):
    global our_secret_key
    token = authorization.replace("Bearer ", "")
    
    try:
        payload = jwt.decode(token, our_secret_key, algorithms=["HS256"])
        user_id = payload["key"]
        await updating_refresh_token(user_id)
        return {"logout": "true"}
    
    except ExpiredSignatureError:
        return {"logout": "false", "reason": "token_expired"}
    
    except InvalidTokenError:
        return {"logout": "false", "reason": "invalid_token"}
    

@app.get("/admin")
async def admin():
    data = await Get_users()
    print(await Get())
    print(data)
    #await print(get_payment())
    final = [
        {"name": i[0], "email": i[1], "token_status": i[2],"payment_status":i[3],"tries":i[4]} 
        for i in data
    ]
    
    return {"data": final}


@app.post("/edittopic")
async def create_session(data:EditedCrumbs,authorization: str = Header(None)):
    token = authorization.replace("Bearer ", "")
    print("yuio", token)
    try:
        payload = jwt.decode(token, our_secret_key, algorithms=["HS256"])
        user_id = payload["key"]
        user = await getting_user(user_id)
        if not user:
            return {"Verify": "false"}
    except ExpiredSignatureError:
        print("2")
        return {"Verify": "false", "reason": "token_expired"}
    except InvalidTokenError:
        return {"Verify": "false", "reason": "invalid_token"}
    print(data)
    if data.message["type"] == "topic" and data.message["action"] == "edit":
        await Editing_crumbs("topic",data.message["action"], user_id, data.message["prevTopic"], data.message["topic"])
        print("good")
    if data.message["type"] == "topic" and data.message["action"] == "delete":
        await Editing_crumbs("topic",data.message["action"], user_id, data.message["prevTopic"], data.message["topic"])
    if data.message["type"] == "subtopic" and data.message["action"] == "edit":
        await Editing_crumbs("subtopic", data.message["action"], user_id, data.message["prevTopic"],None, data.message["subtopic"], data.message["newSubtopic"])

    if data.message["type"] == "subtopic" and data.message["action"] == "delete":
        await Editing_crumbs("subtopic", data.message["action"], user_id, data.message["prevTopic"],None, data.message["subtopic"])
        
    if data.message["type"] == "fact" and data.message["action"] == "edit":
        print(data)
        await Editing_crumbs("fact",data.message["action"],user_id,data.message["prevTopic"],None,data.message["subtopic"],None,data.message["oldQuestion"],data.message["oldFact"],data.message["newQuestion"],data.message["newFact"])
    if data.message["type"] == "fact" and data.message["action"] == "delete":
        print(data)
        await Editing_crumbs("fact", data.message["action"], user_id,data.message["prevTopic"],None,data.message["subtopic"],None,data.message["question"], data.message["fact"],None,None)
    if data.message["type"] == "subtopic" and data.message["action"] == "move_to_topic":
        await Editing_crumbs("subtopic", data.message["action"], user_id,data.message["prevTopic"], data.message["newTopic"],data.message["subtopic"])
    elif data.message["type"] == "fact" and data.message["action"] == "move_to_subtopic":
        await Editing_crumbs("fact", data.message["action"], user_id,data.message["prevTopic"], None,data.message["oldSubtopic"], data.message["newSubtopic"],data.message["question"], data.message["fact"])

    


    





@app.post("/create-session")
async def create_session(authorization: str = Header(None)):
    token = authorization.replace("Bearer ", "")
    print("yuio", token)
    try:
        payload = jwt.decode(token, our_secret_key, algorithms=["HS256"])
        user_id = payload["key"]
        user = await getting_user(user_id)

        if not user:
            return {"Verify": "false"}

        
        session_id = str(uuid.uuid4())
        sessions[session_id] = user_id
        print(session_id) 

        
        plans_url = f"https://webworkaipayment.netlify.app/stripe.html?session_id={session_id}"
        print("1")
        return {"plans_url": plans_url}

    except ExpiredSignatureError:
        print("2")
        return {"Verify": "false", "reason": "token_expired"}
    except InvalidTokenError:
        return {"Verify": "false", "reason": "invalid_token"}
