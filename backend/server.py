from fastapi import FastAPI,Header,BackgroundTasks
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os
from dotenv import load_dotenv
from pylatexenc.latex2text import LatexNodes2Text
from data_base import Tables, Inserting, Get,refresh_token,extracting_data,getting_user,updating_refresh_token,deleting_everything,Get_users,inserting_payment,increment_tries,get_tries,get_payment,payment_status,get_payment,stroing_embedings,stroing_question,printing_crumbs_embeddings,printing_crumbs
from openai import AsyncAzureOpenAI
import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from datetime import datetime, timezone,timedelta
import base64
from io import BytesIO
from PIL import Image
from stripe_routes import router as stripe_router
import uuid
from session import sessions
from contextlib import asynccontextmanager
from building_embeding_text import build_embedding_text,embed
import numpy as np
from helper_function import is_duplicate,cosine_similarity,to_blob,stroing_question_and_embedding
import json
our_secret_key = os.getenv("our_secret_key")



load_dotenv()
endpoint = "https://foundry-ai-prd-eus2-01.cognitiveservices.azure.com/"
model_name = "gpt-5.4-mini"
deployment = "gpt-5.4-mini"
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
    await Tables()
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

# def decoding_and_reducing(image_bas64):
#     image_data = base64.b64decode(image_bas64)
#     img = Image.open(BytesIO(image_data))
#     img = img.convert('L') 
#     img = img.resize((256, 192))
#     buffer = BytesIO()
#     img.save(buffer, format='JPEG', quality=25, optimize=True)
#     buffer.seek(0)
#     new_base64 = base64.b64encode(buffer.read()).decode()
#     return new_base64

async def extract_and_store_crumbs(user_id, problem_data, answer):
    if problem_data.type == "image":
        print("Not storing the image in crumbs")
        return
    
    try:
        response = await client.chat.completions.create(
            model=deployment,
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": """
You are a learning assistant.

Extract ONLY important learning concepts from the solution.

Rules:
- Ignore filler text
- Keep only Question(as it is what user asks, only correct spellings), definitions, formulas, mistakes
- If the given question and anser has nothing to do which yu think is Maths,Physics, political Scicne than in Topic you must write Ignore
- Return JSON ONLY
- No explanations outside JSON
- And your answer must only inlcude one JSON releted to what user asks.

Format:
[
  {
    "Question": "...",
    "fact": "...",
    "topic": "Maths | Physics | Political Science | Ignore",
    "Sub-Topic": "Could be a subtopic under maths or other subject like Trgnomentry,logrithms etc",
    "confidence": 0-1
  }
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
        if crumbs[0]["topic"] == "Ignore":
            return
            
        Question_text, fact_text = await build_embedding_text(crumbs[0])
        Question_embedding = await embed(Question_text)
        fact_embedding = await embed(fact_text)
        duplicate = await is_duplicate(user_id, Question_embedding)
        if duplicate:
            print("DUPLICATE FOUND → SKIPPING STORAGE")
            return
        #Stroing in DB
        await stroing_question_and_embedding(user_id,crumbs[0]["Question"],crumbs[0]["fact"],crumbs[0]["topic"],crumbs[0]["Sub-Topic"],crumbs[0]["confidence"],Question_embedding,fact_embedding)
        # data = await printing_crumbs_embeddings()
        # print(data)
    except Exception as e:
        print("Crumb extraction failed:", e)


@app.post("/solve")
async def solve(problem_data:Problem, authorization:str= Header(None),background_tasks: BackgroundTasks = None):
    print(*problem_data.history)

    
    global our_secret_key
    # print(await get_payment())
    # print("--->",await Get())
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
    # data = await printing_crumbs(user_id)
    # print(data)
    # return data
    # expiry_data = await get_payment_expiry(user_id)
    # print("Current time :",datetime.now(timezone.utc))
    # if not expiry_data:
    #     print("a")
    #     return {"answer": "no_payment"}
    
    # expiry_str = expiry_data[0]
    # if expiry_str == None:
    #     print("nahah")
    #     pass
    # else:
    #     expiry = datetime.fromisoformat(expiry_str)
    #     print(expiry)
    #     if expiry < datetime.now(timezone.utc):

    #         print("j")
    #         return {"answer": "Expired"}




    user = await getting_user(user_id)
    if not user:
        return {"answer": "Login_again"}  
    
    total_tries = await get_tries(user_id)
    status = await payment_status(user_id)
    print(status)

    # try:
    #     status[0]
    # except:
    #     print("123")
    #     return {"answer": "False"}


    # if not status:



    if total_tries[0] >3 and not status:
        return {"answer":"False"}
    if total_tries[0] >3 and status[0][0] != "active":
        return {"answer":"False"}

    # image = decoding_and_reducing(problem_data.screenshot)
    print("sdf")
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
            - WRONG: ∑_n=1^∞n/n+2"""
                },
                *problem_data.history,
                {
                    "role": "user",
                    "content": user_content
                }
        ],
        max_completion_tokens=600,
        temperature=0,
        model=deployment
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
    
    # answer = converter.latex_to_text(answer)
    await increment_tries(user_id)

    return {"answer":answer}



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
    # deleting_everything()
    data = await Get_users()
    print(await Get())
    print(data)
    #await print(get_payment())
    final = [
        {"name": i[0], "email": i[1], "token_status": i[2],"payment_status":i[3],"tries":i[4]} 
        for i in data
    ]
    
    return {"data": final}



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

        
        plans_url = f"https://webworkaipayment.netlify.app//stripe.html?session_id={session_id}"
        print("1")
        return {"plans_url": plans_url}

    except ExpiredSignatureError:
        print("2")
        return {"Verify": "false", "reason": "token_expired"}
    except InvalidTokenError:
        return {"Verify": "false", "reason": "invalid_token"}



