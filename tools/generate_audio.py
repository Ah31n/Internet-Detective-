#!/usr/bin/env python3
"""
INTERNET DETECTIVE — audio palette generator.

Every cue in the game is synthesised here so the soundscape is deterministic,
offline, tiny, and free of third-party licensing. The palette is deliberately
quiet: ambient beds sit around -34 dBFS, UI cues around -26 dBFS, and nothing
is bright or musical enough to pull attention off the investigation.

Run:  python3 tools/generate_audio.py
Out:  assets/audio/*.wav  (mono, 22.05 kHz, 16-bit PCM)
"""

from __future__ import annotations

import math
import pathlib
import wave

import numpy as np

SR = 22050
OUT = pathlib.Path(__file__).resolve().parent.parent / 'assets' / 'audio'
RNG = np.random.default_rng(20260924)


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #

def t(seconds: float) -> np.ndarray:
    return np.arange(int(SR * seconds)) / SR


def noise(seconds: float) -> np.ndarray:
    return RNG.normal(0.0, 1.0, int(SR * seconds))


def one_pole_low(x: np.ndarray, cutoff: float) -> np.ndarray:
    """Simple one-pole low-pass; enough character for ambience and thuds."""
    a = math.exp(-2.0 * math.pi * cutoff / SR)
    out = np.empty_like(x)
    acc = 0.0
    for i, sample in enumerate(x):
        acc = (1.0 - a) * sample + a * acc
        out[i] = acc
    return out


def one_pole_high(x: np.ndarray, cutoff: float) -> np.ndarray:
    return x - one_pole_low(x, cutoff)


def band(x: np.ndarray, low: float, high: float) -> np.ndarray:
    return one_pole_high(one_pole_low(x, high), low)


def sine(freq: float, seconds: float, phase: float = 0.0) -> np.ndarray:
    return np.sin(2.0 * math.pi * freq * t(seconds) + phase)


def decay(seconds: float, tau: float) -> np.ndarray:
    return np.exp(-t(seconds) / tau)


def attack(x: np.ndarray, ms: float = 6.0) -> np.ndarray:
    """Removes clicks at the start of a cue."""
    n = max(1, int(SR * ms / 1000.0))
    ramp = np.ones_like(x)
    ramp[:n] = np.linspace(0.0, 1.0, n)
    return x * ramp


def tail(x: np.ndarray, ms: float = 12.0) -> np.ndarray:
    n = max(1, int(SR * ms / 1000.0))
    ramp = np.ones_like(x)
    ramp[-n:] = np.linspace(1.0, 0.0, n)
    return x * ramp


def seamless(x: np.ndarray, fade_seconds: float = 0.6) -> np.ndarray:
    """Crossfades the tail into the head so an ambient bed loops without a seam."""
    n = int(SR * fade_seconds)
    head, body, end = x[:n], x[n:-n], x[-n:]
    ramp = np.linspace(0.0, 1.0, n)
    blended = end * (1.0 - ramp) + head * ramp
    return np.concatenate([blended, body])


def normalise(x: np.ndarray, peak_dbfs: float) -> np.ndarray:
    peak = float(np.max(np.abs(x)))
    if peak < 1e-9:
        return x
    return x / peak * (10.0 ** (peak_dbfs / 20.0))


def write(name: str, samples: np.ndarray, peak_dbfs: float) -> None:
    data = normalise(samples.astype(np.float64), peak_dbfs)
    clipped = np.clip(data, -1.0, 1.0)
    pcm = (clipped * 32767.0).astype('<i2')
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    with wave.open(str(path), 'wb') as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(SR)
        handle.writeframes(pcm.tobytes())
    kb = path.stat().st_size / 1024
    print(f'{name:34s} {len(pcm) / SR:5.2f}s  {kb:7.1f} KB')


# --------------------------------------------------------------------------- #
# AMBIENT — long, low, loopable. Nothing in these beds should be noticed.
# --------------------------------------------------------------------------- #

AMBIENT_SECONDS = 6.0


def ambient_hotel_room() -> np.ndarray:
    """Still air, a distant ventilation shaft, the building holding its breath."""
    bed = one_pole_low(noise(AMBIENT_SECONDS), 220) * 6.0
    vent = sine(78, AMBIENT_SECONDS) * 0.06 + sine(117, AMBIENT_SECONDS) * 0.025
    breath = 1.0 + 0.16 * sine(1.0 / 3.0, AMBIENT_SECONDS)
    return (bed + vent) * breath


def ambient_distant_city() -> np.ndarray:
    """Traffic a long way below, heard through glass."""
    rumble = one_pole_low(noise(AMBIENT_SECONDS), 140) * 7.0
    haze = band(noise(AMBIENT_SECONDS), 300, 1400) * 0.35
    swell = 1.0 + 0.3 * sine(1.0 / 6.0, AMBIENT_SECONDS)
    return rumble * swell + haze


def ambient_rain() -> np.ndarray:
    """Rain on a window: broad hiss, a soft low body, slow gusts."""
    hiss = band(noise(AMBIENT_SECONDS), 900, 7000) * 1.0
    body = one_pole_low(noise(AMBIENT_SECONDS), 400) * 2.4
    gust = 1.0 + 0.22 * sine(1.0 / 6.0, AMBIENT_SECONDS) + 0.1 * sine(0.43, AMBIENT_SECONDS)
    return (hiss + body) * gust


def ambient_electronic_hum() -> np.ndarray:
    """Mains hum and the hiss of equipment left switched on."""
    hum = (
        sine(50, AMBIENT_SECONDS) * 0.5
        + sine(100, AMBIENT_SECONDS) * 0.2
        + sine(150, AMBIENT_SECONDS) * 0.08
    )
    hiss = band(noise(AMBIENT_SECONDS), 2000, 6000) * 0.12
    return hum + hiss


def ambient_surveillance_room() -> np.ndarray:
    """Monitors, fans, and a thin whine somewhere near the ceiling."""
    fans = one_pole_low(noise(AMBIENT_SECONDS), 300) * 5.0
    whine = sine(2960, AMBIENT_SECONDS) * 0.022 + sine(1480, AMBIENT_SECONDS) * 0.014
    hum = sine(100, AMBIENT_SECONDS) * 0.18
    drift = 1.0 + 0.12 * sine(1.0 / 6.0, AMBIENT_SECONDS)
    return (fans + hum) * drift + whine


# --------------------------------------------------------------------------- #
# UI — brief, dry, physical. Paper, wood, and plastic, not beeps.
# --------------------------------------------------------------------------- #

def ui_tap() -> np.ndarray:
    click = band(noise(0.055), 900, 5200) * decay(0.055, 0.010)
    body = sine(310, 0.055) * decay(0.055, 0.014) * 0.25
    return tail(attack(click + body, 1.5), 8)


def ui_paper() -> np.ndarray:
    """A sheet moved across a desk."""
    grain = band(noise(0.30), 1600, 6500)
    shape = np.minimum(t(0.30) / 0.05, 1.0) * decay(0.30, 0.085)
    flutter = 1.0 + 0.4 * sine(23, 0.30)
    return tail(attack(grain * shape * flutter, 8), 40)


def ui_drawer() -> np.ndarray:
    """A shallow wooden drawer pulled and stopped."""
    slide = band(noise(0.42), 180, 1700)
    shape = np.minimum(t(0.42) / 0.09, 1.0) * np.exp(-np.maximum(t(0.42) - 0.16, 0) / 0.11)
    stop_at = int(SR * 0.33)
    knock = np.zeros(int(SR * 0.42))
    span = len(knock) - stop_at
    thud = np.sin(2 * math.pi * 120 * np.arange(span) / SR) * np.exp(
        -np.arange(span) / SR / 0.035
    )
    knock[stop_at:] = thud * 0.8
    return tail(attack(slide * shape + knock, 10), 30)


def ui_evidence_place() -> np.ndarray:
    """Card meeting cork: a low thud with a paper edge."""
    thud = (sine(96, 0.22) * 0.9 + sine(158, 0.22) * 0.3) * decay(0.22, 0.045)
    edge = band(noise(0.22), 1200, 5000) * decay(0.22, 0.020) * 0.5
    return tail(attack(thud + edge, 2), 25)


def ui_notification() -> np.ndarray:
    """Two soft muted tones. A note slid under the door, not an alert."""
    first = sine(523.25, 0.5) * decay(0.5, 0.12) * 0.7
    second = np.zeros(int(SR * 0.5))
    offset = int(SR * 0.13)
    span = len(second) - offset
    partial = (
        np.sin(2 * math.pi * 783.99 * np.arange(span) / SR)
        * np.exp(-np.arange(span) / SR / 0.13)
        * 0.5
    )
    second[offset:] = partial
    muted = one_pole_low(first + second, 2200)
    return tail(attack(muted, 8), 60)


def ui_document_open() -> np.ndarray:
    """A folder opened: paper, then air."""
    sweep = band(noise(0.42), 900, 5200)
    shape = np.minimum(t(0.42) / 0.04, 1.0) * decay(0.42, 0.13)
    air = one_pole_low(noise(0.42), 700) * decay(0.42, 0.09) * 1.6
    return tail(attack(sweep * shape + air, 6), 50)


# --------------------------------------------------------------------------- #
# INVESTIGATION — instruments and equipment, still restrained.
# --------------------------------------------------------------------------- #

def inv_camera_shutter() -> np.ndarray:
    """Mirror up, mirror down."""
    out = np.zeros(int(SR * 0.26))
    for offset, gain, tau in ((0.0, 1.0, 0.009), (0.085, 0.72, 0.013)):
        start = int(SR * offset)
        span = len(out) - start
        click = band(noise(span / SR), 1400, 7000) * np.exp(-np.arange(span) / SR / tau)
        mech = np.sin(2 * math.pi * 420 * np.arange(span) / SR) * np.exp(
            -np.arange(span) / SR / 0.006
        )
        out[start:] += (click + mech * 0.35) * gain
    return tail(attack(out, 1), 25)


def inv_cctv_activate() -> np.ndarray:
    """A relay closes and a monitor finds signal."""
    relay = band(noise(0.9), 800, 5000) * decay(0.9, 0.008)
    ramp = np.minimum(t(0.9) / 0.25, 1.0) * np.exp(-np.maximum(t(0.9) - 0.45, 0) / 0.30)
    hum = (sine(100, 0.9) * 0.5 + sine(200, 0.9) * 0.18) * ramp
    line = sine(2960, 0.9) * ramp * 0.05
    hiss = band(noise(0.9), 1500, 6000) * ramp * 0.18
    return tail(attack(relay + hum + line + hiss, 2), 90)


def inv_timeline_confirm() -> np.ndarray:
    """Two low wooden notes, a fifth apart. Confirmation, not fanfare."""
    out = np.zeros(int(SR * 1.1))
    for offset, freq, gain in ((0.0, 261.63, 1.0), (0.11, 392.0, 0.62)):
        start = int(SR * offset)
        span = len(out) - start
        seconds = span / SR
        tone = (
            np.sin(2 * math.pi * freq * np.arange(span) / SR)
            + 0.22 * np.sin(2 * math.pi * freq * 2 * np.arange(span) / SR)
        ) * np.exp(-np.arange(span) / SR / 0.20)
        strike = band(noise(seconds), 1200, 5000) * np.exp(-np.arange(span) / SR / 0.006) * 0.3
        out[start:] += (tone + strike) * gain
    return tail(attack(one_pole_low(out, 4000), 4), 120)


def inv_contradiction() -> np.ndarray:
    """A dark minor second, low and short. Something does not fit."""
    low = sine(146.83, 1.2) * decay(1.2, 0.34)
    clash = sine(155.56, 1.2) * decay(1.2, 0.30) * 0.75
    floor = sine(73.42, 1.2) * decay(1.2, 0.26) * 0.5
    scrape = band(noise(1.2), 300, 1800) * decay(1.2, 0.05) * 0.18
    return tail(attack(one_pole_low(low + clash + floor + scrape, 2600), 14), 150)


# --------------------------------------------------------------------------- #
# COMPLETION — the file is stamped and set down.
# --------------------------------------------------------------------------- #

def completion_case_closed() -> np.ndarray:
    stamp = (sine(88, 2.6) * 0.9 + sine(140, 2.6) * 0.35) * decay(2.6, 0.055)
    impact = band(noise(2.6), 600, 4200) * decay(2.6, 0.018) * 0.45
    chord = np.zeros(int(SR * 2.6))
    start = int(SR * 0.10)
    span = len(chord) - start
    for freq, gain in ((130.81, 1.0), (196.0, 0.55), (261.63, 0.34), (329.63, 0.16)):
        chord[start:] += (
            np.sin(2 * math.pi * freq * np.arange(span) / SR)
            * np.exp(-np.arange(span) / SR / 0.85)
            * gain
        )
    swell = np.minimum(t(2.6) / 0.20, 1.0)
    return tail(attack(one_pole_low(stamp + impact + chord * 0.5 * swell, 3200), 4), 400)


# --------------------------------------------------------------------------- #

AMBIENT_PEAK = -21.0   # beds are further attenuated at runtime by the mixer
UI_PEAK = -13.0
INVESTIGATION_PEAK = -11.0
COMPLETION_PEAK = -9.0

CUES = [
    ('ambient-hotel-room.wav', ambient_hotel_room, AMBIENT_PEAK, True),
    ('ambient-distant-city.wav', ambient_distant_city, AMBIENT_PEAK, True),
    ('ambient-rain.wav', ambient_rain, AMBIENT_PEAK, True),
    ('ambient-electronic-hum.wav', ambient_electronic_hum, AMBIENT_PEAK, True),
    ('ambient-surveillance-room.wav', ambient_surveillance_room, AMBIENT_PEAK, True),
    ('ui-tap.wav', ui_tap, UI_PEAK, False),
    ('ui-paper.wav', ui_paper, UI_PEAK, False),
    ('ui-drawer.wav', ui_drawer, UI_PEAK, False),
    ('ui-evidence-place.wav', ui_evidence_place, UI_PEAK, False),
    ('ui-notification.wav', ui_notification, UI_PEAK, False),
    ('ui-document-open.wav', ui_document_open, UI_PEAK, False),
    ('investigation-camera-shutter.wav', inv_camera_shutter, INVESTIGATION_PEAK, False),
    ('investigation-cctv-activate.wav', inv_cctv_activate, INVESTIGATION_PEAK, False),
    ('investigation-timeline-confirm.wav', inv_timeline_confirm, INVESTIGATION_PEAK, False),
    ('investigation-contradiction.wav', inv_contradiction, INVESTIGATION_PEAK, False),
    ('completion-case-closed.wav', completion_case_closed, COMPLETION_PEAK, False),
]


def main() -> None:
    total = 0
    for name, render, peak, loopable in CUES:
        samples = render()
        if loopable:
            samples = seamless(samples)
        write(name, samples, peak)
        total += (OUT / name).stat().st_size
    print(f'\n{len(CUES)} cues · {total / 1024 / 1024:.2f} MB total')


if __name__ == '__main__':
    main()
