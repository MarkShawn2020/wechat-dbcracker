"""
update: 2022/08/08
ref: https://www.toptal.com/python/in-depth-python-logging#python-logging-best-practices
"""
import logging
import os.path
import sys
from logging.handlers import TimedRotatingFileHandler

from base import LOGS_DIR


FORMATTER = logging.Formatter(
    # cons: too annoying when log like: `[regenerate_field.py:regenerate_field:regenerate:16]`
    # ref: https://stackoverflow.com/a/44401529/9422455
    # '%(asctime)s, %(levelname)-8s [%(filename)s:%(module)s:%(funcName)s:%(lineno)d] %(message)s'

    "%(asctime)s %(levelname)-8s [%(filename)s:%(lineno)d] <%(name)s> %(message)s"
)


def get_console_handler(level=logging.INFO):
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(FORMATTER)
    console_handler.setLevel(level)
    return console_handler


def get_file_handler(filename="track.log", level=logging.DEBUG):
    file_handler = TimedRotatingFileHandler(os.path.join(LOGS_DIR, filename), when='midnight')
    file_handler.setFormatter(FORMATTER)
    file_handler.setLevel(level)
    return file_handler


def get_logger(logger_name):
    _logger = logging.getLogger(logger_name)
    _logger.setLevel(logging.DEBUG)  # better to have too much log than not enough
    _logger.addHandler(get_console_handler(os.getenv('LOG_LEVEL', logging.INFO)))
    _logger.addHandler(get_file_handler("out.log", logging.DEBUG))
    # with this pattern, it's rarely necessary to propagate the error up to parent
    _logger.propagate = False
    return _logger


if __name__ == '__main__':
    logger = get_logger("test")
    logger.debug("test of debug")
    logger.info("test of info")
    logger.warning("test of info")
    logger.error("test of error")
