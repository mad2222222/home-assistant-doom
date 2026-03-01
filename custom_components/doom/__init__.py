"""DOOM integration for Home Assistant."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url, remove_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .const import URL_BASE
from .manager import DoomConfigEntry, DoomPlayingManager
from .websocket_api import async_register_websocket_commands

FRONTEND_PATH = Path(__file__).parent / "frontend"

PLATFORMS = [Platform.BINARY_SENSOR, Platform.SENSOR]


async def async_setup_entry(hass: HomeAssistant, entry: DoomConfigEntry) -> bool:
    """Set up DOOM from a config entry."""
    entry.runtime_data = DoomPlayingManager(hass)

    await hass.http.async_register_static_paths(
        [StaticPathConfig(URL_BASE, str(FRONTEND_PATH), cache_headers=True)]
    )
    add_extra_js_url(hass, f"{URL_BASE}/doom-card.js")
    add_extra_js_url(hass, f"{URL_BASE}/doom-iddqd.js")

    async_register_websocket_commands(hass)

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: DoomConfigEntry) -> bool:
    """Unload a DOOM config entry."""
    remove_extra_js_url(hass, f"{URL_BASE}/doom-card.js")
    remove_extra_js_url(hass, f"{URL_BASE}/doom-iddqd.js")
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
