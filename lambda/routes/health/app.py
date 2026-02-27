import json
from logger import logger

def handler(event, context):
    logger.info(f"Health function called, Event: {event}")
    return {"code": 200, "status": "running"}