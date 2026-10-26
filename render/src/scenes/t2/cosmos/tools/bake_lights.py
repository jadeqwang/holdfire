#!/usr/bin/env python3
"""Bake the cosmos group's Earth-at-night light map (equirectangular, 4096x2048, 8-bit grey) and city list.

Source data (public domain): Natural Earth 1:50m populated places and the 4k land mask from the Rare Earth renderer
(rare-earth-techno-remix/render/assets/geo). The map is a model, not a photo: population-weighted metro glows,
a stipple of towns drawn toward the cities, and roads of light between neighbouring cities over land, with a rough
per-country electrification factor so the lit world looks like the real one (Europe, the US, Japan, India bright;
much of central Africa and North Korea dark).

  python3 render/src/scenes/t2/cosmos/tools/bake_lights.py SRC_GEO_DIR OUT_DIR
"""
import json, sys, math
import numpy as np
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else '/home/user/jadeqwang/rare-earth-techno-remix/render/assets/geo'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'render/assets/t2'
W, H = 4096, 2048
rs = np.random.default_rng(1983)

land = np.asarray(Image.open(f'{SRC}/land_4k.png').convert('L'), dtype=np.float32) / 255.0
lat_row = 90.0 - (np.arange(H) + 0.5) * 180.0 / H
coslat = np.maximum(np.cos(np.radians(lat_row)), 0.05)

feats = json.load(open(f'{SRC}/ne_50m_populated_places_simple.geojson'))['features']
DARK = {'PRK': 0.03, 'ATA': 0.0, 'GRL': 0.25, 'SOM': 0.12, 'SSD': 0.1, 'CAF': 0.1, 'TCD': 0.12, 'NER': 0.15, 'MLI': 0.18, 'COD': 0.15,
        'ETH': 0.25, 'MDG': 0.2, 'MOZ': 0.25, 'TZA': 0.3, 'UGA': 0.3, 'ZMB': 0.35, 'AGO': 0.4, 'SDN': 0.4, 'MWI': 0.2, 'BFA': 0.2,
        'GIN': 0.2, 'SLE': 0.15, 'LBR': 0.15, 'CMR': 0.4, 'NGA': 0.5, 'KEN': 0.45, 'AFG': 0.25, 'MMR': 0.4, 'PNG': 0.2, 'YEM': 0.3,
        'SAH': 0.2, 'MRT': 0.25, 'MNG': 0.45, 'BOL': 0.6, 'LAO': 0.4, 'KHM': 0.45, 'NPL': 0.5, 'HTI': 0.3, 'RUS': 0.85, 'CAN': 0.95,
        'AUS': 0.9, 'BRA': 0.9, 'IND': 1.0, 'CHN': 1.05, 'USA': 1.25, 'JPN': 1.3, 'KOR': 1.3, 'TWN': 1.3, 'DEU': 1.3, 'FRA': 1.2,
        'GBR': 1.25, 'ITA': 1.2, 'ESP': 1.15, 'NLD': 1.4, 'BEL': 1.4, 'EGY': 1.1, 'SAU': 1.2, 'ARE': 1.4, 'QAT': 1.4, 'KWT': 1.4, 'ISR': 1.3}
cities = []
for f in feats:
    p = f['properties']
    pop = max(p.get('pop_max') or 0, p.get('pop_min') or 0, 20000)
    k = DARK.get(p['adm0_a3'], 0.75)
    if p['adm0_a3'] == 'ATA':
        continue
    cities.append((p['latitude'], p['longitude'], pop, k, p['nameascii']))
print(len(cities), 'cities')

def to_px(lat, lon):
    return (lon + 180.0) / 360.0 * W, (90.0 - lat) / 180.0 * H

def box_x(a, r_rows):
    """box blur along x with a per-row radius (wraps in longitude)"""
    out = np.empty_like(a)
    pad = int(r_rows.max()) + 1
    ap = np.concatenate([a[:, -pad:], a, a[:, :pad]], axis=1)
    cs = np.concatenate([np.zeros((H, 1), np.float64), np.cumsum(ap, axis=1, dtype=np.float64)], axis=1)
    x = np.arange(W)
    for y in range(H):
        r = int(r_rows[y])
        hi = x + pad + r + 1
        lo = x + pad - r
        out[y] = (cs[y, hi] - cs[y, lo]) / (2 * r + 1)
    return out

def box_y(a, r):
    r = int(r)
    ap = np.concatenate([np.zeros((r + 1, W)), a, np.zeros((r + 1, W))], axis=0)
    cs = np.cumsum(ap, axis=0, dtype=np.float64)
    y = np.arange(H)
    return (cs[y + 2 * r + 1] - cs[y]) / (2 * r + 1)

def blur(a, sig):
    """approximately gaussian on the sphere (3 box passes, x radius stretched by 1/cos(lat))"""
    r = max(1, int(round(sig * 1.0)))
    rr = np.minimum(np.round(r / coslat), W // 4).astype(int)
    for _ in range(3):
        a = box_x(a, rr)
        a = box_y(a, r)
    return a

# ---- metro glows (population weighted)
splat = np.zeros((H, W), np.float64)
for lat, lon, pop, k, _ in cities:
    x, y = to_px(lat, lon)
    splat[int(y) % H, int(x) % W] += (pop / 1e6) ** 0.8 * k
core = blur(splat, 1.2)
metro = blur(splat, 5)
region = blur(splat, 22)
landS = blur(land.astype(np.float64), 1)

# ---- towns: a stipple drawn toward the cities (and the coasts)
coast = np.clip(np.abs(land - blur(land.astype(np.float64), 4)) * 3, 0, 1)
rn = region / np.percentile(region[land > 0.5], 97)
mn = metro / np.percentile(metro[land > 0.5], 99.5)
prob = (np.clip(rn, 0, 4) ** 1.9 * 0.5 + np.clip(mn, 0, 6) ** 0.9 * 2.0) * (0.15 + 0.85 * landS) * (land > 0.4)
prob += coast * np.clip(rn, 0, 4) ** 1.2 * 0.5 * (land > 0.3)
prob *= coslat[:, None]                   # equirect rows near the poles cover less ground
cdf = np.cumsum(prob.ravel()); cdf /= cdf[-1]
N = 420000
idx = np.searchsorted(cdf, rs.random(N))
towns = np.zeros(H * W, np.float64)
np.add.at(towns, idx, 0.25 + rs.random(N) ** 3 * 1.6)
towns = towns.reshape(H, W)

# ---- roads of light: neighbouring cities over land, as faint great-circle threads with towns strung along them
def unit(lat, lon):
    a, b = math.radians(lat), math.radians(lon)
    return np.array([math.cos(a) * math.cos(b), math.cos(a) * math.sin(b), math.sin(a)])
U = np.array([unit(c[0], c[1]) for c in cities])
roads = np.zeros((H, W), np.float64)
n_roads = 0
for i, (lat, lon, pop, k, _) in enumerate(cities):
    d = np.arccos(np.clip(U @ U[i], -1, 1))
    order = np.argsort(d)[1:5]
    for j in order:
        if d[j] > math.radians(9) or j < i and i in np.argsort(np.arccos(np.clip(U @ U[j], -1, 1)))[1:5]:
            continue
        kk = min(k, cities[j][3])
        if kk < 0.2:
            continue
        w = d[j]
        n = max(8, int(w / (math.pi / H) * 1.5))
        s = np.linspace(0, 1, n)
        A, B = U[i], U[j]
        so = math.sin(w)
        P = (np.sin((1 - s) * w)[:, None] * A + np.sin(s * w)[:, None] * B) / so
        # gentle meander so the roads don't read as straight great circles
        perp = np.cross(A, B); perp /= np.linalg.norm(perp) + 1e-9
        mea = (np.sin(s * math.pi * (2 + i % 3)) * 0.08 + np.sin(s * math.pi * 7 + i) * 0.03) * w * np.sin(s * math.pi)
        P = P + perp[None, :] * mea[:, None]
        P /= np.linalg.norm(P, axis=1)[:, None]
        la = np.degrees(np.arcsin(P[:, 2])); lo = np.degrees(np.arctan2(P[:, 1], P[:, 0]))
        xs = ((lo + 180) / 360 * W).astype(int) % W; ys = np.clip(((90 - la) / 180 * H).astype(int), 0, H - 1)
        onl = land[ys, xs] > 0.4
        if onl.mean() < 0.8:
            continue
        inten = 0.16 * kk * min(1.5, ((pop * cities[j][2]) ** 0.5 / 1e6) ** 0.55)
        np.add.at(roads, (ys[onl], xs[onl]), inten)
        # towns along the road
        m = max(2, n // 18)
        pick = rs.integers(0, n, m)
        pick = pick[onl[pick]]
        np.add.at(towns, (ys[pick], xs[pick]), 0.5 + rs.random(len(pick)) * 1.2 * kk)
        n_roads += 1
print(n_roads, 'roads')
roads = blur(roads, 0.6) * 3

L = core * 9.0 + metro * 1.6 + region * 0.04 * landS + towns * 0.3 + roads
L = blur(L, 0.6) * 0.5 + L * 0.5
L *= np.clip(landS * 1.4, 0, 1) * 0.92 + 0.08 * (towns > 0)
img = 1 - np.exp(-L * 2.2)
img = np.clip(img, 0, 1) ** 0.85
Image.fromarray((img * 255 + 0.5).astype(np.uint8), 'L').save(f'{OUT}/earth_lights.png', optimize=True)
Image.fromarray((land * 255 + 0.5).astype(np.uint8), 'L').save(f'{OUT}/earth_land.png', optimize=True)
big = sorted(cities, key=lambda c: -c[2])
json.dump({'source': 'Natural Earth 1:50m populated places (public domain)',
           'cities': [[round(c[0], 3), round(c[1], 3), int(c[2]), round(c[3], 2)] for c in big]},
          open(f'{OUT}/earth_cities.json', 'w'), separators=(',', ':'))
print('ok', img.mean())
