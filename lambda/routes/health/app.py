import json
from logger import logger

def handler(event, context):
    logger.info(f"Health function called, Event: {event}")
    return {
        "statusCode": 200,
        "body": json.dumps({"code": 200, "status": "running"})
    }