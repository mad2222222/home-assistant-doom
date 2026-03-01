"""WebSocket API for the DOOM integration."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, callback

from .manager import DoomConfigEntry


@callback
def _async_get_loaded_entry(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> DoomConfigEntry | None:
    """Get the loaded DOOM config entry or send an error."""
    entry_id: str = msg["entry_id"]

    if not (entry := hass.config_entries.async_get_entry(entry_id)):
        connection.send_error(msg["id"], "entry_not_found", "Entry not found")
        return None

    if entry.state is not ConfigEntryState.LOADED:
        connection.send_error(msg["id"], "entry_not_loaded", "Entry not loaded")
        return None

    return entry  # type: ignore[return-value]


@callback
def async_register_websocket_commands(hass: HomeAssistant) -> None:
    """Register DOOM WebSocket commands."""
    websocket_api.async_register_command(hass, handle_doom_ping)
    websocket_api.async_register_command(hass, handle_doom_stop)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "doom/ping",
        vol.Required("entry_id"): str,
    }
)
@callback
def handle_doom_ping(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle a DOOM playing heartbeat ping."""
    if not (entry := _async_get_loaded_entry(hass, connection, msg)):
        return

    entry.runtime_data.async_ping(connection.user.name)
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): "doom/stop",
        vol.Required("entry_id"): str,
    }
)
@callback
def handle_doom_stop(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle a DOOM stop playing signal."""
    if not (entry := _async_get_loaded_entry(hass, connection, msg)):
        return

    entry.runtime_data.async_stop()
    connection.send_result(msg["id"])
