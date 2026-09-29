"""The worker process. Phase 0: it proves it can reach the database, and waits.

Jobs arrive in Phase 1 with the jobs table.
"""

import logging
import signal
import threading

from api.db import database_reachable, make_engine
from api.settings import get_settings

log = logging.getLogger("duly.worker")


def run(stop: threading.Event) -> None:
    settings = get_settings()
    engine = make_engine(settings.database_url)
    while not stop.is_set():
        log.info("heartbeat database=%s", "ok" if database_reachable(engine) else "unreachable")
        stop.wait(settings.worker_interval_seconds)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")
    stop = threading.Event()
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, lambda *_: stop.set())
    run(stop)


if __name__ == "__main__":
    main()
