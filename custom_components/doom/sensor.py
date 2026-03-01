"""Sensor platform for the DOOM integration."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
import random

from homeassistant.components.sensor import (
    RestoreSensor,
    SensorDeviceClass,
    SensorEntity,
    SensorEntityDescription,
    SensorStateClass,
)
from homeassistant.const import EntityCategory
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.util import dt as dt_util

from .entity import DoomEntity
from .manager import DoomConfigEntry, DoomPlayingManager

SCAN_INTERVAL = timedelta(days=1)

DOOM_FACTS: list[str] = [
    "rip_and_tear",
    "huge_guts",
    "rage_brutal",
    "first_age",
    "against_all_evil",
    "only_thing_they_fear",
    "not_a_massage",
    "ouch",
    "secret_area",
    "be_careful",
    "infested_starport",
    "created_1993",
    "carmack_engine",
    "team_of_six",
    "deathmatch",
    "bfg",
    "shareware_bbs",
    "cacodemon_design",
    "moons_of_mars",
    "bobby_prince",
    "open_source",
    "ported_everywhere",
    "doomguy",
    "no_look_up_down",
    "wad_modding",
    "iddqd",
    "idkfa",
    "spider_mastermind",
    "knee_deep_downloads",
    "super_shotgun",
    "cyberdemon",
    "more_than_windows",
    "imp_fireball",
    "bsp_rendering",
    "pinky_demon",
    "speedrun",
    "romero_head",
    "floppy_disks",
    "e1m1",
    "popular_1995",
    "chainsaw_evil_dead",
    "lost_soul",
    "blessed_server",
    "resolution_320x200",
    "faster_processors",
    "mars_setting",
]


@dataclass(frozen=True, kw_only=True)
class DoomSessionSensorEntityDescription(SensorEntityDescription):
    """Describes a DOOM session tracking sensor entity."""

    tracks_duration: bool = False
    on_start_fn: Callable[[int | float | None], int | float | None] | None = None
    on_stop_fn: (
        Callable[
            [int | float | datetime | None, float],
            int | float | datetime | None,
        ]
        | None
    ) = None
    on_tick_fn: Callable[[int | float | None, float], int | float | None] | None = None


DOOM_CURRENT_PLAYER_DESCRIPTION = SensorEntityDescription(
    key="current_player",
    translation_key="current_player",
    device_class=SensorDeviceClass.ENUM,
    entity_category=EntityCategory.DIAGNOSTIC,
)

DOOM_FACT_SENSOR_DESCRIPTION = SensorEntityDescription(
    key="fact",
    translation_key="fact",
    device_class=SensorDeviceClass.ENUM,
)

DOOM_SESSION_SENSOR_DESCRIPTIONS: tuple[DoomSessionSensorEntityDescription, ...] = (
    DoomSessionSensorEntityDescription(
        key="last_played",
        translation_key="last_played",
        device_class=SensorDeviceClass.TIMESTAMP,
        entity_category=EntityCategory.DIAGNOSTIC,
        on_stop_fn=lambda _current, _duration: dt_util.utcnow(),
    ),
    DoomSessionSensorEntityDescription(
        key="session_duration",
        translation_key="session_duration",
        device_class=SensorDeviceClass.DURATION,
        native_unit_of_measurement="s",
        suggested_unit_of_measurement="min",
        entity_category=EntityCategory.DIAGNOSTIC,
        tracks_duration=True,
        on_start_fn=lambda _current: 0,
        on_stop_fn=lambda _current, duration: round(duration),
        on_tick_fn=lambda _base, elapsed: round(elapsed),
    ),
)

DOOM_SESSION_RESTORE_SENSOR_DESCRIPTIONS: tuple[
    DoomSessionSensorEntityDescription, ...
] = (
    DoomSessionSensorEntityDescription(
        key="total_play_time",
        translation_key="total_play_time",
        device_class=SensorDeviceClass.DURATION,
        native_unit_of_measurement="s",
        suggested_unit_of_measurement="h",
        state_class=SensorStateClass.TOTAL_INCREASING,
        entity_category=EntityCategory.DIAGNOSTIC,
        tracks_duration=True,
        on_stop_fn=lambda current, duration: (current or 0) + round(duration),
        on_tick_fn=lambda base, elapsed: (base or 0) + round(elapsed),
    ),
    DoomSessionSensorEntityDescription(
        key="sessions_played",
        translation_key="sessions_played",
        state_class=SensorStateClass.TOTAL_INCREASING,
        entity_category=EntityCategory.DIAGNOSTIC,
        on_start_fn=lambda current: (current or 0) + 1,
    ),
)


class _DoomSessionTrackingMixin:
    """Mixin providing session tracking logic for DOOM sensors.

    Meant to be used alongside DoomEntity and SensorEntity/RestoreSensor.
    """

    entity_description: DoomSessionSensorEntityDescription
    _manager: DoomPlayingManager
    _session_start: datetime | None
    _base_value: int | float | None
    _cancel_tick: CALLBACK_TYPE | None

    @callback
    def _async_on_update(self, is_playing: bool) -> None:
        """Handle playing state update."""
        description = self.entity_description
        if is_playing:
            if description.tracks_duration:
                self._session_start = self._manager.session_start
            self._base_value = self._attr_native_value
            if description.on_start_fn is not None:
                self._attr_native_value = description.on_start_fn(
                    self._attr_native_value
                )
                self.async_write_ha_state()
            if description.on_tick_fn is not None:
                self._cancel_tick = async_track_time_interval(
                    self.hass, self._async_tick, timedelta(seconds=1)
                )
        else:
            self._stop_tick()
            if description.on_stop_fn is not None:
                duration = 0.0
                if self._session_start is not None:
                    duration = (dt_util.utcnow() - self._session_start).total_seconds()
                    self._session_start = None
                self._attr_native_value = description.on_stop_fn(
                    self._base_value, duration
                )
                self.async_write_ha_state()

    @callback
    def _async_tick(self, _now: datetime) -> None:
        """Update sensor value every second during play."""
        if self._session_start is None:
            return
        elapsed = (dt_util.utcnow() - self._session_start).total_seconds()
        self._attr_native_value = self.entity_description.on_tick_fn(
            self._base_value, elapsed
        )
        self.async_write_ha_state()

    @callback
    def _stop_tick(self) -> None:
        """Cancel the periodic tick timer."""
        if self._cancel_tick is not None:
            self._cancel_tick()
            self._cancel_tick = None


async def async_setup_entry(
    hass: HomeAssistant,
    entry: DoomConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up DOOM sensors from a config entry."""
    manager = entry.runtime_data
    entities: list[SensorEntity] = [
        DoomFactSensor(entry),
        DoomCurrentPlayerSensor(entry, manager),
    ]
    entities.extend(
        DoomSessionSensor(entry, manager, description)
        for description in DOOM_SESSION_SENSOR_DESCRIPTIONS
    )
    entities.extend(
        DoomSessionRestoreSensor(entry, manager, description)
        for description in DOOM_SESSION_RESTORE_SENSOR_DESCRIPTIONS
    )
    async_add_entities(entities)


class DoomFactSensor(DoomEntity, SensorEntity):
    """A sensor that displays random DOOM facts and quotes."""

    entity_description = DOOM_FACT_SENSOR_DESCRIPTION
    _attr_options = DOOM_FACTS
    _attr_should_poll = True

    def __init__(self, entry: DoomConfigEntry) -> None:
        """Initialize the DOOM fact sensor."""
        super().__init__(entry)
        self._attr_unique_id = f"{entry.entry_id}_{self.entity_description.key}"
        self._attr_native_value = random.choice(DOOM_FACTS)

    async def async_update(self) -> None:
        """Pick a new random DOOM fact or quote."""
        self._attr_native_value = random.choice(DOOM_FACTS)


class DoomCurrentPlayerSensor(DoomEntity, SensorEntity):
    """Sensor showing which user is currently playing DOOM."""

    entity_description = DOOM_CURRENT_PLAYER_DESCRIPTION
    _attr_should_poll = False

    def __init__(self, entry: DoomConfigEntry, manager: DoomPlayingManager) -> None:
        """Initialize the current player sensor."""
        super().__init__(entry)
        self._attr_unique_id = f"{entry.entry_id}_{self.entity_description.key}"
        self._manager = manager
        self._attr_options = ["nobody"]
        self._attr_native_value = "nobody"

    async def _async_build_options(self) -> list[str]:
        """Build the list of possible player options."""
        users = await self.hass.auth.async_get_users()
        names = sorted(
            {user.name for user in users if user.name and not user.system_generated}
        )
        return ["nobody", *names]

    @callback
    def _get_state(self) -> str:
        """Return the current state value."""
        player = self._manager.current_player
        return player if player and player in self._attr_options else "nobody"

    async def async_added_to_hass(self) -> None:
        """Register with the playing manager when added."""
        self._attr_options = await self._async_build_options()
        self._attr_native_value = self._get_state()
        self.async_on_remove(self._manager.async_add_listener(self._async_on_update))

    @callback
    def _async_on_update(self, is_playing: bool) -> None:
        """Handle playing state update."""
        self._attr_native_value = self._get_state()
        self.async_write_ha_state()


class DoomSessionSensor(_DoomSessionTrackingMixin, DoomEntity, SensorEntity):
    """Sensor tracking DOOM session events."""

    entity_description: DoomSessionSensorEntityDescription
    _attr_should_poll = False

    def __init__(
        self,
        entry: DoomConfigEntry,
        manager: DoomPlayingManager,
        description: DoomSessionSensorEntityDescription,
    ) -> None:
        """Initialize the DOOM session sensor."""
        super().__init__(entry)
        self.entity_description = description
        self._attr_unique_id = f"{entry.entry_id}_{description.key}"
        self._manager = manager
        self._session_start: datetime | None = None
        self._base_value: int | float | None = None
        self._cancel_tick: CALLBACK_TYPE | None = None

    async def async_added_to_hass(self) -> None:
        """Register with the playing manager when added."""
        self.async_on_remove(self._manager.async_add_listener(self._async_on_update))


class DoomSessionRestoreSensor(_DoomSessionTrackingMixin, DoomEntity, RestoreSensor):
    """Sensor tracking DOOM session events with persistent state."""

    entity_description: DoomSessionSensorEntityDescription
    _attr_should_poll = False
    _attr_native_value: int | float = 0

    def __init__(
        self,
        entry: DoomConfigEntry,
        manager: DoomPlayingManager,
        description: DoomSessionSensorEntityDescription,
    ) -> None:
        """Initialize the DOOM session restore sensor."""
        super().__init__(entry)
        self.entity_description = description
        self._attr_unique_id = f"{entry.entry_id}_{description.key}"
        self._manager = manager
        self._session_start: datetime | None = None
        self._base_value: int | float = 0
        self._cancel_tick: CALLBACK_TYPE | None = None

    async def async_added_to_hass(self) -> None:
        """Restore previous state and register listener."""
        last_data = await self.async_get_last_sensor_data()
        if last_data and last_data.native_value is not None:
            self._attr_native_value = int(float(str(last_data.native_value)))
        self.async_on_remove(self._manager.async_add_listener(self._async_on_update))
