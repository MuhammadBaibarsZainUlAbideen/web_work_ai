import stripe
from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from fastapi import APIRouter
from backend.data_base import Get,inserting_payment,payment_status,updating_payment_status,is_event_processed, store_stripe_event,get_subscrption
import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from backend.session import sessions
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone

load_dotenv()
router = APIRouter()
stripe.api_key = os.getenv("stripe_key")


PRICE_ID = os.getenv("price_id")
STRIPE_PUBLISHABLE_KEY = "pk_test_51TR1gD0OMb8UaZikwCqxrlQ1401jRlLtKGByeXpWOEJ3uH12Q9E6WayYilZ87oE9gDxh05BjegFcqimEDXeHHmLf000iCcBYdC"
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

    
    
    user_id = sessions.get(session_id, None)
    
    if not user_id:
        return {"error": "invalid_session"}

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{"price": PRICE_ID, "quantity": 1}],
        mode="subscription",
        metadata={"user_id": user_id},
        success_url="https://asolve.me/success.html",
        cancel_url=f"https://asolve.me/cancel.html?session_id={session_id}",
    )
    return {"url": session.url}




@router.post("/webhook")
async def webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")

    try:
        signing_key = os.getenv("stripe_signing_key")
        event = stripe.Webhook.construct_event(payload, sig,signing_key)
    except Exception:
        return {"error": "invalid"}
    data = event["data"]["object"]
    event_id = event["id"]
    if await is_event_processed(event_id):
        return {"status": "duplicate ignored"}

    await store_stripe_event(event_id)

    if event["type"] == "checkout.session.completed":

        user_id = data["metadata"]["user_id"]
        customer_id = getattr(data, "customer", None)
        subscription_id = getattr(data, "subscription", None)
        await inserting_payment(
            user_id=user_id,
            customer_id=customer_id,
            subscription_id=subscription_id,
            status="active"
        )


    elif event["type"] == "customer.subscription.updated":
        subscription_id = data["id"]
        status = data["status"]

        await updating_payment_status(subscription_id, status)


    elif event["type"] == "customer.subscription.deleted":
        subscription_id = data["id"]

        await updating_payment_status(subscription_id, "canceled")


    elif event["type"] == "invoice.payment_failed":
        subscription_id = data["subscription"]
 
        await updating_payment_status(subscription_id, "past_due")

    elif event["type"] == "invoice.paid":
        subscription_id = getattr(data, "subscription", None)

        await updating_payment_status(subscription_id, "active")





    return {"status": "ok"}


@router.post("/billing-portal")
async def billing_portal(authorization: str = Header(None)):
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, our_secret_key, algorithms=["HS256"])
    except ExpiredSignatureError:
        return {"logout": "false", "reason": "token_expired"}
    user_id = payload["key"]
    row = await get_subscrption(user_id)

    if not row:
        return {"error": "no_customer_found"}

    customer_id = row[0]

    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url="https://webworkaipayment.netlify.app//dashboard"
    )

    return {"url": session.url}