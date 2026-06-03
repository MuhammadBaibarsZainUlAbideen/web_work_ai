import numpy as np
from data_base import stroing_embedings,stroing_question,printing_crumbs_embeddings
import uuid
def to_blob(vector):
    return np.array(vector, dtype=np.float32).tobytes()

async def stroing_question_and_embedding(user_id,Question, fact, topic, sub_topic, confidence,concept_embeding,fact_embeding):
    random_id = str(uuid.uuid4())
    try:
        await stroing_question(random_id, user_id, Question, fact, topic, sub_topic, confidence)
        await stroing_embedings(random_id, concept_embeding, fact_embeding)
    except Exception as e:
        print("Error storing data:", e)
        raise

def cosine_similarity():
    pass
async def is_duplicate(user_id, new_question_embedding, new_fact_embedding, threshold=0.85):
    rows = await printing_crumbs_embeddings(user_id,new_question_embedding,new_fact_embedding)  

    return rows
