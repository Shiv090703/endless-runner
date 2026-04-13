from PIL import Image, ImageDraw

WIDTH, HEIGHT = 64, 64
FRAMES = 6 

# 0-3: Run, 4: Jump, 5: Slide
img = Image.new('RGBA', (WIDTH * FRAMES, HEIGHT), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Colors
body_color = (0, 255, 255, 255) # Cyan
glow_color = (0, 150, 255, 100)

def draw_head(draw, x, y):
    cx = x + 32
    # Draw head
    draw.ellipse((cx - 8, y, cx + 8, y + 16), fill=body_color)

def draw_torso(draw, x, y):
    cx = x + 32
    draw.line((cx, y, cx, y + 20), fill=body_color, width=8)
    
def draw_limb(draw, sx, sy, ex, ey):
    draw.line((sx, sy, ex, ey), fill=body_color, width=4)

for i in range(FRAMES):
    x_offset = i * WIDTH
    cx = x_offset + 32
    head_y = 10
    
    if i in [0, 1, 2, 3]: # Running
        bounce = 2 if i % 2 == 0 else 0
        head_y += bounce
        
        draw_head(draw, x_offset, head_y)
        draw_torso(draw, x_offset, head_y + 16)
        
        # Legs running away from screen (perspective depth change represented by spread)
        torso_end_y = head_y + 36
        
        if i == 0:
            # Left leg forward, Right leg back
            draw_limb(draw, cx, torso_end_y, cx - 12, torso_end_y + 16) # Left
            draw_limb(draw, cx, torso_end_y, cx + 5, torso_end_y + 10) # Right
            # Arms
            draw_limb(draw, cx-4, head_y+20, cx - 15, head_y+30)
            draw_limb(draw, cx+4, head_y+20, cx + 15, head_y+15)
        elif i == 1:
            draw_limb(draw, cx, torso_end_y, cx - 6, torso_end_y + 16) 
            draw_limb(draw, cx, torso_end_y, cx + 6, torso_end_y + 16)
            draw_limb(draw, cx-4, head_y+20, cx - 18, head_y+22)
            draw_limb(draw, cx+4, head_y+20, cx + 18, head_y+22)
        elif i == 2:
            # Right leg forward
            draw_limb(draw, cx, torso_end_y, cx - 5, torso_end_y + 10) 
            draw_limb(draw, cx, torso_end_y, cx + 12, torso_end_y + 16) 
            draw_limb(draw, cx-4, head_y+20, cx - 15, head_y+15)
            draw_limb(draw, cx+4, head_y+20, cx + 15, head_y+30)
        elif i == 3:
            draw_limb(draw, cx, torso_end_y, cx - 6, torso_end_y + 16) 
            draw_limb(draw, cx, torso_end_y, cx + 6, torso_end_y + 16)
            draw_limb(draw, cx-4, head_y+20, cx - 18, head_y+22)
            draw_limb(draw, cx+4, head_y+20, cx + 18, head_y+22)
            
    elif i == 4: # Jump (tucked)
        draw_head(draw, x_offset, 0)
        draw_torso(draw, x_offset, 16)
        torso_end_y = 36
        # Legs tucked in
        draw_limb(draw, cx, torso_end_y, cx - 8, torso_end_y + 8) 
        draw_limb(draw, cx, torso_end_y, cx + 8, torso_end_y + 8) 
        # Arms raised
        draw_limb(draw, cx-4, 20, cx - 16, 5)
        draw_limb(draw, cx+4, 20, cx + 16, 5)

    elif i == 5: # Slide (crouched)
        draw_head(draw, x_offset, 35) # Very low
        draw_torso(draw, x_offset, 51)
        # Legs spread flat
        draw_limb(draw, cx, 60, cx - 20, 60) 
        draw_limb(draw, cx, 60, cx + 20, 60)
        # Arms bracing
        draw_limb(draw, cx-4, 55, cx - 20, 50)
        draw_limb(draw, cx+4, 55, cx + 20, 50)

img.save('public/assets/runner.png')
print("runner.png saved")
