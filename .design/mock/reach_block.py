"""Reference mock for the design direction: the main example drawn as a reach block.

Not app code. Kiro builds the real drawing in app/src/ui/drawing/; this only shows the target.
Reads the 40 recorded stations and draws the section as the front face of a block extruded
upstream, with the water standing in it at the printed WS ELEV, a staff-gauge scale and a
high-water mark.

Usage: python .design/mock/reach_block.py <out.svg> [--dark]
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
pts = [tuple(map(float, line.split("\t"))) for line in (ROOT / "realdata/huntington-section-01.tsv").read_text().split("\n") if line.strip()]
WS = 594.37
BANKS = (179.5, 230.8)
DARK = "--dark" in sys.argv

P = dict(
    canvas="#E7E8E3", ink="#1A1C19", muted="#5B5F58", rule="#C9CCC4",
    lit="#D7D4C6", shade="#8F8B7C", face="#615B4B", hatch="#4B4639",
    water="#8C7737", water_top="#A8924F", water_line="#4E3F14", gauge="#F4F4F0",
) if not DARK else dict(
    canvas="#161714", ink="#E6E8E3", muted="#9A9E95", rule="#34362F",
    lit="#5B5A51", shade="#2E2D28", face="#3A352B", hatch="#2A261F",
    water="#A88C45", water_top="#C2A65E", water_line="#E3C977", gauge="#E6E8E3",
)

W, H = 1200, 640
x0, x1 = 120, 860            # front face, station 0 to 500
base_el, top_el = 570.0, 665.0
fy0, fy1 = 560, 150          # front face y at base_el and at top_el
DX, DY = 230, -120           # the extrusion upstream, oblique


def X(sta):
    return x0 + (sta - 0) / 500.0 * (x1 - x0)


def Y(el):
    return fy0 + (el - base_el) / (top_el - base_el) * (fy1 - fy0)


def poly(points, fill, stroke="none", sw=0, extra=""):
    d = " ".join("%.1f,%.1f" % p for p in points)
    return '<polygon points="%s" fill="%s" stroke="%s" stroke-width="%s" %s/>' % (d, fill, stroke, sw, extra)


def mix(a, b, t):
    a = [int(a[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return "#%02x%02x%02x" % tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">' % (W, H, W, H)]
out.append('<defs><pattern id="soil" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
           '<rect width="9" height="9" fill="%s"/><line x1="0" y1="0" x2="0" y2="9" stroke="%s" stroke-width="2"/></pattern></defs>'
           % (P["face"], P["hatch"]))
out.append('<rect width="%d" height="%d" fill="%s"/>' % (W, H, P["canvas"]))

front = [(X(s), Y(e)) for s, e in pts]
back = [(x + DX, y + DY) for x, y in front]

# the top surface, strip by strip, shaded by slope: lit where the ground faces up-left
for i in range(len(front) - 1):
    (s0, e0), (s1, e1) = pts[i], pts[i + 1]
    slope = (e1 - e0) / max(s1 - s0, 1e-6)
    t = max(0.0, min(1.0, 0.5 + slope * 2.2))   # descending to the right faces the light
    col = mix(P["shade"], P["lit"], t)
    out.append(poly([front[i], front[i + 1], back[i + 1], back[i]], col, col, 0.6))

# the water: a level plane between where it meets the ground, and its body in front
wet = []
for i in range(len(pts) - 1):
    (s0, e0), (s1, e1) = pts[i], pts[i + 1]
    if (e0 - WS) * (e1 - WS) < 0:
        wet.append(s0 + (WS - e0) / (e1 - e0) * (s1 - s0))
left, right = min(w for w in wet if w < 210), max(w for w in wet if w > 200)
yw = Y(WS)
out.append(poly([(X(left), yw), (X(right), yw), (X(right) + DX, yw + DY), (X(left) + DX, yw + DY)],
                P["water_top"], "none", 0, 'fill-opacity="0.82"'))
body = [(X(left), yw)] + [(X(s), Y(e)) for s, e in pts if left < s < right] + [(X(right), yw)]
out.append(poly(body, P["water"], "none", 0, 'fill-opacity="0.92"'))
for k in range(1, 4):   # current lines on the surface, running upstream
    xs = X(left) + (X(right) - X(left)) * k / 4
    out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="1" stroke-opacity="0.55"/>'
               % (xs + DX * 0.2, yw + DY * 0.2, xs + DX * 0.75, yw + DY * 0.75, P["water_line"]))

# the cut face: ground below the profile, hatched, then its outline
out.append(poly(front + [(X(500), fy0), (X(0), fy0)], "url(#soil)"))
out.append('<polyline points="%s" fill="none" stroke="%s" stroke-width="2.4" stroke-linejoin="round"/>'
           % (" ".join("%.1f,%.1f" % p for p in front), P["ink"]))
# the block's right end face and its edges
rx, ry = front[-1]
out.append(poly([(rx, ry), (rx + DX, ry + DY), (rx + DX, fy0 + DY), (rx, fy0)], mix(P["face"], P["canvas"], 0.25), P["ink"], 1.2))
out.append('<polyline points="%s" fill="none" stroke="%s" stroke-width="1.2" stroke-opacity="0.6"/>'
           % (" ".join("%.1f,%.1f" % p for p in back), P["ink"]))
out.append('<rect x="%d" y="%d" width="%d" height="%d" fill="none" stroke="%s" stroke-width="1.6"/>'
           % (x0, fy1 - 4, 0, 0, P["ink"]))
out.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1.6"/>' % (x0, fy0, x1, fy0, P["ink"]))
out.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1.6"/>' % (x0, front[0][1], x0, fy0, P["ink"]))

# the water's front edge, and the high-water mark: a ticked line, the figure lettered above it
out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="2.2"/>'
           % (X(left), yw, X(right), yw, P["water_line"]))
# the high-water mark painted on the block's end wall, as on a pier: a ticked line at the level,
# the figure lettered above it, both skewed to lie on the wall
import math
ang = math.degrees(math.atan2(DY, DX))
wx, wy = rx + DX * 0.12, Y(WS) + DY * 0.12
L = DX * 0.76
out.append('<g transform="translate(%.1f %.1f) skewY(%.2f)">' % (wx, wy, ang))
out.append('<line x1="0" y1="0" x2="%.1f" y2="0" stroke="%s" stroke-width="3"/>' % (L, P["ink"]))
out.append('<line x1="0" y1="-9" x2="0" y2="9" stroke="%s" stroke-width="3"/>' % P["ink"])
out.append('<line x1="%.1f" y1="-9" x2="%.1f" y2="9" stroke="%s" stroke-width="3"/>' % (L, L, P["ink"]))
out.append('<text x="%.1f" y="-10" text-anchor="middle" font-family="IBM Plex Sans Condensed" font-weight="500" font-size="38" '
           'fill="%s" style="font-variant-numeric:tabular-nums">594.37</text>' % (L / 2, P["gauge"]))
out.append('</g>')
# the level carried from the water to the wall, dashed, so the mark reads as the water's level
out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="1.4" stroke-dasharray="6 5"/>'
           % (X(right), yw, rx, yw, P["water_line"]))
# the result named in words beside the wall
out.append('<text x="%.1f" y="%.1f" font-family="IBM Plex Sans Condensed" font-weight="500" font-size="15" fill="%s">WS ELEV 594.37 ft</text>'
           % (rx + DX + 18, Y(WS) + DY + 6, P["ink"]))
out.append('<text x="%.1f" y="%.1f" font-family="IBM Plex Sans" font-size="13" fill="%s">1-percent flood, 1,200 cfs</text>'
           % (rx + DX + 18, Y(WS) + DY + 24, P["muted"]))

# the staff gauge as the elevation axis: E-marks a foot apart, a figure every 5 ft
gx = x0 - 50
lo, hi = 570, 665
out.append('<rect x="%.1f" y="%.1f" width="38" height="%.1f" fill="%s" stroke="%s" stroke-width="1.2"/>'
           % (gx, Y(hi), Y(lo) - Y(hi), P["gauge"], P["ink"]))
for ft in range(lo, hi):
    y = Y(ft + 1)
    hgt = Y(ft) - Y(ft + 1)
    if ft % 2 == 0:
        out.append('<rect x="%.1f" y="%.1f" width="4" height="%.1f" fill="%s"/>' % (gx + 4, y, hgt, "#1A1C19"))
        for k in (0, 2, 4):
            out.append('<rect x="%.1f" y="%.1f" width="12" height="%.1f" fill="%s"/>' % (gx + 4, y + hgt * k / 5, hgt / 5, "#1A1C19"))
    if ft % 5 == 0:
        out.append('<text x="%.1f" y="%.1f" font-family="IBM Plex Sans Condensed" font-weight="500" font-size="12" fill="%s">%d</text>'
                   % (gx + 18, Y(ft) + 4, "#1A1C19", ft))
out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="3"/>' % (gx - 6, yw, gx + 44, yw, P["water_line"]))

# the bank stations as survey stakes on the top surface
for b, name in zip(BANKS, ("Left bank", "Right bank")):
    e = next(e1 + (b - s1) * (e2 - e1) / (s2 - s1) for (s1, e1), (s2, e2) in zip(pts, pts[1:]) if s1 <= b <= s2)
    bx, by = X(b) + DX * 0.55, Y(e) + DY * 0.55
    out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="2"/>' % (bx, by, bx, by - 38, P["ink"]))
    out.append('<rect x="%.1f" y="%.1f" width="70" height="20" fill="%s" stroke="%s"/>' % (bx, by - 58, P["canvas"], P["ink"]))
    out.append('<text x="%.1f" y="%.1f" font-family="IBM Plex Sans Condensed" font-weight="500" font-size="12" fill="%s">%s %.1f</text>'
               % (bx + 5, by - 44, P["ink"], name.split()[0], b))

# the scale along the base
for sta in range(0, 501, 100):
    out.append('<line x1="%.1f" y1="%d" x2="%.1f" y2="%d" stroke="%s" stroke-width="1.2"/>' % (X(sta), fy0, X(sta), fy0 + 7, P["ink"]))
    out.append('<text x="%.1f" y="%d" text-anchor="middle" font-family="IBM Plex Sans Condensed" font-weight="500" font-size="12" fill="%s">%d+00</text>'
               % (X(sta), fy0 + 22, P["muted"], sta // 100))
out.append('<text x="%d" y="%d" font-family="IBM Plex Sans" font-size="12" fill="%s">Station, ft. Elevation, ft NAVD88, drawn 2 times the horizontal scale. The block runs upstream; its depth is drawn, not computed.</text>'
           % (x0, fy0 + 46, P["muted"]))
out.append("</svg>")
Path(sys.argv[1]).write_text("\n".join(out), encoding="utf-8")
print("wrote", sys.argv[1], "left", round(left, 1), "right", round(right, 1))
