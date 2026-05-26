import aiosqlite
from datetime import datetime, timezone,timedelta
import os
import numpy as np
file_name = os.getenv("DB_PATH", "mydatabase1.db")

# file_name = "mydatabase1.db"
def from_blob(blob):
    return np.frombuffer(blob, dtype=np.float32)

async def Tables():
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    await cursor.execute("""CREATE TABLE IF NOT EXISTS Authentication
                   (id TEXT PRIMARY KEY, email TEXT, name TEXT,given_name TEXT, family_name TEXT, image TEXT,tries INTEGER DEFAULT 0)""")
    
    await cursor.execute("""CREATE TABLE IF NOT EXISTS Refresh_token
       (token_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT,refresh_token TEXT, expires_at TEXT, revoked INTEGER, FOREIGN KEY (user_id) REFERENCES Authentication(id) )""")
    await cursor.execute("""CREATE TABLE IF NOT EXISTS Payments (
                            payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id TEXT,
                            stripe_customer_id TEXT,
                            stripe_subscription_id TEXT,
                            status TEXT,  
                            created_at TEXT,
                            FOREIGN KEY (user_id) REFERENCES Authentication(id))""")
    await cursor.execute("""CREATE TABLE IF NOT EXISTS StripeEvents (
                                    event_id TEXT PRIMARY KEY,
                                    created_at TEXT
                                );""")
    await cursor.execute("""CREATE TABLE IF NOT EXISTS crumbs (
                                id TEXT PRIMARY KEY,
                                user_id TEXT,
                                question TEXT,
                                fact TEXT,
                                topic TEXT,
                                sub_topic TEXT,
                                confidence REAL
                            );""")
    await cursor.execute("""CREATE TABLE IF NOT EXISTS embeddings (
                            crumb_id TEXT PRIMARY KEY ,
                            question_embedding BLOB,
                            fact_embedding BLOB,
                            FOREIGN KEY (crumb_id) REFERENCES crumbs(id)
                        );""")
    
    
    await conn.commit()
    await conn.close()



#Getting_topics
async def get_topics(user_id):
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    await cursor.execute("""SELECT  sub_topic
                                    FROM crumbs
                                    WHERE user_id = ? """,(user_id,))
    rows = await cursor.fetchall()   
    await conn.close()
    return rows

#Stroing Embeddings
async def printing_crumbs(user_id):
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    await cursor.execute("""SELECT id,user_id,question,fact,sub_topic,confidence
                                    FROM crumbs
                                    WHERE user_id = ? """,(user_id,))
    rows = await cursor.fetchall()   
    await conn.close()
    return rows
async def printing_crumbs_embedding_froentend(user_id):
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    await cursor.execute("""SELECT crumbs.id,crumbs.user_id, crumbs.question, crumbs.fact,crumbs.topic,crumbs.sub_topic,crumbs.confidence,
                                    embeddings.crumb_id,embeddings.question_embedding,embeddings.fact_embedding
                                    FROM crumbs
                                    LEFT JOIN embeddings ON crumbs.id=embeddings.crumb_id
                                    WHERE crumbs.user_id = ? """,(user_id,))
    rows = await cursor.fetchall()   
    await conn.close()
    results = []

    for row in rows:
        results.append({
            "id": row[0],
            "user_id": row[1],
            "question": row[2],
            "fact": row[3],
            "topic": row[4],
            "sub_topic": row[5],
            "confidence": row[6],
            "crumb_id": row[7],

            # convert embeddings back to numpy arrays
            "question_embedding": from_blob(row[8]).tolist() if row[8] else None,
            "fact_embedding": from_blob(row[9]).tolist() if row[9] else None,
        })
    return results



async def printing_crumbs_embeddings(user_id):
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    await cursor.execute("""SELECT crumbs.id,crumbs.user_id, crumbs.question, crumbs.fact,crumbs.topic,crumbs.sub_topic,crumbs.confidence,
                                    embeddings.crumb_id,embeddings.question_embedding,embeddings.fact_embedding
                                    FROM crumbs
                                    LEFT JOIN embeddings ON crumbs.id=embeddings.crumb_id
                                    WHERE crumbs.user_id = ? """,(user_id,))
    rows = await cursor.fetchall()   
    await conn.close()
    results = []

    for row in rows:
        results.append({
            "id": row[0],
            "user_id": row[1],
            "question": row[2],
            "fact": row[3],
            "topic": row[4],
            "sub_topic": row[5],
            "confidence": row[6],
            "crumb_id": row[7],

            # convert embeddings back to numpy arrays
            "question_embedding": from_blob(row[8]) if row[8] else None,
            "fact_embedding": from_blob(row[9]) if row[9] else None,
        })
    return results
async def stroing_question(id, user_id, question, fact, topic, sub_topic, confidence):
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    await cursor.execute("""INSERT OR IGNORE INTO crumbs (id, user_id, question, fact, topic, sub_topic, confidence)
                         VALUES (?,?,?,?,?,?,?)""",(id,user_id,question,fact,topic,sub_topic,confidence))
    await conn.commit()
    await conn.close()
async def stroing_embedings(crumb_id, question_embedding, fact_embedding):
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    await cursor.execute("""
    INSERT OR IGNORE INTO embeddings (crumb_id, question_embedding, fact_embedding)
    VALUES (?, ?, ?)
    """, (crumb_id, question_embedding, fact_embedding))
    await conn.commit()
    await conn.close()


async def is_event_processed(event_id: str):
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()

    await cursor.execute(
        "SELECT event_id FROM StripeEvents WHERE event_id = ?",
        (event_id,)
    )

    result = await cursor.fetchone()

    await conn.close()

    return result is not None
async def store_stripe_event(event_id: str):
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()

    await cursor.execute(
        "INSERT OR IGNORE INTO StripeEvents (event_id, created_at) VALUES (?, ?)",
        (event_id, datetime.now(timezone.utc).isoformat())
    )

    await conn.commit()
    await conn.close()


async def inserting_payment(user_id, customer_id, subscription_id, status):
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()

    await cursor.execute("""
        SELECT payment_id FROM Payments WHERE user_id = ?
    """, (user_id,))

    existing = await cursor.fetchone()

    if existing:
        await cursor.execute("""
            UPDATE Payments
            SET stripe_customer_id = ?,
                stripe_subscription_id = ?,
                status = ?,
                created_at = ?
            WHERE user_id = ?
        """, (customer_id, subscription_id, status,
              datetime.now(timezone.utc).isoformat(), user_id))
    else:
        await cursor.execute("""
            INSERT INTO Payments (user_id, stripe_customer_id, stripe_subscription_id, status, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, customer_id, subscription_id, status,
              datetime.now(timezone.utc).isoformat()))

    await conn.commit()
    await conn.close()


async def updating_payment_status(subscription_id, status):
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    await cursor.execute("""
        UPDATE Payments
        SET status = ?
        WHERE stripe_subscription_id = ?
    """, (status, subscription_id))
    await conn.commit()
    await conn.close()

async def payment_status(user_id):
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    await cursor.execute("""SELECT Status FROM Payments WHERE user_id=?""",(user_id,))
    data = await cursor.fetchall()
    await conn.close()
    return data


async def get_subscrption(user_id):
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()

    await cursor.execute("""
        SELECT stripe_customer_id
        FROM Payments
        WHERE user_id = ?
        LIMIT 1
    """, (user_id,))

    row = await cursor.fetchone()
    await conn.close()
    return row


# async def adding_column():
#     conn = await aiosqlite.connect(file_name)
#     cursor = await conn.cursor()
#     await cursor.execute("""ALTER TABLE Payments ADD COLUMN Expiry TEXT""")
#     await conn.commit()
#     await conn.close()

async def get_payment():
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    await cursor.execute("""SELECT * FROM Payments""")
    data = cursor.fetchall()
    await conn.commit()
    await conn.close()
    return data
    

async def Inserting(id,email,name,given_name,family_name,image):
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    await cursor.execute("""INSERT OR IGNORE INTO Authentication 
                   (id,email,name,given_name,family_name,image)
                   VALUES(?,?,?,?,?,?)
                   """,(id,email,name,given_name,family_name,image))
    await conn.commit()
    await conn.close()

async def increment_tries(user_id):
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    await cursor.execute("""
        UPDATE Authentication 
        SET tries = tries + 1 
        WHERE id = ?
    """, (user_id,))
    await conn.commit()
    await conn.close()

async def get_tries(user_id):
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    await cursor.execute("""SELECT tries FROM Authentication WHERE id=?"""
                   ,(user_id,))
    data = await cursor.fetchone()
    await conn.close()
    return data
    


# async def inserting_payment(id, amount, status,expiry):
#     conn = await aiosqlite.connect(file_name)
#     cursor = await conn.cursor()
   
#     await cursor.execute("SELECT payment_id FROM Payments WHERE user_id = ?", (id,))
#     existing = await cursor.fetchone()
#     if not existing:
#         await cursor.execute("""INSERT INTO Payments 
#                        (user_id, amount, status,Expiry)
#                        VALUES (?, ?, ?,?)""", (id, amount, status,expiry))
#         await conn.commit()
#         await conn.close()


# async def get_payment_expiry(user_id):
#     conn = await aiosqlite.connect(file_name)
#     cursor = await conn.cursor()
#     await cursor.execute("SELECT Expiry FROM Payments WHERE user_id = ?",(user_id,))
#     expiry_data = await cursor.fetchone()
#     return expiry_data


# async def get_payment():
#     conn = await aiosqlite.connect(file_name)
#     cursor = await conn.cursor()

#     await cursor.execute("""SELECT * FROM Payments""")
#     data = await cursor.fetchall()   

#     await conn.close()
#     return data

# async def updating_payment(exp,user_id):
#     conn = await aiosqlite.connect(file_name)
#     cursor = await conn.cursor()
#     await cursor.execute("""UPDATE Payments 
#                        SET status = 1,Expiry = ?
#                         WHERE user_id =?
#                    """,(exp,user_id,))
    
#     await conn.commit()
#     await conn.close()
# async def updating_expiry_date(exp,user_id):
#     conn = await aiosqlite.connect(file_name)
#     cursor = await conn.cursor()
#     await cursor.execute("""UPDATE Payments SET Expiry = ? WHERE user_id=? and Expiry= 'NULL' """,(exp,user_id))
#     await conn.commit()
#     await conn.close()


async def refresh_token(user_id, refresh_token, expiry, revoked):
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    await cursor.execute("SELECT token_id FROM Refresh_token WHERE user_id = ?", (user_id,))
    existing = await cursor.fetchone()
    if existing:
        
        await cursor.execute("""UPDATE Refresh_token 
                          SET refresh_token = ?, expires_at = ?, revoked = 0
                          WHERE user_id = ?""",
                       (refresh_token, expiry, user_id))
    else:
        await cursor.execute("""INSERT INTO Refresh_token
                       (user_id, refresh_token, expires_at, revoked)
                       VALUES (?, ?, ?, ?)""",
                       (user_id, refresh_token, expiry, revoked))
    await conn.commit()
    await conn.close()


async def updating_refresh_token(user_id):
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    await cursor.execute( """UPDATE Refresh_token SET revoked = 1 WHERE user_id = ?"""
                   ,(user_id,))
    await conn.commit()
    await conn.close()

async def extracting_data(token):
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    await cursor.execute(""" SELECT * FROM Refresh_token WHERE refresh_token=? AND revoked = 0 AND expires_at>CURRENT_TIMESTAMP"""
                   ,(token,))
    data = await cursor.fetchall()
    await conn.close()
    return data

async def deleting_everything():
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    # await cursor.execute("""DELETE FROM Refresh_token""")
    # await cursor.execute("""DELETE FROM Authentication""")
    # await cursor.execute("""DELETE FROM Payments""")
    # await cursor.execute("""DELETE FROM StripeEvents""")
    await cursor.execute("""DELETE FROM crumbs""")
    await cursor.execute("""DELETE FROM embeddings""")

    await conn.commit()
    await conn.close()

async def getting_user(id):
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    await cursor.execute(""" SELECT * FROM Refresh_token WHERE user_id=? AND revoked = 0"""
                   ,(id,))
    data = await cursor.fetchall()
    await conn.close()
    return data

async def Get():
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    await cursor.execute("SELECT * FROM StripeEvents")
    data = await cursor.fetchall()
    for rows in data:
        print(rows)
    await conn.close()
    return data

async def Get_users():
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()

    await cursor.execute("""
    SELECT 
        Authentication.name, 
        Authentication.email, 
        Refresh_token.revoked,
        Payments.status,
        Authentication.tries
    FROM Authentication
    LEFT JOIN Refresh_token ON Authentication.id = Refresh_token.user_id
    LEFT JOIN Payments ON Authentication.id = Payments.user_id
    """)

    data = await cursor.fetchall()   
    await conn.close()
    return data