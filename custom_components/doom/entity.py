"""Base entity for the DOOM integration."""

from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity import Entity

from .const import DOMAIN
from .manager import DoomConfigEntry


class DoomEntity(Entity):
    """Define a base DOOM entity."""

    _attr_has_entity_name = True

    def __init__(self, entry: DoomConfigEntry) -> None:
        """Initialize the DOOM entity."""
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name="DOOM",
            manufacturer="id Software",
            model="DOOM (1993)",
        )
