"""Read tests/design/landmarks.json from the canvas markup of design/canvas/screens.

specs/design-1/SPEC.md section 14.1 (Landmarks): "landmarks.json is read from the canvas
markup. Then these overrides are applied, each listed in the file with its reason."
specs/product-2/resolutions.md points 11 and 15: tests/design/landmarks.json holds each
canvas landmark.

A landmark is every element of a screen file that draws text of its own, every element
whose markup gives it a width or a height, and every svg, including the parts inside an
sc-if (marked `in_sc_if`, drawn only when that part is open). For each, the file keeps
what the markup declares (its own style) and the type it draws with (font size, weight,
letter spacing, line height and colour, inherited as CSS inherits them from the file's
body rule). Text is kept as a label to find the element by, never to compare.

Boxes the markup fixes by arithmetic are given: the sidebar at 0 to its width over the
page height, and the column centred in the space beside it, at x = sidebar + (page width
- sidebar - column width) / 2 (1280 page, 208 sidebar, 720 column: 208 + 176 = 384). A top
or a height that depends on how the font sets its lines is not given here: with
CHROME set to a Chromium, this reader also opens each file at its board size with
animation off and adds each landmark's measured box as `measured` (in order of the
document, the same elements). In the lane's sandbox Chromium is stopped (SIGTRAP), so
the file here holds the markup reading only.

    uv run python -m tests.design.read_canvas
    CHROME=/path/to/chrome-headless-shell uv run python -m tests.design.read_canvas

Nothing in tests/unit or tests/holdout imports it.
"""

import json
import os
import re
import shutil
import subprocess
import tempfile
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
SCREENS = ROOT / "design" / "canvas" / "screens"
BOARDS = ROOT / "design" / "canvas" / "canvas.json"
OUT = Path(__file__).resolve().parent / "landmarks.json"

MEASURE = """
<style>*,*::before,*::after{animation:none!important;transition:none!important}</style>
<script>
window.addEventListener('load', function () { setTimeout(function () {
  var root = document.getElementById('dc-root') || document.body;
  var found = [];
  var all = root.querySelectorAll('*');
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    var own = '';
    for (var c = el.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) own += c.textContent;
    }
    own = own.replace(/\\s+/g, ' ').trim();
    var style = el.getAttribute('style') || '';
    var sized = /(^|;|\\s)(width|height)\\s*:/.test(style);
    var isSvg = el.tagName.toLowerCase() === 'svg';
    if (!own && !sized && !isSvg) continue;
    var r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    var cs = getComputedStyle(el);
    found.push({
      tag: el.tagName.toLowerCase(),
      label: own.slice(0, 60),
      box: {x: r.left, y: r.top, w: r.width, h: r.height},
      type: own ? {
        font_size: cs.fontSize, font_weight: cs.fontWeight,
        letter_spacing: cs.letterSpacing, line_height: cs.lineHeight,
        color: cs.color
      } : null,
      padding_top: cs.paddingTop,
      background: cs.backgroundColor,
      stroke: isSvg ? (el.getAttribute('stroke') || null) : null
    });
  }
  var pre = document.createElement('pre');
  pre.id = 'landmarks-out';
  pre.textContent = JSON.stringify(found);
  document.body.appendChild(pre);
}, 300); });
</script>
"""

# specs/design-1/SPEC.md section 14.1, the overrides, each with its reason as the SPEC says.
OVERRIDES: list[dict[str, str]] = [
    {"match": "text color #8A8780 or #B0ACA3", "becomes": "--ink-2", "reason": "SPEC 14.1"},
    {"match": "chevron stroke #B0ACA3", "becomes": "--ink-3", "reason": "SPEC 14.1"},
    {
        "match": "unchecked checkbox and later ring #C9C5BC",
        "becomes": "--ink-3",
        "reason": "SPEC 14.1",
    },
    {"match": "next ring #8FA6D9", "becomes": "--ring-next", "reason": "SPEC 14.1"},
    {"match": "link hover #0A4C41", "becomes": "--accent-hover", "reason": "SPEC 14.1"},
    {
        "match": "top padding",
        "becomes": "54, 52, 52 and 50 by file, and 52 for undrawn pages",
        "reason": "SPEC 14.1",
    },
    {
        "match": "hero mark",
        "becomes": "keeps its 15px box; its drawing is not compared",
        "reason": "SPEC 14.1",
    },
    {
        "match": "Home metrics",
        "becomes": "only the first metric's left edge and the divider are compared",
        "reason": "SPEC 14.1: Home has two metrics",
    },
    {
        "match": "text content",
        "becomes": "never compared; where words change, only left, top and height",
        "reason": "SPEC 14.1",
    },
    {"match": "dark shots", "becomes": "colours against the dark tokens", "reason": "SPEC 14.1"},
    {
        "match": "control hit area",
        "becomes": "the drawn box keeps its canvas size; the 44px area is a ::before",
        "reason": "SPEC F13",
    },
]

INHERITED = ("font-size", "font-weight", "letter-spacing", "line-height", "color")
VOID = {"br", "img", "input", "link", "meta", "hr", "path", "circle", "rect", "line"}


def _style(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for part in text.split(";"):
        if ":" in part:
            key, val = part.split(":", 1)
            out[key.strip().lower()] = val.strip()
    return out


def _body_rule(markup: str) -> dict[str, str]:
    got = re.search(r"body\{([^}]*)\}", markup)
    base = {"font-size": "16px", "font-weight": "400", "letter-spacing": "normal"}
    base["line-height"] = "normal"
    base["color"] = "#000000"
    if got:
        base.update({k: v for k, v in _style(got.group(1)).items() if k in INHERITED})
    return base


class _Reader(HTMLParser):
    def __init__(self, body: dict[str, str]) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[dict[str, Any]] = []
        self.body = body
        self.found: list[dict[str, Any]] = []
        self.inside = False

    def _type(self) -> dict[str, str]:
        drawn = dict(self.body)
        for frame in self.stack:
            drawn.update({k: v for k, v in frame["style"].items() if k in INHERITED})
        return drawn

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "x-dc":
            self.inside = True
        if not self.inside or tag in ("helmet", "style", "script", "link"):
            skip = tag in ("helmet", "style", "script")
            if tag not in VOID:
                self.stack.append({"tag": tag, "style": {}, "entry": None, "skip": skip})
            return
        a = {k: v or "" for k, v in attrs}
        style = _style(a.get("style", ""))
        in_svg = any(f["tag"] == "svg" for f in self.stack)
        entry: dict[str, Any] | None = None
        sized = "width" in style or "height" in style
        if (tag == "svg" or (sized and not in_svg)) and not self._skipping():
            entry = self._entry(tag, style, a)
            self.found.append(entry)
        if tag in VOID:
            return
        self.stack.append({"tag": tag, "style": style, "entry": entry, "skip": False})

    def _skipping(self) -> bool:
        return any(f["skip"] for f in self.stack)

    def _entry(self, tag: str, style: dict[str, str], a: dict[str, str]) -> dict[str, Any]:
        entry: dict[str, Any] = {"tag": tag, "label": "", "declared": style}
        if a.get("class"):
            entry["class"] = a["class"]
        if tag == "svg":
            entry["svg"] = {k: a[k] for k in ("width", "height", "stroke", "fill") if k in a}
        if any(f["tag"] == "sc-if" for f in self.stack):
            entry["in_sc_if"] = True
        return entry

    def handle_endtag(self, tag: str) -> None:
        if tag == "x-dc":
            self.inside = False
        if tag in VOID:
            return
        while self.stack:
            frame = self.stack.pop()
            if frame["tag"] == tag:
                break

    def handle_data(self, data: str) -> None:
        text = " ".join(data.split())
        if not text or not self.inside or not self.stack or self._skipping():
            return
        if any(f["tag"] == "svg" for f in self.stack):
            return
        frame = self.stack[-1]
        if frame["entry"] is None:
            frame["entry"] = self._entry(frame["tag"], frame["style"], {})
            self.found.append(frame["entry"])
        entry = frame["entry"]
        entry["label"] = (entry["label"] + " " + text).strip()[:60]
        entry["type"] = self._type()


def _px(value: str | None) -> float | None:
    if value and value.endswith("px"):
        return float(value[:-2])
    return None


def _read(markup: str, page_w: int, page_h: int) -> dict[str, Any]:
    reader = _Reader(_body_rule(markup))
    reader.feed(markup)
    marks = reader.found
    sizes = [(_px(m["declared"].get("width")), m) for m in marks if m["tag"] == "div"]
    side = next((m for w, m in sizes if w is not None and w < page_w / 4 and w > 100), None)
    side_w = _px(side["declared"]["width"]) if side else 0.0
    column = next(
        (m for w, m in sizes if w is not None and 300 <= w < page_w - (side_w or 0)), None
    )
    layout: dict[str, Any] = {}
    if side is not None and side_w is not None:
        side["box"] = {"x": 0, "w": side_w, "y": 0, "h": page_h}
        layout["sidebar"] = {"x": 0, "w": side_w}
    if column is not None:
        col_w = _px(column["declared"]["width"]) or 0.0
        x = (side_w or 0.0) + (page_w - (side_w or 0.0) - col_w) / 2
        column["box"] = {"x": x, "w": col_w}
        layout["column"] = {"x": x, "w": col_w}
        top = _px(column["declared"].get("padding-top"))
        if top is not None:
            layout["column"]["padding_top"] = top
    return {"layout": layout, "landmarks": marks}


def _measure(chrome: str, folder: Path, name: str, width: int, height: int) -> list[Any]:
    page = folder / name
    page.write_text(page.read_text().replace("</body>", MEASURE + "</body>"))
    run = subprocess.run(
        [
            chrome,
            "--headless",
            "--disable-gpu",
            "--no-sandbox",
            f"--window-size={width},{height}",
            "--virtual-time-budget=4000",
            "--dump-dom",
            page.as_uri(),
        ],
        capture_output=True,
        text=True,
        timeout=60,
        check=True,
    )
    got = re.search(r'<pre id="landmarks-out">(.*?)</pre>', run.stdout, re.S)
    if got is None:
        raise SystemExit(f"{name}: no landmarks in the page")
    text = got.group(1).replace("&quot;", '"').replace("&lt;", "<").replace("&gt;", ">")
    found: list[Any] = json.loads(text.replace("&amp;", "&"))
    return found


def main() -> None:
    chrome = os.environ.get("CHROME")
    boards = json.loads(BOARDS.read_text())["boards"]
    screens: dict[str, Any] = {}
    with tempfile.TemporaryDirectory() as tmp:
        folder = Path(tmp) / "screens"
        shutil.copytree(SCREENS, folder)
        for name in sorted(boards):
            board = boards[name]
            read = _read((SCREENS / name).read_text(), board["w"], board["h"])
            if chrome:
                measured = _measure(chrome, folder, name, board["w"], board["h"])
                read["measured"] = measured
            screens[name.removesuffix(".dc.html")] = {
                "file": f"design/canvas/screens/{name}",
                "title": board["title"],
                "page": {"w": board["w"], "h": board["h"]},
                **read,
            }
    doc = {
        "source": "design/canvas/screens, read by tests/design/read_canvas.py",
        "specified_in": [
            "specs/design-1/SPEC.md section 14.1 Landmarks",
            "specs/product-2/resolutions.md points 11 and 15",
        ],
        "measured_in_a_browser": bool(chrome),
        "tolerance_px": 2,
        "overrides": OVERRIDES,
        "screens": screens,
    }
    OUT.write_text(json.dumps(doc, indent=1) + "\n")


if __name__ == "__main__":
    main()
