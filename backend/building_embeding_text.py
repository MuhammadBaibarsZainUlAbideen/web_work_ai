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


    concept_text = f"{concept}"
    fact_text = f"{fact}"

    return concept_text.strip(), fact_text.strip()


async def embed(text: str):
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    print("something worked")
    # print(response.data[0].embedding)
    return response.data[0].embedding