import os
from PIL import Image
import numpy as np

os.makedirs('/home/slalglel/wild-hackslash/public/assets/player', exist_ok=True)
os.makedirs('/home/slalglel/wild-hackslash/public/assets/world', exist_ok=True)

def remove_white_bg(img, threshold=240, feather=16):
    rgba = img.convert('RGBA')
    arr = np.array(rgba, dtype=np.float32)
    whiteness = (arr[:, :, 0] + arr[:, :, 1] + arr[:, :, 2]) / 3.0
    alpha = np.clip((threshold - whiteness) / float(feather) * 255.0, 0, 255)
    arr[:, :, 3] = alpha
    return Image.fromarray(arr.astype(np.uint8), mode='RGBA')

# 1. Process Warrior Animation Spritesheet
print('--- Processing Warrior Animation Spritesheet ---')
w_path = '/home/slalglel/.gemini/antigravity-cli/brain/3dd85f14-3e51-4963-a088-fe65925f2ce7/warrior_spritesheet_1794484438243.jpg'
w_img = Image.open(w_path)
w_rgba = remove_white_bg(w_img, threshold=242, feather=18)

# Row 0: 4 Run Frames
run_cols = [(132, 307), (445, 620), (776, 952), (1095, 1270)]
row0_y = (66, 331)
for idx, (x1, x2) in enumerate(run_cols):
    cropped = w_rgba.crop((x1, row0_y[0], x2, row0_y[1]))
    bbox = cropped.split()[3].getbbox()
    if bbox:
        tight = cropped.crop(bbox)
        # Uniform height 74px
        th = 74
        tw = int(tight.width * (th / float(tight.height)))
        resized = tight.resize((tw, th), Image.Resampling.LANCZOS)
        out_path = f'/home/slalglel/wild-hackslash/public/assets/player/run_{idx}.png'
        resized.save(out_path)
        print(f'Saved {out_path} ({tw}x{th})')

# Row 1: 3 Slash Frames
slash_cols = [(109, 333), (483, 896), (1032, 1294)]
row1_y = (433, 702)
for idx, (x1, x2) in enumerate(slash_cols):
    cropped = w_rgba.crop((x1, row1_y[0], x2, row1_y[1]))
    bbox = cropped.split()[3].getbbox()
    if bbox:
        tight = cropped.crop(bbox)
        th = 78
        tw = int(tight.width * (th / float(tight.height)))
        resized = tight.resize((tw, th), Image.Resampling.LANCZOS)
        out_path = f'/home/slalglel/wild-hackslash/public/assets/player/slash_{idx}.png'
        resized.save(out_path)
        print(f'Saved {out_path} ({tw}x{th})')

# 2. Process Grassland Biome Props
print('\n--- Processing Grassland Biome Props ---')
p_path = '/home/slalglel/.gemini/antigravity-cli/brain/3dd85f14-3e51-4963-a088-fe65925f2ce7/grassland_biome_props_sheet_1794484460495.jpg'
p_img = Image.open(p_path)
p_rgba = remove_white_bg(p_img, threshold=240, feather=16)

# Prop 0: Oak Tree (52, 37, 566, 457)
tree_crop = p_rgba.crop((52, 37, 566, 457))
tree_bbox = tree_crop.split()[3].getbbox()
if tree_bbox:
    tree_tight = tree_crop.crop(tree_bbox)
    tree_resized = tree_tight.resize((84, 96), Image.Resampling.LANCZOS)
    tree_resized.save('/home/slalglel/wild-hackslash/public/assets/world/prop_tree.png')
    print('Saved prop_tree.png (84x96)')

# Prop 1: Ruins Altar (302, 390, 692, 735)
altar_crop = p_rgba.crop((302, 390, 692, 735))
altar_bbox = altar_crop.split()[3].getbbox()
if altar_bbox:
    altar_tight = altar_crop.crop(altar_bbox)
    altar_resized = altar_tight.resize((76, 76), Image.Resampling.LANCZOS)
    altar_resized.save('/home/slalglel/wild-hackslash/public/assets/world/prop_altar.png')
    print('Saved prop_altar.png (76x76)')

# Prop 3: Treasure Chest (813, 453, 1063, 697)
chest_crop = p_rgba.crop((813, 453, 1063, 697))
chest_bbox = chest_crop.split()[3].getbbox()
if chest_bbox:
    chest_tight = chest_crop.crop(chest_bbox)
    chest_resized = chest_tight.resize((36, 36), Image.Resampling.LANCZOS)
    chest_resized.save('/home/slalglel/wild-hackslash/public/assets/world/prop_chest.png')
    print('Saved prop_chest.png (36x36)')

# Prop 4: Mossy Boulder (1004, 91, 1309, 376)
rock_crop = p_rgba.crop((1004, 91, 1309, 376))
rock_bbox = rock_crop.split()[3].getbbox()
if rock_bbox:
    rock_tight = rock_crop.crop(rock_bbox)
    rock_resized = rock_tight.resize((48, 42), Image.Resampling.LANCZOS)
    rock_resized.save('/home/slalglel/wild-hackslash/public/assets/world/prop_rock.png')
    print('Saved prop_rock.png (48x42)')

# 3. Process Isometric Grass Tile
print('\n--- Processing Isometric Grass Tile ---')
t_path = '/home/slalglel/.gemini/antigravity-cli/brain/3dd85f14-3e51-4963-a088-fe65925f2ce7/isometric_grass_tile_1794484490051.jpg'
t_img = Image.open(t_path)
t_rgba = remove_white_bg(t_img, threshold=242, feather=16)
t_bbox = t_rgba.split()[3].getbbox()
if t_bbox:
    t_tight = t_rgba.crop(t_bbox)
    # Standard tile size: 64 x 36 px (2:1 isometric diamond)
    t_resized = t_tight.resize((64, 36), Image.Resampling.LANCZOS)
    t_resized.save('/home/slalglel/wild-hackslash/public/assets/world/tile_grass.png')
    print('Saved tile_grass.png (64x36)')

print('\nAll V2 Assets Successfully Extracted & Saved!')
