"""Build the Common Earth row lookup from its lossless Natural Earth ID image."""
import gzip
import struct
from pathlib import Path

from PIL import Image

directory = Path(__file__).resolve().parents[1] / "common-earth"
with Image.open(directory / "earth-index.png") as source:
    image = source.convert("RGB")
width, height = image.size
rows = [0]
runs = bytearray()
pixels = image.load()
for y in range(height):
    previous = None
    for x in range(width):
        red, green, _ = pixels[x, y]
        cell = red + (green << 8)
        if previous is not None and cell != previous:
            runs.extend(struct.pack("<HH", x, previous))
        previous = cell
    runs.extend(struct.pack("<HH", width, previous))
    rows.append(len(runs) // 4)
header = struct.pack("<4sHH", b"CEG1", width, height)
payload = header + struct.pack(f"<{len(rows)}I", *rows) + runs
(directory / "earth-cells-v1.bin").write_bytes(gzip.compress(payload, mtime=0))
