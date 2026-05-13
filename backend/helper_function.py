import numpy as np
from data_base import stroing_embedings,stroing_question,printing_crumbs_embeddings
import uuid
def to_blob(vector):
    return np.array(vector, dtype=np.float32).tobytes()

async def stroing_question_and_embedding(user_id,Question, fact, topic, sub_topic, confidence,concept_embeding,fact_embeding):
    random_id = str(uuid.uuid4())
    try:
        await stroing_question(random_id, user_id, Question, fact, topic, sub_topic, confidence)
        await stroing_embedings(random_id, to_blob(concept_embeding), to_blob(fact_embeding))
    except Exception as e:
        print("Error storing data:", e)
        raise
def cosine_similarity(a, b):
    a = np.frombuffer(a, dtype=np.float32)
    b = np.array(b, dtype=np.float32)

    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

async def is_duplicate(user_id, new_embedding, threshold=0.80):
    rows = await printing_crumbs_embeddings(user_id)  
    print(rows)
    # should return: crumb_id, embedding

    best_score = 0

    for row in rows:
        existing_emb = row["question_embedding"]
        print("-->",existing_emb)
        print("--->",new_embedding)
        print("1")
        new_embedding = np.array(new_embedding, dtype=np.float32)
        score = cosine_similarity(new_embedding, existing_emb)
        print("2")

        if score > best_score:
            best_score = score
    print(best_score)

    return best_score >= threshold
