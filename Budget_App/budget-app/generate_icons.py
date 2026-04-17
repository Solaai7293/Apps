#!/usr/bin/env python3
"""
Generate PWA icons for RupeeTrack
Run: python3 generate_icons.py
Requires: pip install Pillow
"""
import os
try:
    from PIL import Image, ImageDraw, ImageFont
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

def create_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Background with rounded corners
    radius = size // 5
    bg_color = (108, 99, 255, 255)  # accent purple
    draw.rounded_rectangle([0, 0, size-1, size-1], radius=radius, fill=bg_color)
    
    # Rupee symbol
    text = "₹"
    font_size = int(size * 0.55)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (size - tw) // 2
    y = (size - th) // 2 - bbox[1]
    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    
    return img

def main():
    os.makedirs('icons', exist_ok=True)
    if not PIL_AVAILABLE:
        print("Pillow not installed. Creating SVG fallback icons instead.")
        create_svg_icons()
        return
    
    for size in SIZES:
        img = create_icon(size)
        path = f'icons/icon-{size}.png'
        img.save(path, 'PNG')
        print(f'Created {path}')
    print("All icons generated!")

def create_svg_icons():
    """Create SVG-based PNG icons using pure Python (no Pillow)"""
    os.makedirs('icons', exist_ok=True)
    svg_template = '''<svg xmlns="http://www.w3.org/2000/svg" width="{s}" height="{s}" viewBox="0 0 {s} {s}">
  <rect width="{s}" height="{s}" rx="{r}" fill="#6c63ff"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" 
        font-family="Arial,sans-serif" font-weight="bold" font-size="{fs}" fill="white">₹</text>
</svg>'''
    
    # We'll create a simple Python-only PNG using raw bytes
    import struct, zlib
    
    def create_png(size):
        """Create a simple purple square PNG with ₹ text approximation"""
        # Simple colored PNG
        width = height = size
        
        def png_chunk(chunk_type, data):
            c = chunk_type + data
            return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        
        # IHDR
        ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
        
        # Image data - purple background
        r, g, b = 108, 99, 255
        raw_rows = []
        for y in range(height):
            row = bytearray()
            row.append(0)  # filter type
            for x in range(width):
                # Rounded corners
                cx, cy = x - width//2, y - height//2
                corner_r = width // 5
                in_corner = (abs(cx) > width//2 - corner_r and abs(cy) > height//2 - corner_r)
                dist = ((abs(cx) - (width//2 - corner_r))**2 + (abs(cy) - (height//2 - corner_r))**2)**0.5
                if in_corner and dist > corner_r:
                    row.extend([0, 0, 0])
                else:
                    row.extend([r, g, b])
            raw_rows.append(bytes(row))
        
        compressed = zlib.compress(b''.join(raw_rows))
        
        png_data = b'\x89PNG\r\n\x1a\n'
        png_data += png_chunk(b'IHDR', ihdr_data)
        png_data += png_chunk(b'IDAT', compressed)
        png_data += png_chunk(b'IEND', b'')
        
        return png_data
    
    for size in SIZES:
        png = create_png(size)
        path = f'icons/icon-{size}.png'
        with open(path, 'wb') as f:
            f.write(png)
        print(f'Created {path} ({size}x{size})')
    
    print("\nAll icons generated using fallback method!")
    print("For better quality icons with the ₹ symbol, install Pillow: pip install Pillow")
    print("Then run this script again.")

if __name__ == '__main__':
    main()
