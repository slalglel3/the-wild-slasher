import os
from PIL import Image, ImageFilter
import numpy as np

os.makedirs('/home/slalglel/wild-hackslash/public/assets/player', exist_ok=True)
os.makedirs('/home/slalglel/wild-hackslash/public/assets/ui', exist_ok=True)
os.makedirs('/home/slalglel/wild-hackslash/public/assets/skills', exist_ok=True)

def remove_white_bg(img, threshold=240, feather=15):
    # Convert to RGBA
    rgba = img.convert('RGBA')
    arr = np.array(rgba, dtype=np.float32)
    
    # Calculate whiteness
    whiteness = (arr[:, :, 0] + arr[:, :, 1] + arr[:, :, 2]) / 3.0
    
    # Alpha calculation
    # If whiteness > threshold -> alpha = 0
    # If whiteness < threshold - feather -> alpha = 255
    # In between: linear ramp
    alpha = np.clip((threshold - whiteness) / float(feather) * 255.0, 0, 255)
    
    arr[:, :, 3] = alpha
    return Image.fromarray(arr.astype(np.uint8), mode='RGBA')

# 1. Process Warrior Sprite
print('Processing Warrior Sprite...')
warrior_path = '/home/slalglel/.gemini/antigravity-cli/brain/3dd85f14-3e51-4963-a088-fe65925f2ce7/warrior_sprite_1794482247605.jpg'
w_img = Image.open(warrior_path)
w_rgba = remove_white_bg(w_img, threshold=242, feather=18)

# Crop to content
bbox = w_rgba.split()[3].getbbox()
if bbox:
    w_cropped = w_rgba.crop(bbox)
    # Resize to standard height 96px with aspect ratio preserved
    target_h = 96
    target_w = int(w_cropped.width * (target_h / float(w_cropped.height)))
    w_final = w_cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    w_final.save('/home/slalglel/wild-hackslash/public/assets/player/warrior_idle.png')
    print(f'Saved warrior_idle.png ({target_w}x{target_h})')

# 2. Process Skill Icons
print('\nProcessing Skill Icons...')
skills_path = '/home/slalglel/.gemini/antigravity-cli/brain/3dd85f14-3e51-4963-a088-fe65925f2ce7/action_skill_icons_1794482319149.jpg'
s_img = Image.open(skills_path)
s_rgba = remove_white_bg(s_img, threshold=240, feather=15)

skill_names = ['slash', 'whirlwind', 'dash', 'slam', 'warcry']
skill_regions = [(43, 293), (303, 553), (563, 813), (823, 1073), (1083, 1333)]

for idx, (x1, x2) in enumerate(skill_regions):
    cropped = s_rgba.crop((x1, 0, x2, s_rgba.height))
    bbox = cropped.split()[3].getbbox()
    if bbox:
        icon_tight = cropped.crop(bbox)
        # Make square
        max_dim = max(icon_tight.width, icon_tight.height)
        sq = Image.new('RGBA', (max_dim, max_dim), (0, 0, 0, 0))
        ox = (max_dim - icon_tight.width) // 2
        oy = (max_dim - icon_tight.height) // 2
        sq.paste(icon_tight, (ox, oy))
        sq_resized = sq.resize((80, 80), Image.Resampling.LANCZOS)
        sq_resized.save(f'/home/slalglel/wild-hackslash/public/assets/skills/skill_{skill_names[idx]}.png')
        print(f'Saved skill_{skill_names[idx]}.png (80x80)')

# 3. Process Joystick UI
print('\nProcessing Joystick UI...')
joy_path = '/home/slalglel/.gemini/antigravity-cli/brain/3dd85f14-3e51-4963-a088-fe65925f2ce7/mobile_joystick_ui_1794482339292.jpg'
j_img = Image.open(joy_path)
j_rgba = remove_white_bg(j_img, threshold=240, feather=15)

# Base Ring (left)
base_crop = j_rgba.crop((56, 0, 692, j_rgba.height))
b_bbox = base_crop.split()[3].getbbox()
if b_bbox:
    base_tight = base_crop.crop(b_bbox)
    max_dim = max(base_tight.width, base_tight.height)
    sq_b = Image.new('RGBA', (max_dim, max_dim), (0, 0, 0, 0))
    sq_b.paste(base_tight, ((max_dim - base_tight.width) // 2, (max_dim - base_tight.height) // 2))
    base_final = sq_b.resize((140, 140), Image.Resampling.LANCZOS)
    base_final.save('/home/slalglel/wild-hackslash/public/assets/ui/joystick_base.png')
    print('Saved joystick_base.png (140x140)')

# Knob (right)
knob_crop = j_rgba.crop((844, 0, 1237, j_rgba.height))
k_bbox = knob_crop.split()[3].getbbox()
if k_bbox:
    knob_tight = knob_crop.crop(k_bbox)
    max_dim = max(knob_tight.width, knob_tight.height)
    sq_k = Image.new('RGBA', (max_dim, max_dim), (0, 0, 0, 0))
    sq_k.paste(knob_tight, ((max_dim - knob_tight.width) // 2, (max_dim - knob_tight.height) // 2))
    knob_final = sq_k.resize((60, 60), Image.Resampling.LANCZOS)
    knob_final.save('/home/slalglel/wild-hackslash/public/assets/ui/joystick_knob.png')
    print('Saved joystick_knob.png (60x60)')

print('\nAsset Processing Completed!')
