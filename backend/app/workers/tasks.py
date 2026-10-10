"""Celery worker tasks for certificate generation.

This module is only used when WORKER_MODE=celery.
In thread mode, job_service._process_job_async handles processing.
"""

from app.core.config import settings

# Only configure Celery if in celery mode
try:
    from celery import Celery

    celery_app = Celery(
        "certiflow",
        broker=settings.CELERY_BROKER_URL,
        backend=settings.CELERY_RESULT_BACKEND,
    )
    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        task_acks_late=True,  # Acknowledge after completion for reliability
        worker_prefetch_multiplier=1,  # Process one task at a time per worker
        task_max_retries=3,
    )

    @celery_app.task(name="process_generation_job", bind=True, max_retries=2)
    def process_generation_job(self, job_id: str):
        """Celery task to process a generation job asynchronously."""
        import asyncio
        from app.services.job_service import _process_job_async

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(_process_job_async(job_id))
        except Exception as exc:
            raise self.retry(exc=exc, countdown=30)
        finally:
            loop.close()

except ImportError:
    pass
