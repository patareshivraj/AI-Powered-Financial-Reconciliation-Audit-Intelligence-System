import logging
import sys
from logging.handlers import RotatingFileHandler
import os

def setup_logging(logger_name: str = "bank_ai") -> logging.Logger:
    """
    Sets up a fintech-grade structured logger that outputs both to the 
    standard stream (console) and a rotating log file in the workspace directory.
    """
    logger = logging.getLogger(logger_name)
    logger.setLevel(logging.INFO)
    
    # Check if handlers are already configured
    if logger.handlers:
        return logger

    # Log directories
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    log_file_path = os.path.join(log_dir, "app.log")

    # Structured visual format
    log_format = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s] [%(filename)s:%(lineno)d] - %(message)s"
    )

    # 1. Console stream handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(log_format)
    console_handler.setLevel(logging.INFO)
    logger.addHandler(console_handler)

    # 2. Local file rotation handler (Max 5MB per log, keeping last 5 logs)
    try:
        file_handler = RotatingFileHandler(
            log_file_path, maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8"
        )
        file_handler.setFormatter(log_format)
        file_handler.setLevel(logging.INFO)
        logger.addHandler(file_handler)
    except Exception as e:
        # Fallback console warn if write privileges are missing
        logger.warning(f"Could not initialize rotating log file handler: {e}")

    logger.info("Structured logging framework initialized successfully.")
    return logger

# Shared global logger
logger = setup_logging()
