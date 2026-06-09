import redis.asyncio as redis
from datetime import datetime
import hashlib
import json
import os

REDIS_URL =os.environ["redis_url"]
redis_client = redis.Redis.from_url(REDIS_URL)
async def check_rate_limit(user_id:str):
    minute_key = f"rate:{user_id}:{datetime.utcnow().strftime('%Y-%m-%d-%H:%M')}" # "2026-05-30-14:35"
    count = await redis_client.get(minute_key)
    if count and int(count) >= 2:
        return False
    await redis_client.incr(minute_key)
    await redis_client.expire(minute_key,60)
    return True

async def check_paid_rate_limit(user_id:str):
    minute_key = f"rate:{user_id}:{datetime.utcnow().strftime('%Y-%m-%d-%H:%M')}" # "2026-05-30-14:35"
    count = await redis_client.get(minute_key)
    if count and int(count) >= 10:
        return False
    await redis_client.incr(minute_key)
    await redis_client.expire(minute_key,60)
    return True



async def get_cached_answer(question: str):
    cache_key = hashlib.md5(question.encode()).hexdigest()
    cached = await redis_client.get(f"answer:{cache_key}")
    return json.loads(cached) if cached else None

async def set_cached_answer(question: str, answer: str, ttl: int = 3600):
    cache_key = hashlib.md5(question.encode()).hexdigest()
    await redis_client.setex(f"answer:{cache_key}", ttl, json.dumps({"answer": answer}))