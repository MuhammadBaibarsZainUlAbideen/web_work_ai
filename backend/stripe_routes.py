import stripe
from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from fastapi import APIRouter
from data_base import Get,inserting_payment,payment_status,updating_payment_status,is_event_processed, store_stripe_event
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
async def create_checkout(authorization: str = Header(None)):
    session_id = authorization.replace("Bearer ", "")
    #await adding_column()
    print(session_id)
    
    
    user_id = sessions.get(session_id, None)
    print(user_id)
    
    if not user_id:
        return {"error": "invalid_session"}

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{"price": PRICE_ID, "quantity": 1}],
        mode="subscription",
        metadata={"user_id": user_id},
        success_url="https://webworkaipayment.netlify.app//success.html",
        cancel_url=f"https://webworkaipayment.netlify.app//cancel.html?session_id={session_id}",
    )
    return {"url": session.url}



# processed_sessions = set()

@router.post("/webhook")
async def webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig,"whsec_dfcefc19ca3e7db7240e8579b99e47303212ec38521a834bcb62c8ef2fc7d416")
    except Exception:
        return {"error": "invalid"}
    data = event["data"]["object"]
    event_id = event["id"]
    if await is_event_processed(event_id):
        return {"status": "duplicate ignored"}

    await store_stripe_event(event_id)

    if event["type"] == "checkout.session.completed":
        # session = event["data"]["object"]
        # session_id = data["id"]
        user_id = data["metadata"]["user_id"]
        print("tyhjm,")
        customer_id = getattr(data, "customer", None)
        subscription_id = getattr(data, "subscription", None)
        print("tyhjm,")
        await inserting_payment(
            user_id=user_id,
            customer_id=customer_id,
            subscription_id=subscription_id,
            status="active"
        )
        print("1")


    elif event["type"] == "customer.subscription.updated":
        subscription_id = data["id"]
        status = data["status"]

        await updating_payment_status(subscription_id, status)

        print(f"Subscription updated: {status}")

    elif event["type"] == "customer.subscription.deleted":
        subscription_id = data["id"]

        await updating_payment_status(subscription_id, "canceled")

        print("Subscription canceled")

    elif event["type"] == "invoice.payment_failed":
        subscription_id = data["subscription"]

        await updating_payment_status(subscription_id, "past_due")

        print("Payment failed")
    elif event["type"] == "invoice.paid":
        subscription_id = getattr(data, "subscription", None)

        await updating_payment_status(subscription_id, "active")

        print("Payment successful (renewal)")












        # sessions.pop(session_id, None)

        # if session_id in processed_sessions:
        #     print("Duplicate, skipping")
        #     return {"status": "ok"}

        # processed_sessions.add(session_id)
        

        # email = session["customer_details"]["email"]
        # await inserting_payment(
        #     user_id=user_id,
        #     customer_id=customer_id,
        #     subscription_id=subscription_id,
        #     status="active"
        # )

        # expiry_date = datetime.now(timezone.utc) + timedelta(days=60)
        # expiry_str = expiry_date.isoformat()
        # print(expiry_str)
        # await updating_payment(expiry_str,user_id)
        # print(f"Paid: {email}")
        await Get()

    return {"status": "ok"}


