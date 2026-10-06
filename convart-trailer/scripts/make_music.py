"""Synthesize a 30s upbeat launch-trailer music bed (120 BPM) as 44.1k stereo WAV."""
import sys
import wave
import numpy as np

SR = 44100
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 30.0
END = float(sys.argv[3]) if len(sys.argv) > 3 else 24.8  # end-card hit
BPM = 120
BEAT = 60 / BPM
N = int(SR * DUR)
t = np.arange(N) / SR
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(7)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def add(buf, start, sig):
    i = int(start * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    buf[i : i + len(sig)] += sig


def env(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


# Chords: Am - F - C - G, 2 s each (one bar)
chords = [[57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62]]
bass_roots = [45, 41, 48, 43]

# Pad (saw-ish with detune, lowpassed by averaging), whole track
for bar in range(int(DUR / (4 * BEAT)) + 1):
    st = bar * 4 * BEAT
    ch = chords[bar % 4]
    n = int(4 * BEAT * SR)
    tt = np.arange(n) / SR
    sig = np.zeros(n)
    for m in ch:
        for det in (-0.08, 0.0, 0.08):
            f = midi(m + 12) * 2 ** (det / 12)
            sig += np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt)
    sig *= env(n, 0.3, 0.3) * 0.022
    add(L, st, sig)
    add(R, st, sig)

# Arpeggio pluck from 3.5s
arp_start = 3.5
step = BEAT / 2
k = 0
s = arp_start
while s < END - 0.2:
    bar = int(s / (4 * BEAT)) % 4
    ch = chords[bar]
    m = ch[k % 3] + 24 if (k // 3) % 2 == 0 else ch[(2 - k) % 3] + 24
    n = int(0.25 * SR)
    tt = np.arange(n) / SR
    sig = (np.sin(2 * np.pi * midi(m) * tt) + 0.4 * np.sin(2 * np.pi * 2 * midi(m) * tt)) * np.exp(-tt * 14) * 0.05
    pan = 0.5 + 0.35 * np.sin(k)
    add(L, s, sig * (1 - pan) * 2)
    add(R, s, sig * pan * 2)
    k += 1
    s += step

# Kick (four on the floor) 3.5 -> 24.6, and from 24.8 sparse
def kick():
    n = int(0.35 * SR)
    tt = np.arange(n) / SR
    f = 50 + 110 * np.exp(-tt * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-tt * 9) * 0.55


def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    noise = rng.standard_normal(n)
    noise = np.diff(np.concatenate([[0], noise]))  # crude highpass
    return noise * np.exp(-np.arange(n) / SR * (18 if open_ else 70)) * 0.05


def clap():
    n = int(0.2 * SR)
    noise = rng.standard_normal(n)
    e = np.exp(-np.arange(n) / SR * 22)
    return noise * e * 0.12


b = 3.5
while b < END - 0.3:
    add(L, b, kick())
    add(R, b, kick())
    add(L, b + BEAT / 2, hat(open_=True) * 0.8)
    add(R, b + BEAT / 2, hat(open_=True))
    beat_idx = round((b - 3.5) / BEAT)
    if beat_idx % 2 == 1 and b > 9:
        add(L, b, clap())
        add(R, b, clap())
    b += BEAT

# 16th hats in the middle section
s = 9.1
while s < END - 0.3:
    h = hat() * 0.7
    add(L, s, h)
    add(R, s + 0.004, h)
    s += BEAT / 4

# Sub bass following roots, 3.5 -> 24.6, 8th notes
s = 3.5
while s < END - 0.3:
    bar = int(s / (4 * BEAT)) % 4
    f = midi(bass_roots[bar])
    n = int(BEAT / 2 * SR * 0.9)
    tt = np.arange(n) / SR
    sig = np.tanh(2.2 * np.sin(2 * np.pi * f * tt)) * env(n, 0.005, 0.05) * 0.12
    add(L, s, sig)
    add(R, s, sig)
    s += BEAT / 2

# Riser 22.8 -> 24.8 (filtered noise swell)
n = int(2.0 * SR)
noise = rng.standard_normal(n)
sw = np.linspace(0, 1, n) ** 2.5
riser = np.convolve(noise, np.ones(8) / 8, mode="same") * sw * 0.12
add(L, END - 2.0, riser)
add(R, END - 2.0, riser)

# Impact + final sustained chord at 24.8
imp_n = int(2.5 * SR)
tt = np.arange(imp_n) / SR
impact = np.sin(2 * np.pi * (40 + 60 * np.exp(-tt * 8)) * tt) * np.exp(-tt * 2.2) * 0.6
add(L, END, impact)
add(R, END, impact)
n = int((DUR - END) * SR)
tt = np.arange(n) / SR
fin = np.zeros(n)
for m in [57, 60, 64, 69, 72]:
    fin += np.sin(2 * np.pi * midi(m) * tt) * np.exp(-tt * 0.5)
fin *= env(n, 0.02, 1.5) * 0.035
add(L, END, fin)
add(R, END, fin)

# Gentle fades + normalize
fade_in = int(0.4 * SR)
for buf in (L, R):
    buf[:fade_in] *= np.linspace(0, 1, fade_in)
    buf[-int(1.2 * SR):] *= np.linspace(1, 0, int(1.2 * SR))
peak = max(np.abs(L).max(), np.abs(R).max())
L, R = L / peak * 0.85, R / peak * 0.85

out = np.stack([L, R], axis=1)
pcm = (out * 32767).astype(np.int16)
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", sys.argv[1])
