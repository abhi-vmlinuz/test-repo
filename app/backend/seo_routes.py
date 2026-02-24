import io
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, Response
from PIL import Image, ImageDraw, ImageFont
import os

from server import Database

logger = logging.getLogger(__name__)
seo_router = APIRouter(prefix="/seo", tags=["SEO"])

@seo_router.api_route("/challenge/{challenge_id}", methods=["GET", "HEAD"], response_class=HTMLResponse)
async def seo_challenge(challenge_id: str):
    """Serve static HTML with OG tags for social media bots"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        challenge = await conn.fetchrow("""
            SELECT c.*, cat.name as category_name
            FROM ctf_public_challenges c
            LEFT JOIN categories cat ON c."categoryId" = cat.id
            WHERE c.id = $1
        """, challenge_id)
        
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")
            
        title = challenge['title']
        description = challenge['description']
        # truncate description
        if len(description) > 150:
            description = description[:147] + "..."
            
        points = challenge.get('points', 0)
        difficulty = challenge.get('difficulty', 'medium').capitalize()
        category = challenge.get('category_name') or 'Challenge'

        # This should point to the domain where the app is hosted
        base_url = "https://ctf.zecurx.com"
        og_image_url = f"{base_url}/api/seo/og-image/{challenge_id}"
        challenge_url = f"{base_url}/challenges/{challenge_id}"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{title} | ZecurX CTF</title>
            <meta name="description" content="{description}">
            
            <!-- Open Graph / Facebook -->
            <meta property="og:type" content="website">
            <meta property="og:url" content="{challenge_url}">
            <meta property="og:title" content="{title} - ZecurX CTF">
            <meta property="og:description" content="{description}">
            <meta property="og:image" content="{og_image_url}">
            
            <!-- Twitter -->
            <meta property="twitter:card" content="summary_large_image">
            <meta property="twitter:url" content="{challenge_url}">
            <meta property="twitter:title" content="{title} - ZecurX CTF">
            <meta property="twitter:description" content="{description}">
            <meta property="twitter:image" content="{og_image_url}">
            
            <script>
                // Redirect real users to the actual SPA application immediately
                window.location.href = "{challenge_url}";
            </script>
        </head>
        <body>
            <p>Redirecting to <a href="{challenge_url}">{title}</a>...</p>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)


@seo_router.api_route("/og-image/{challenge_id}", methods=["GET", "HEAD"])
async def generate_og_image(challenge_id: str):
    """Dynamically generate an Open Graph preview image for a challenge using Pillow"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        challenge = await conn.fetchrow("""
            SELECT c.*, cat.name as category_name
            FROM ctf_public_challenges c
            LEFT JOIN categories cat ON c."categoryId" = cat.id
            WHERE c.id = $1
        """, challenge_id)
        
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")
            
        # Get data
        title = challenge.get('title', 'Unknown Challenge')
        category = challenge.get('category_name') or 'Cybersecurity'
        difficulty = (challenge.get('difficulty') or 'medium').upper()
        points = challenge.get('points', 0)
        
        # Create image (1200x630 is standard OG Image size)
        img = Image.new('RGB', (1200, 630), color='#18181b') # zinc-900 background
        d = ImageDraw.Draw(img)
        
        # Determine fonts based on what's available
        title_font = ImageFont.load_default()
        tag_font = ImageFont.load_default()
        brand_font = ImageFont.load_default()
        
        common_fonts = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf"
        ]
        
        for font_path in common_fonts:
            if os.path.exists(font_path):
                title_font = ImageFont.truetype(font_path, 70)
                tag_font = ImageFont.truetype(font_path, 32)
                brand_font = ImageFont.truetype(font_path, 40)
                break
        
        # Brand text
        d.text((80, 80), "ZecurX CTF", fill="#0ea5e9", font=brand_font)
        
        # --- Tags Row ---
        
        # Category tag (zinc-800)
        curr_x = 80
        tag_y_start = 200
        tag_y_end = 260
        
        d.rounded_rectangle([(curr_x, tag_y_start), (curr_x + len(category)*20 + 40, tag_y_end)], radius=15, fill=(39, 39, 42))
        d.text((curr_x + 20, tag_y_start + 10), category, fill=(161, 161, 170), font=tag_font)
        
        curr_x += len(category)*20 + 60
        
        # Difficulty tag
        diff_colors = {
            'EASY': ((209, 250, 229), (6, 95, 70)), # emerald
            'MEDIUM': ((254, 243, 199), (146, 64, 14)), # amber
            'HARD': ((254, 226, 226), (153, 27, 27)) # red
        }
        bg_col, txt_col = diff_colors.get(difficulty, ((244, 244, 245), (39, 39, 42)))
        
        d.rounded_rectangle([(curr_x, tag_y_start), (curr_x + len(difficulty)*20 + 40, tag_y_end)], radius=15, fill=bg_col)
        d.text((curr_x + 20, tag_y_start + 10), difficulty, fill=txt_col, font=tag_font)
        
        curr_x += len(difficulty)*20 + 60
        
        # Points tag
        points_str = f"{points} PTS"
        d.rounded_rectangle([(curr_x, tag_y_start), (curr_x + len(points_str)*20 + 40, tag_y_end)], radius=15, fill=(59, 130, 246)) # blue-500
        d.text((curr_x + 20, tag_y_start + 10), points_str, fill="white", font=tag_font)
        
        # --- Title ---
        y_text = 340
        
        # Very naive word wrap
        words = title.split()
        lines = []
        current_line = []
        for word in words:
            if len(" ".join(current_line + [word])) * 40 > 1000:
                lines.append(" ".join(current_line))
                current_line = [word]
            else:
                current_line.append(word)
        if current_line:
            lines.append(" ".join(current_line))
            
        for line in lines:
            d.text((80, y_text), line, fill="white", font=title_font)
            y_text += 80
            
        # Watermark/Call to action
        d.text((80, 520), "Think you can solve this?", fill="#71717a", font=tag_font)
        
        # Save to bytes
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr = img_byte_arr.getvalue()
        
        return Response(content=img_byte_arr, media_type="image/png")
