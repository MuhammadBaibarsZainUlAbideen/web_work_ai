from data_base import printing_crumbs_embeddings,Tables
import asyncio

async def testing():
    #await Tables()
    data = await printing_crumbs_embeddings()
    print(data)
asyncio.run(testing())