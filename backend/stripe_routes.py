import stripe
from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from fastapi import APIRouter
from data_base import Get,updating_payment,adding_column,inserting_payment,payment_status
import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from session import sessions
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone

load_dotenv()
router = APIRouter()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")


PRICE_ID = os.getenv("PRICE_ID")
STRIPE_PUBLISHABLE_KEY = "pk_test_51SRgl49GbHif2Fu7bxaNVCq8kRAbeyujPU2695cxatzAznRZkeRCNPrT1BkeS85Pes4zO8Kv4F2ZMK9QCrpC4WIx00eerYs4gL"
our_secret_key = os.getenv("our_secret_key")





def converting(token):
    global our_secret_key
    try:
        payload = jwt.decode(token, our_secret_key, algorithms=["HS256"])
        return payload["key"]
    except ExpiredSignatureError:
        return "expired"
    except InvalidTokenError:
        return "invalid"



@router.post("/checkout")
def create_checkout(authorization: str = Header(None)):
    session_id = authorization.replace("Bearer ", "")
    adding_column()
    print(session_id)
    
    
    user_id = sessions.get(session_id, None)
    print(user_id)
    
    if not user_id:
        return {"error": "invalid_session"}

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{"price": PRICE_ID, "quantity": 1}],
        mode="payment",
        metadata={"user_id": user_id},
        success_url="https://webworkaipayment.netlify.app//success.html",
        cancel_url=f"https://webworkaipayment.netlify.app//cancel.html?session_id={session_id}",
    )
    return {"url": session.url}



processed_sessions = set()

@router.post("/webhook")
async def webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig,"whsec_IC6zRYfFjxwAvVBUYg5sXn7bbEu6sa5P")
    except Exception:
        return {"error": "invalid"}

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        session_id = session["id"]
        user_id = session["metadata"]["user_id"]
        sessions.pop(session_id, None)

        if session_id in processed_sessions:
            print("Duplicate, skipping")
            return {"status": "ok"}

        processed_sessions.add(session_id)
        

        email = session["customer_details"]["email"]

        expiry_date = datetime.now(timezone.utc) + timedelta(minutes=2)
        expiry_str = expiry_date.isoformat()
        await updating_payment(expiry_str,user_id)
        print(f"Paid: {email}")
        await Get()

    return {"status": "ok"}


