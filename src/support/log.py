import logging


logging.basicConfig(
                    format='%(asctime)s - %(module)8s - %(levelname)5s: %(message)s',
                    datefmt='%Y-%m-%d %H:%M:%S %p',
                    level=logging.INFO)

logger = logging.getLogger(__name__)
