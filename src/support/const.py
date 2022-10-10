import os

SRC_PATH = os.path.dirname(os.path.dirname(__file__))
PROJECT_PATH = os.path.dirname(SRC_PATH)
DATA_PATH = os.path.join(PROJECT_PATH, "data")
DB_DUMP_PATH = os.path.join(DATA_PATH, "db")

PAGE_SIZE_BASE = 1024
