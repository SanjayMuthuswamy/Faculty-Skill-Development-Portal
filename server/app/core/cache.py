from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import Any, Awaitable, Callable

from app.core.config import settings


@dataclass
class CacheEntry:
    value: Any
    expires_at: float


class TTLCache:
    def __init__(self) -> None:
        self._entries: dict[str, CacheEntry] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Any | None:
        if not settings.ENABLE_APP_CACHE:
            return None
        async with self._lock:
            entry = self._entries.get(key)
            if not entry:
                return None
            if entry.expires_at <= time.monotonic():
                self._entries.pop(key, None)
                return None
            return entry.value

    async def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> Any:
        if not settings.ENABLE_APP_CACHE:
            return value
        ttl = ttl_seconds or settings.APP_CACHE_TTL_SECONDS
        async with self._lock:
            self._entries[key] = CacheEntry(
                value=value,
                expires_at=time.monotonic() + max(1, ttl),
            )
        return value

    async def get_or_set(
        self,
        key: str,
        factory: Callable[[], Awaitable[Any]],
        ttl_seconds: int | None = None,
    ) -> Any:
        cached = await self.get(key)
        if cached is not None:
            return cached
        value = await factory()
        return await self.set(key, value, ttl_seconds=ttl_seconds)

    async def invalidate_prefix(self, prefix: str) -> None:
        async with self._lock:
            keys_to_delete = [key for key in self._entries if key.startswith(prefix)]
            for key in keys_to_delete:
                self._entries.pop(key, None)

    async def invalidate_prefixes(self, *prefixes: str) -> None:
        async with self._lock:
            keys_to_delete = [
                key for key in self._entries
                if any(key.startswith(prefix) for prefix in prefixes)
            ]
            for key in keys_to_delete:
                self._entries.pop(key, None)


app_cache = TTLCache()
