import json
from openai import AsyncAzureOpenAI
from dotenv import load_dotenv
import os
load_dotenv()


azure_endpoint = "https://foundry-ai-prd-eus2-01.cognitiveservices.azure.com/"
api_key = os.getenv("subscription_key")

client = AsyncAzureOpenAI(
    api_version="2024-12-01-preview",
    azure_endpoint=azure_endpoint,
    api_key=api_key
)

async def build_embedding_text(crumb):
    concept = crumb["Question"]
    fact = crumb["fact"]
    topic = crumb["topic"]
    sub_topic = crumb["Sub-Topic"]

    concept_text = f"""
    Concept: {concept}
    Topic: {topic}
    Subtopic: {sub_topic}
    """

    fact_text = f"""
    Fact: {fact}
    Related to: {topic} - {sub_topic}
    """

    return concept_text.strip(), fact_text.strip()


async def embed(text: str):
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    # print(response.data[0].embedding)
    return response.data[0].embedding