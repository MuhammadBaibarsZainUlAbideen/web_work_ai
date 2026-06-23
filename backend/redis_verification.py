import redis.asyncio as redis
from datetime import datetime
import os

REDIS_URL = os.environ["redis_url"]
redis_client = None

if REDIS_URL and REDIS_URL.startswith(('redis://', 'rediss://')):
    redis_client = redis.Redis.from_url(REDIS_URL)
else:
    print(f"REDIS_URL not set or invalid: {REDIS_URL}")


async def check_rate_limit(user_id: str):
    minute_key = f"rate:{user_id}:{datetime.utcnow().strftime('%Y-%m-%d-%H:%M')}"
    count = await redis_client.get(minute_key)
    if count and int(count) > 2:
        return False
    await redis_client.incr(minute_key)
    await redis_client.expire(minute_key, 60)
    return True


async def check_paid_rate_limit(user_id: str):
    minute_key = f"rate:{user_id}:{datetime.utcnow().strftime('%Y-%m-%d-%H:%M')}"
    count = await redis_client.get(minute_key)
    if count and int(count) >= 5:
        return False
    await redis_client.incr(minute_key)
    await redis_client.expire(minute_key, 60)
    return True


async def check_paid_edit_rate_limit(user_id: str):
    minute_key = f"rate:{user_id}:{datetime.utcnow().strftime('%Y-%m-%d-%H:%M')}"
    count = await redis_client.get(minute_key)
    if count and int(count) >= 5:
        return False
    await redis_client.incr(minute_key)
    await redis_client.expire(minute_key, 60)
    return True


async def check_monthly_paid_limit(user_id: str) -> bool:
    current_month = datetime.now().strftime("%Y-%m")
    monthly_key = f"monthly_requests:{user_id}:{current_month}"

    count = await redis_client.incr(monthly_key)

    if count == 1:
        await redis_client.expire(monthly_key, 35 * 24 * 60 * 60)
        # await redis_client.expire(monthly_key, 5 * 60)  # testing

    return count <= 1500