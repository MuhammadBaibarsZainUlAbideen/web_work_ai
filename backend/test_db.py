import asyncio
import os
import selectors
from dotenv import load_dotenv
from psycopg import AsyncConnection

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def test_connection():
    print(f"Attempting to connect to: {DATABASE_URL}")
    try:
        async with await AsyncConnection.connect(DATABASE_URL) as conn:
            print("Successfully connected to the database!")
            async with conn.cursor() as cur:
                await cur.execute("SELECT version();")
                version = await cur.fetchone()
                print(f"Database version: {version}")
    except Exception as e:
        print(f"Failed to connect: {e}")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_connection())
