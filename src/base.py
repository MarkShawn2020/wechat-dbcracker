"""
source: own
author: https://github.com/MarkShawn2020
create: 8月 24, 2022, 02:44
"""
import pathlib
from os.path import abspath

BASE_PATH = pathlib.Path(abspath(__file__))
SRC_DIR = BASE_PATH.parent
PROJECT_DIR = SRC_DIR.parent
DATA_DIR = PROJECT_DIR / 'data'
DATA_OUT_DIR = DATA_DIR / 'out'
LOGS_DIR = PROJECT_DIR / 'logs'
