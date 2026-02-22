import logging
import os

logger = logging.getLogger("app")
logger.setLevel(os.getenv("LOGGER_LEVEL", "INFO").upper())
logger.info(f"LOGGER LEVEL is {logger.getEffectiveLevel()}")