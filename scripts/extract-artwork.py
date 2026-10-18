"""Deterministically crop the user's WhatsApp sheet; no AI-generated replacement art.
Usage: python3 scripts/extract-artwork.py /path/to/second-annotated-sheet.jpeg
The expected sheet is 1448 x 1086. Source images are kept unchanged.
"""
from pathlib import Path
import sys
import numpy as np
from scipy import ndimage
from PIL import Image

source = Image.open(sys.argv[1]).convert('RGB')
if source.size != (1448, 1086):
    raise ValueError('Expected the second 1448 x 1086 artwork sheet.')
assets = {
    'logo/rss-talk-show': (35, 168, 715, 477),
    'illustrations/microphone': (780, 55, 1404, 511),
    'illustrations/conversation': (50, 567, 386, 832),
    'illustrations/question': (442, 574, 741, 825),
    'illustrations/ticket': (790, 600, 1075, 838),
    'icons/calendar': (1170, 599, 1390, 819),
    'icons/clock': (105, 875, 340, 1072),
    'icons/location': (425, 880, 635, 1067),
    'illustrations/wave': (1070, 881, 1422, 1047),
}
root = Path(__file__).resolve().parent.parent / 'public/assets'
for name, box in assets.items():
    rgb = np.array(source.crop(box))
    values = rgb.astype(float)
    chroma = values.max(axis=2) - values.min(axis=2)
    # Neutral off-white JPEG background becomes transparent; blue/navy/teal remain unchanged.
    alpha = np.where(values.min(axis=2) > 220, np.clip((chroma - 5) / 8, 0, 1), 1)
    # Exclude green annotations and their antialiased fringe, where present at crop edges.
    green = (values[:,:,1] > values[:,:,0] + 15) & (values[:,:,1] > values[:,:,2] + 10)
    alpha[green] = 0
    # Remove disconnected JPEG ringing from the green pen and neutral background.
    # Saturated artwork details and larger pale-blue shapes are retained.
    labels, count = ndimage.label(alpha > 0.04)
    sizes = np.bincount(labels.ravel())
    for label_id in range(1, count + 1):
        if sizes[label_id] < 100:
            component = labels == label_id
            if values[component].mean(axis=0).min() > 225:
                alpha[component] = 0
    rgba = np.dstack((rgb, (alpha * 255).astype('uint8'))).astype('uint8')
    output = Image.fromarray(rgba)
    bounds = output.getbbox()
    output = output.crop(bounds)
    path = root / f'{name}.webp'
    path.parent.mkdir(parents=True, exist_ok=True)
    output.save(path, lossless=True, method=6)
    print(f'{path.relative_to(root.parent.parent)}: {output.size}')
