"""Playing state coordinator for the DOOM integration."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers.event import async_call_later
from homeassistant.util import dt as dt_util

PLAYING_TIMEOUT = 3  # seconds

type DoomConfigEntry = ConfigEntry[DoomPlayingManager]


class DoomPlayingManager:
    """Manage DOOM playing state with heartbeat timeout."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the playing manager."""
        self._hass = hass
        self._is_playing = False
        self._timeout_cancel: CALLBACK_TYPE | None = None
        self._listeners: list[Callable[[bool], None]] = []
        self._session_start: datetime | None = None
        self._current_player: str | None = None

    @property
    def is_playing(self) -> bool:
        """Return whether DOOM is currently being played."""
        return self._is_playing

    @property
    def session_start(self) -> datetime | None:
        """Return the start time of the current session."""
        return self._session_start

    @property
    def current_player(self) -> str | None:
        """Return the name of the user currently playing."""
        return self._current_player

    @callback
    def async_add_listener(self, listener: Callable[[bool], None]) -> CALLBACK_TYPE:
        """Add a listener for playing state changes."""
        self._listeners.append(listener)

        @callback
        def remove_listener() -> None:
            self._listeners.remove(listener)

        return remove_listener

    @callback
    def async_ping(self, player_name: str | None = None) -> None:
        """Handle a playing heartbeat ping from the frontend."""
        if self._timeout_cancel is not None:
            self._timeout_cancel()

        if not self._is_playing:
            self._is_playing = True
            self._session_start = dt_util.utcnow()
            self._current_player = player_name
            self._notify_listeners()

        self._timeout_cancel = async_call_later(
            self._hass, PLAYING_TIMEOUT, self._async_timeout
        )

    @callback
    def async_stop(self) -> None:
        """Handle an explicit stop signal from the frontend."""
        if self._timeout_cancel is not None:
            self._timeout_cancel()
            self._timeout_cancel = None

        if self._is_playing:
            self._end_session()

    @callback
    def _async_timeout(self, _now: object) -> None:
        """Handle heartbeat timeout."""
        self._timeout_cancel = None
        if self._is_playing:
            self._end_session()

    @callback
    def _end_session(self) -> None:
        """End the current playing session."""
        self._is_playing = False
        self._session_start = None
        self._current_player = None
        self._notify_listeners()

    @callback
    def _notify_listeners(self) -> None:
        """Notify all listeners of a state change."""
        for listener in self._listeners:
            listener(self._is_playing)
