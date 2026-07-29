import asyncio
from app.utils.logger import logger


async def background_task_scheduler():
    while True:
        await asyncio.sleep(3600)
        logger.info("Background scheduler tick")


def start_workers():
    logger.info("Starting background workers...")
    # Redis-based workers can be started here if needed
