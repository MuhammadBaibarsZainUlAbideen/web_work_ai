import asyncpg
from datetime import datetime, timezone, timedelta
import os
import numpy as np

def from_blob(blob):
    return np.frombuffer(blob, dtype=np.float32)

pool = None

async def init_db():
    global pool
    pool = await asyncpg.create_pool(
        host="aws-1-us-west-1.pooler.supabase.com",
        port=5432,
        user="postgres.ltjzhbicxbcfxaoocsbu",
        password="Supabase424",
        database="postgres",
        max_size=20,
        ssl="require"
    )
async def Tables():
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS Authentication (
                id TEXT PRIMARY KEY,
                email TEXT,
                name TEXT,
                given_name TEXT,
                family_name TEXT,
                image TEXT,
                tries INTEGER DEFAULT 0
            );
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS refresh_token (
                token_id SERIAL PRIMARY KEY,
                user_id TEXT REFERENCES Authentication(id),
                refresh_token TEXT,
                expires_at TIMESTAMP,
                revoked INTEGER
            );
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS Payments (
                payment_id SERIAL PRIMARY KEY,
                user_id TEXT REFERENCES Authentication(id),
                stripe_customer_id TEXT,
                stripe_subscription_id TEXT,
                status TEXT,
                created_at TIMESTAMP
            );
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS StripeEvents (
                event_id TEXT PRIMARY KEY,
                created_at TIMESTAMP
            );
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS crumbs (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                question TEXT,
                fact TEXT,
                topic TEXT,
                sub_topic TEXT,
                confidence REAL
            );
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS embeddings (
                crumb_id TEXT PRIMARY KEY,
                question_embedding vector(1536),
                fact_embedding vector(1536),
                FOREIGN KEY (crumb_id) REFERENCES crumbs(id) ON DELETE CASCADE
            );
        """)

#Getting_topics
async def get_topics(user_id):
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT sub_topic
            FROM crumbs
            WHERE user_id = $1
        """, user_id)
        return rows

#Stroing Embeddings
async def printing_crumbs(user_id):
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT id, user_id, question, fact, sub_topic, confidence
            FROM crumbs
            WHERE user_id = $1
        """, user_id)
        return [dict(row) for row in rows]


#Editing Crumbs
async def Editing_crumbs(type, action, user_id, previous_topic, topic, subtopic=None, new_subtopic=None, old_question=None,old_fact=None, new_question=None, new_fact=None):
    # print(f"old_questiion {old_question}:::: old_fact {old_fact}::::new_question {new_question}")
    async with pool.acquire() as conn:
        if type == "topic" and action == "edit":
            await conn.execute("""
                UPDATE crumbs
                SET topic = $3
                WHERE user_id = $1 AND topic = $2
            """, user_id, previous_topic, topic)  # new_subtopic here is actually new topic name
            
        elif type == "topic" and action == "delete":
            await conn.execute("""
                DELETE FROM crumbs
                WHERE user_id = $1 AND topic = $2
            """, user_id, previous_topic)
            
        elif type == "subtopic" and action == "edit":
            await conn.execute("""
                UPDATE crumbs
                SET sub_topic = $4
                WHERE user_id = $1 AND topic = $2 AND sub_topic = $3
            """, user_id, previous_topic, subtopic, new_subtopic)
            
        elif type == "subtopic" and action == "delete":
            await conn.execute("""
                DELETE FROM crumbs
                WHERE user_id = $1 AND topic = $2 AND sub_topic = $3
            """, user_id, previous_topic, subtopic)
        elif type == "fact" and action == "edit":
            result = await conn.fetch("""
                    SELECT * FROM crumbs
                    WHERE user_id = $1 AND topic = $2 AND sub_topic = $3 
                    
                """, user_id, previous_topic, subtopic)
                
            print(f"Found {len(result)} matching records")
            if result:
                print(f"Record: {result[0]["question"]}")
                print(old_question)
            # return
            print("testing")
            await conn.execute("""
                UPDATE crumbs
                SET question = $5, fact = $6
                WHERE user_id = $1 AND topic = $2 AND sub_topic = $3 
                AND TRIM(question) = TRIM($4) AND TRIM(fact) = TRIM($7)
            """, user_id, previous_topic, subtopic, old_question, new_question, new_fact, old_fact)
        elif type == "fact" and action == "delete":
            await conn.execute("""
                DELETE FROM crumbs
                WHERE user_id = $1 AND topic = $2 AND sub_topic = $3 
                AND TRIM(question) = TRIM($4) AND TRIM(fact) = TRIM($5)
            """, user_id, previous_topic, subtopic, old_question, old_fact)
            
            print("Fact deleted successfully")
        elif type == "subtopic" and action == "move_to_topic":
            await conn.execute("""
                UPDATE crumbs
                SET topic = $3
                WHERE user_id = $1 AND topic = $2 AND sub_topic = $4
            """, user_id, previous_topic, topic, subtopic)
            print(f"Subtopic {subtopic} moved from topic {previous_topic} to {topic}")
        elif type == "fact" and action == "move_to_subtopic":
            await conn.execute("""
                UPDATE crumbs
                SET sub_topic = $4
                WHERE user_id = $1 AND topic = $2 AND sub_topic = $3 
                AND TRIM(question) = TRIM($5) AND TRIM(fact) = TRIM($6)
            """, user_id, previous_topic, subtopic, new_subtopic, 
               old_question, old_fact)
            
            
        
async def printing_crumbs_embedding_froentend(user_id):
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT 
                crumbs.id,
                crumbs.user_id,
                crumbs.question,
                crumbs.fact,
                crumbs.topic,
                crumbs.sub_topic,
                crumbs.confidence,
                embeddings.crumb_id,
                embeddings.question_embedding,
                embeddings.fact_embedding
            FROM crumbs
            LEFT JOIN embeddings ON crumbs.id = embeddings.crumb_id
            WHERE crumbs.user_id = $1
        """, user_id)

        results = []
        for row in rows:
            results.append({
                "id": row["id"],
                "user_id": row["user_id"],
                "question": row["question"],
                "fact": row["fact"],
                "topic": row["topic"],
                "sub_topic": row["sub_topic"],
                "confidence": row["confidence"],
                "crumb_id": row["crumb_id"],
                "question_embedding": row["question_embedding"]
                if row["question_embedding"] else None,
                "fact_embedding": row["fact_embedding"]
                if row["fact_embedding"] else None,
            })
        return results

async def printing_crumbs_embeddings(user_id,new_question_emb, new_fact_emb,threshold=0.8):
        async with pool.acquire() as conn:
            question_list = new_question_emb.tolist() if hasattr(new_question_emb, 'tolist') else new_question_emb
            fact_list = new_fact_emb.tolist() if hasattr(new_fact_emb, 'tolist') else new_fact_emb
            question_str = str(question_list)
            fact_str = str(fact_list)
            
            result = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1
                    FROM embeddings
                    JOIN crumbs ON crumbs.id = embeddings.crumb_id
                    WHERE crumbs.user_id = $1
                        AND 1 - (embeddings.question_embedding <=> $2::vector) > $4
                        AND 1 - (embeddings.fact_embedding <=> $3::vector) > $4
                )
            """, user_id, question_str, fact_str, threshold)
            
            return result
    
async def stroing_question(id, user_id, question, fact, topic, sub_topic, confidence):
    async with pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO crumbs (id, user_id, question, fact, topic, sub_topic, confidence)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO NOTHING
        """, id, user_id, question, fact, topic, sub_topic, confidence)

async def stroing_embedings(crumb_id, question_embedding, fact_embedding):
    async with pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO embeddings (crumb_id, question_embedding, fact_embedding)
            VALUES ($1, $2, $3)
            ON CONFLICT (crumb_id) DO NOTHING
        """, crumb_id, str(question_embedding), str(fact_embedding))

async def is_event_processed(event_id: str):
    async with pool.acquire() as conn:
        result = await conn.fetchval(
            "SELECT event_id FROM StripeEvents WHERE event_id = $1",
            event_id
        )
        return result is not None

async def store_stripe_event(event_id: str):
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO StripeEvents (event_id, created_at) VALUES ($1, $2) ON CONFLICT (event_id) DO NOTHING",
            event_id, datetime.now().isoformat()
        )

async def inserting_payment(user_id, customer_id, subscription_id, status):
    async with pool.acquire() as conn:
        existing = await conn.fetchval("""
            SELECT payment_id FROM Payments WHERE user_id = $1
        """, user_id)

        if existing:
            await conn.execute("""
                UPDATE Payments
                SET stripe_customer_id = $1,
                    stripe_subscription_id = $2,
                    status = $3,
                    created_at = $4
                WHERE user_id = $5
            """, customer_id, subscription_id, status,
              datetime.now(timezone.utc).isoformat(), user_id)
        else:
            await conn.execute("""
                INSERT INTO Payments (user_id, stripe_customer_id, stripe_subscription_id, status, created_at)
                VALUES ($1, $2, $3, $4, $5)
            """, user_id, customer_id, subscription_id, status,
              datetime.now(timezone.utc).isoformat())

async def updating_payment_status(subscription_id, status):
    async with pool.acquire() as conn:
        await conn.execute("""
            UPDATE Payments
            SET status = $1
            WHERE stripe_subscription_id = $2
        """, status, subscription_id)

async def payment_status(user_id):
    async with pool.acquire() as conn:
        data = await conn.fetch("SELECT status FROM Payments WHERE user_id = $1", user_id)
        return data

async def get_subscrption(user_id):
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            SELECT stripe_customer_id
            FROM Payments
            WHERE user_id = $1
            LIMIT 1
        """, user_id)
        return row

async def get_payment():
    async with pool.acquire() as conn:
        data = await conn.fetch("SELECT * FROM Payments")
        return data

async def Inserting(id, email, name, given_name, family_name, image):
    async with pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO Authentication (id, email, name, given_name, family_name, image)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO NOTHING
        """, id, email, name, given_name, family_name, image)

async def increment_tries(user_id):
    async with pool.acquire() as conn:
        await conn.execute("""
            UPDATE Authentication 
            SET tries = tries + 1 
            WHERE id = $1
        """, user_id)

async def get_tries(user_id):
    async with pool.acquire() as conn:
        data = await conn.fetchval("SELECT tries FROM Authentication WHERE id = $1", user_id)
        return data

async def refresh_token(user_id, refresh_token, expiry, revoked):
    async with pool.acquire() as conn:
        existing = await conn.fetchval("SELECT token_id FROM refresh_token WHERE user_id = $1", user_id)
        if existing:
            await conn.execute("""
                UPDATE refresh_token 
                SET refresh_token = $1, expires_at = $2, revoked = 0
                WHERE user_id = $3
            """, refresh_token, expiry, user_id)
        else:
            await conn.execute("""
                INSERT INTO refresh_token (user_id, refresh_token, expires_at, revoked)
                VALUES ($1, $2, $3, $4)
            """, user_id, refresh_token, expiry, revoked)

async def updating_refresh_token(user_id):
    async with pool.acquire() as conn:
        await conn.execute("""
            UPDATE refresh_token SET revoked = 1 WHERE user_id = $1
        """, user_id)

async def extracting_data(token):
    async with pool.acquire() as conn:
        data = await conn.fetch("""
            SELECT * FROM refresh_token 
            WHERE refresh_token = $1 
            AND revoked = 0 
            AND expires_at::TIMESTAMP > CURRENT_TIMESTAMP
        """, token)
        return data

async def deleting_everything():
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM embeddings")
        await conn.execute("DELETE FROM crumbs")

async def getting_user(id):
    async with pool.acquire() as conn:
        data = await conn.fetch("""
            SELECT * FROM refresh_token WHERE user_id = $1 AND revoked = 0
        """, id)
        return data

async def Get():
    async with pool.acquire() as conn:
        data = await conn.fetch("SELECT * FROM StripeEvents")
        for row in data:
            print(dict(row))
        return data

async def Get_users():
    async with pool.acquire() as conn:
        data = await conn.fetch("""
            SELECT 
                Authentication.name, 
                Authentication.email, 
                refresh_token.revoked,
                Payments.status,
                Authentication.tries
            FROM Authentication
            LEFT JOIN refresh_token ON Authentication.id = refresh_token.user_id
            LEFT JOIN Payments ON Authentication.id = Payments.user_id
        """)
        return data