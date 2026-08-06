import logging
import uuid
import sys
from typing import Any, Dict

class CustomFormatter(logging.Formatter):
    def format(self, record):
        if not hasattr(record, 'correlation_id'):
            record.correlation_id = 'SYSTEM'
        return super().format(record)

def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        handler = logging.StreamHandler(sys.stdout)
        
        # Simple structured-like logging
        formatter = CustomFormatter(
            '%(asctime)s | %(levelname)-8s | [%(correlation_id)s] | %(name)s | %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
    return logger

def generate_correlation_id() -> str:
    return str(uuid.uuid4())
