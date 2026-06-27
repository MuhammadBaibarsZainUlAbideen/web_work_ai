from fastapi import FastAPI,Header,BackgroundTasks
from starlette.responses import StreamingResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os
from dotenv import load_dotenv
from pylatexenc.latex2text import LatexNodes2Text
from  backend.data_base import  init_db,Inserting,Get,refresh_token,extracting_data,getting_user,updating_refresh_token,deleting_everything,inserting_payment,increment_tries,get_tries,get_payment,payment_status,get_payment,stroing_embedings,stroing_question,printing_crumbs_embeddings,printing_crumbs,printing_crumbs_embedding_froentend,get_topics, Editing_crumbs
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
from backend.redis_verification import check_rate_limit,check_paid_rate_limit,check_monthly_paid_limit,check_paid_edit_rate_limit
import json
import time
import asyncio

load_dotenv()
our_secret_key = os.getenv("our_secret_key")




endpoint = "https://foundry-ai-prd-eus2-01.cognitiveservices.azure.com/"
model_name = "gpt-5.4-nano"
deployment = "gpt-5.4-nano"
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
        return
    data = await get_topics(user_id)
    final_topics =  ", ".join(item[1] for item in data)
    final_subtopics = ", ".join(item[0] for item in data)

    
    
    try:
        response = await client.chat.completions.create(
            model=deployment,
            temperature=0,
            max_completion_tokens=200,
            messages=[
                {
                    "role": "system",
                    "content": f"""
        You are a learning assistant. Extract key concepts from the solution.

        Return ONE JSON object in an array. No text outside JSON.

        Rules:
        - If you think that the asked question {problem_data.message} is not important set Store to No
        - Brief answers only like 1 or 2 sentences, no backslashes
        - Keep: questions (correct spelling), definitions, formulas, mistakes
        - Set topic to "Ignore" if unrelated to Maths, Physics, Political Science, Computer/Tech, Chemistry, or Biology
        - Combine multiple facts into one concise fact
        - "Store": Yes only if the question make sense to worth saving for later review, else No 

        [{{
        "Store": "Yes|No",
        "Question": "...",
        "fact": "..." Proper In unicode,
        "topic": "May be one of {final_topics} OR |Maths|Physics|Political Science|Computer Science|Chemistry|Biology|other",
        "Sub-Topic": "May be one of {final_subtopics} |OR| You generate new Sub-Topic based on the question asked",
        "confidence": 0-1
        }}]
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
        try:
            crumbs = json.loads(crumbs_raw)
            print(crumbs)
        except Exception as e:
            return

        if crumbs[0]["topic"].lower()  == "ignore" or crumbs[0]["Store"].lower() == "no":
            return
            
        Question_text, fact_text = await build_embedding_text(crumbs[0])
        Question_embedding, fact_embedding = await asyncio.gather(
            embed(Question_text),
            embed(fact_text)
        )
        duplicate = await is_duplicate(user_id, Question_embedding,fact_embedding)
        if duplicate:
            print("nipe")
            return
        
        await stroing_question_and_embedding(user_id,crumbs[0]["Question"],crumbs[0]["fact"],crumbs[0]["topic"],crumbs[0]["Sub-Topic"],crumbs[0]["confidence"],Question_embedding,fact_embedding)
        
        return
    except Exception as e:
        return 



@app.post("/solve")
async def solve(problem_data:Problem, authorization:str= Header(None),background_tasks: BackgroundTasks = None):
    global our_secret_key,model_name,deployment



    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, our_secret_key, algorithms=["HS256"])
        user_id = payload["key"]
    
    except ExpiredSignatureError:
        return {"logout": "false", "reason": "token_expired"}
    
    except InvalidTokenError:
        return {"answer": "Login_again", "reason": "invalid_token"}

    


    user = await getting_user(user_id)
    if not user:
        return {"answer": "Login_again"}  
    
    # total_tries = await get_tries(user_id)
    # status = await payment_status(user_id)
    total_tries,status = await asyncio.gather(
        get_tries(user_id),
        payment_status(user_id)
    )


    # Pay Wall
    if status == False and total_tries > 50:
        return {"answer":"Get the Paid version buddy, thats enough demo for you, You have made the totoal of 50 Requests", "overly":"True"}
    if status == True and not await check_paid_rate_limit(user_id):
        return {"answer": "I know You have paid version but calm down"}
    if status == True and not await check_monthly_paid_limit(user_id):
        return {"answer": "You've hit your 1,500 monthly request limit. It resets at the start of next month.Please email me at supportasolve@gmail, if you want it reset right now"}
    
    
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
  
        user_content = problem_data.message
    async def generate():
        answer = ""

        stream = await client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": """Solve the following math problem or text question. Format using Markdown.

                            ONLY apply the following math rules IF the question involves math or equations:
                                CRITICAL MATH FORMATTING RULES:
                                - ALL inline math MUST use $...$ (e.g. $x^2$)
                                - ALL display math MUST use $$...$$ on its own line
                                - NEVER use \\( \\) or \\[ \\] — ONLY $ and $$
                                - NEVER write math without delimiters
                                - ALWAYS place an explicit operator between \\right) and \\left(
                                WRONG:  \\right) \\left(   
                                CORRECT: \\right) - \\left(   or   \\right) + \\left(
                                - NEVER use unicode math symbols (∑ ∞ · ≤ ≥) — use LaTeX (\\sum \\infty \\cdot \\leq \\geq)
                                - NEVER output a $$ block that spans more than one blank line
                            FOR NON-MATH QUESTIONS:
                                - Use plain Markdown only (**, *, backticks, bullet points)
                                - Use inline code with backticks for commands, code, or file paths: `git show <hash>`
                                - NEVER use $ or $$ delimiters for non-math content
                            OTHER FORMATTING:
                                - **Bold** for step headings and final answers
                                - Bullet points for steps
                            CORRECT example:
                                The integral evaluates as
                                $$\\int_2^4 (y^2 - 3y + 5)\\,dy = \\left[\\frac{{y^3}}{{3}}\\right]_2^4$$
                                giving $\\frac{{32}}{{3}}$."""
                },
                *problem_data.history,
                {
                    "role": "user",
                    "content": user_content
                }
            ],
            max_completion_tokens=1000,
            temperature=0,
            model=deployment,
            stream=True,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices and chunk.choices[0].delta else None

            if delta:
                answer += delta
                print(answer)
                yield delta

        background_tasks.add_task(
            extract_and_store_crumbs,
            user_id,
            problem_data,
            answer
        )

        await increment_tries(user_id)



    return StreamingResponse(
        generate(),
        media_type="text/plain"
    )

@app.post("/crumbs")
async def get(authorization: str = Header(None)):
    global our_secret_key
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, our_secret_key, algorithms=["HS256"])
        user_id = payload["key"]
        data = await printing_crumbs_embedding_froentend(user_id)
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

    Refresh_token = jwt.encode(
        {"user_id": "generatingrefreshtoken", "exp": datetime.utcnow() + timedelta(days=100)},
        our_secret_key,
        algorithm="HS256"
    )
    Access_token = jwt.encode(
        {"key": user_data["id"], "exp": datetime.utcnow() + timedelta(minutes=10)},
        our_secret_key,
        algorithm="HS256"
    )
    

    decoded = jwt.decode(Refresh_token, options={"verify_signature": False})
    exp = decoded['exp']
    expiration_date = datetime.fromtimestamp(exp, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    
    
    await refresh_token(user_data["id"],Refresh_token,expiration_date,0)
   
    return {"Access_token":Access_token,"Refresh_token":Refresh_token}

@app.post("/refresh_token")
async def validating(request:RefreshTokenRequest):


    if(request == None):
        return {"log":"true"}
    data = await extracting_data(request.Refresh_token)
    if len(data) == 0:
        return {"Data":"No"}

    else:
        Access_token = jwt.encode(
            {"key": data[0][1], "exp": datetime.utcnow() + timedelta(minutes=10)},
            our_secret_key,
            algorithm="HS256"
        )

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
    

# @app.get("/admin")
# async def admin():
#     data = await Get_users()
#     final = [
#         {"name": i[0], "email": i[1], "token_status": i[2],"payment_status":i[3],"tries":i[4]} 
#         for i in data
#     ]
    
#     return {"data": final}


@app.post("/edittopic")
async def create_session(data:EditedCrumbs,authorization: str = Header(None)):
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, our_secret_key, algorithms=["HS256"])
        user_id = payload["key"]
    except ExpiredSignatureError:
        return {"Verify": "false", "reason": "token_expired"}
    except InvalidTokenError:
        return {"Verify": "false", "reason": "invalid_token"}
    if data.message["type"] == "topic" and data.message["action"] == "edit":
        await Editing_crumbs("topic",data.message["action"], user_id, data.message["prevTopic"], data.message["topic"])
    if data.message["type"] == "topic" and data.message["action"] == "delete":
        await Editing_crumbs("topic",data.message["action"], user_id, data.message["prevTopic"], data.message["topic"])
    if data.message["type"] == "subtopic" and data.message["action"] == "edit":
        await Editing_crumbs("subtopic", data.message["action"], user_id, data.message["prevTopic"],None, data.message["subtopic"], data.message["newSubtopic"])
    if data.message["type"] == "subtopic" and data.message["action"] == "delete":
        await Editing_crumbs("subtopic", data.message["action"], user_id, data.message["prevTopic"],None, data.message["subtopic"])
        
    if data.message["type"] == "fact" and data.message["action"] == "edit":
        status = await payment_status(user_id)
        if status == False:
            return {"overly":"True"}
        if not await check_paid_edit_rate_limit(user_id):
            return {"answer": "Too many edits. I know you have a premium feature but Please wait a minute.You can only edit 5 times in a minute"}
        await Editing_crumbs("fact",data.message["action"],user_id,data.message["prevTopic"],None,data.message["subtopic"],None,data.message["oldQuestion"],data.message["oldFact"],data.message["newQuestion"],data.message["newFact"])
    if data.message["type"] == "fact" and data.message["action"] == "delete":
        await Editing_crumbs("fact", data.message["action"], user_id,data.message["prevTopic"],None,data.message["subtopic"],None,data.message["question"], data.message["fact"],None,None)
    if data.message["type"] == "subtopic" and data.message["action"] == "move_to_topic":
        await Editing_crumbs("subtopic", data.message["action"], user_id,data.message["prevTopic"], data.message["newTopic"],data.message["subtopic"])
    if data.message["type"] == "fact" and data.message["action"] == "move_to_subtopic":
        await Editing_crumbs("fact", data.message["action"], user_id,data.message["prevTopic"], None,data.message["oldSubtopic"], data.message["newSubtopic"],data.message["question"], data.message["fact"])

@app.post("/create-session")
async def create_session(authorization: str = Header(None)):
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, our_secret_key, algorithms=["HS256"])
        user_id = payload["key"]
        user = await getting_user(user_id)

        if not user:
            return {"Verify": "false"}

        
        session_id = str(uuid.uuid4())
        sessions[session_id] = user_id

        
        plans_url = f"https://asolve.me/stripe.html?session_id={session_id}"
        return {"plans_url": plans_url}

    except ExpiredSignatureError:
        return {"Verify": "false", "reason": "token_expired"}
    except InvalidTokenError:
        return {"Verify": "false", "reason": "invalid_token"}
