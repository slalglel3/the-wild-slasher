import os
from PIL import Image
import numpy as np

os.makedirs('/home/slalglel/wild-hackslash/public/assets/monsters', exist_ok=True)
os.makedirs('/home/slalglel/wild-hackslash/public/assets/items', exist_ok=True)
os.makedirs('/home/slalglel/wild-hackslash/public/assets/world', exist_ok=True)

def remove_white_bg(img, threshold=242, feather=16):
    rgba = img.convert('RGBA')
    arr = np.array(rgba, dtype=np.float32)
    whiteness = (arr[:, :, 0] + arr[:, :, 1] + arr[:, :, 2]) / 3.0
    alpha = np.clip((threshold - whiteness) / float(feather) * 255.0, 0, 255)
    arr[:, :, 3] = alpha
    return Image.fromarray(arr.astype(np.uint8), mode='RGBA')

# 1. Process Monsters
print('--- Processing Monsters ---')
m_path = '/home/slalglel/.gemini/antigravity-cli/brain/3dd85f14-3e51-4963-a088-fe65925f2ce7/wild_darkness_monsters_1794565952398.jpg'
m_img = Image.open(m_path)
m_rgba = remove_white_bg(m_img, threshold=242, feather=16)

m_coords = [
    ('monster_wolf', (30, 280, 365, 547), 54),
    ('monster_goblin', (369, 264, 563, 546), 56),
    ('monster_scorpion', (566, 231, 855, 546), 56),
    ('monster_imp', (870, 225, 1050, 548), 52),
    ('monster_boss', (1068, 154, 1352, 581), 90), # Large Boss size!
]

for name, box, target_h in m_coords:
    crop = m_rgba.crop(box)
    bbox = crop.split()[3].getbbox()
    if bbox:
        tight = crop.crop(bbox)
        tw = int(tight.width * (target_h / float(tight.height)))
        resized = tight.resize((tw, target_h), Image.Resampling.LANCZOS)
        out_p = f'/home/slalglel/wild-hackslash/public/assets/monsters/{name}.png'
        resized.save(out_p)
        print(f'Saved {out_p} ({tw}x{target_h})')

# 2. Process Equipment Item Icons
print('\n--- Processing Equipment Item Icons ---')
i_path = '/home/slalglel/.gemini/antigravity-cli/brain/3dd85f14-3e51-4963-a088-fe65925f2ce7/wild_darkness_equipment_icons_1794565973584.jpg'
i_img = Image.open(i_path)
i_rgba = remove_white_bg(i_img, threshold=244, feather=14)

icon_names = [
    'item_weapon', 'item_armor', 'item_helmet',
    'item_boots', 'item_amulet', 'item_ring'
]
icon_boxes = [
    (50, 57, 371, 387),
    (471, 57, 793, 387),
    (893, 57, 1214, 387),
    (50, 461, 371, 791),
    (471, 461, 793, 791),
    (893, 461, 1214, 791)
]

for idx, name in enumerate(icon_names):
    crop = i_rgba.crop(icon_boxes[idx])
    bbox = crop.split()[3].getbbox()
    if bbox:
        tight = crop.crop(bbox)
        resized = tight.resize((48, 48), Image.Resampling.LANCZOS)
        out_p = f'/home/slalglel/wild-hackslash/public/assets/items/{name}.png'
        resized.save(out_p)
        print(f'Saved {out_p} (48x48)')

# 3. Process World Gateway Arch (Highway to Next World)
print('\n--- Processing World Gateway Arch ---')
g_path = '/home/slalglel/.gemini/antigravity-cli/brain/3dd85f14-3e51-4963-a088-fe65925f2ce7/wild_darkness_world_gateway_1794566006229.jpg'
g_img = Image.open(g_path)
g_rgba = remove_white_bg(g_img, threshold=244, feather=16)
g_bbox = g_rgba.split()[3].getbbox()
if g_bbox:
    g_tight = g_rgba.crop(g_bbox)
    # Target size: 96 x 106 px for majestic gateway arch
    g_resized = g_tight.resize((96, 106), Image.Resampling.LANCZOS)
    out_p = '/home/slalglel/wild-hackslash/public/assets/world/prop_gateway.png'
    g_resized.save(out_p)
    print(f'Saved {out_p} (96x106)')

print('\nAll v3 Assets Extracted Successfully!')
