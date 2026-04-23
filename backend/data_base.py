import aiosqlite

import os
file_name = os.getenv("DB_PATH", "mydatabase1.db")


async def Tables():
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    await cursor.execute("""CREATE TABLE IF NOT EXISTS Authentication
                   (id TEXT PRIMARY KEY, email TEXT, name TEXT,given_name TEXT, family_name TEXT, image TEXT,tries INTEGER DEFAULT 0)""")
    
    await cursor.execute("""CREATE TABLE IF NOT EXISTS Refresh_token
       (token_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT,refresh_token TEXT, expires_at TEXT, revoked INTEGER, FOREIGN KEY (user_id) REFERENCES Authentication(id) )""")
    await cursor.execute("""CREATE TABLE IF NOT EXISTS Payments
                   (payment_id INTEGER PRIMARY KEY AUTOINCREMENT, 
                    user_id TEXT, 
                    amount REAL, 
                    status INTEGER, -- 'paid', 'pending', 'refunded'
                    
                    FOREIGN KEY (user_id) REFERENCES Authentication(id))""")
    await conn.commit()
    await conn.close()



async def adding_column():
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    await cursor.execute("""ALTER TABLE Payments ADD COLUMN Expiry TEXT""")
    await conn.commit()
    await conn.close()


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
    


async def inserting_payment(id, amount, status,expiry):
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
   
    await cursor.execute("SELECT payment_id FROM Payments WHERE user_id = ?", (id,))
    existing = await cursor.fetchone()
    if not existing:
        await cursor.execute("""INSERT INTO Payments 
                       (user_id, amount, status,Expiry)
                       VALUES (?, ?, ?,?)""", (id, amount, status,expiry))
        await conn.commit()
        await conn.close()

async def get_payment():
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()

    await cursor.execute("""SELECT * FROM Payments""")
    data = await cursor.fetchall()   

    await conn.close()
    return data

async def updating_payment(exp,user_id):
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    await cursor.execute("""UPDATE Payments 
                       SET status = 1,Expiry = ?
                        WHERE user_id =? and Expiry= 'NULL'
                   """,(exp,user_id,))
    
    await conn.commit()
    await conn.close()
# async def updating_expiry_date(exp,user_id):
#     conn = await aiosqlite.connect(file_name)
#     cursor = await conn.cursor()
#     await cursor.execute("""UPDATE Payments SET Expiry = ? WHERE user_id=? and Expiry= 'NULL' """,(exp,user_id))
#     await conn.commit()
#     await conn.close()
async def payment_status(user_id):
    conn = await aiosqlite.connect(file_name)
    cursor = await conn.cursor()
    await cursor.execute("""SELECT Status FROM Payments WHERE user_id=?""",(user_id,))
    data = await cursor.fetchone()
    await conn.close()
    return data

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
    await cursor.execute("""DELETE FROM Refresh_token""")
    await cursor.execute("""DELETE FROM Authentication""")
    await cursor.execute("""DELETE FROM Payments""")
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
    await cursor.execute("SELECT * FROM Refresh_token")
    data = await cursor.fetchall()
    for rows in data:
        print(rows)
    await conn.close()
    

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