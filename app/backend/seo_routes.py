"""
SEO Routes — Dynamic OG Image Generation for CTF Challenges

Architecture:
  1. Check disk cache for pre-generated composite image
  2. Cache HIT → serve immediately
  3. Cache MISS → serve composite with category fallback illustration
     + trigger background task to fetch AI-generated illustration from Pollinations.ai
  4. Next request serves the AI-generated cached image

Layout (1200×630, matching rich social card style):
  ┌────────────────────────────────────────────────────┐
  │  [Title]                                           │
  │  👤 [author]                                       │
  │ ┌────────────┐                                     │
  │ │ Illustration│  [Description]                     │
  │ │ (AI/fallback│                                    │
  │ │  ~400×400) │  [Category] • [Year]               │
  │ └────────────┘                       🔒 ZecurX     │
  │  ctf.zecurx.com          Let's solve this CTF!     │
  └────────────────────────────────────────────────────┘
"""

import asyncio
import io
import hashlib
import logging
import os
import textwrap
from pathlib import Path
from urllib.parse import quote

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, Response
from PIL import Image, ImageDraw, ImageFont

from server import Database

logger = logging.getLogger(__name__)
seo_router = APIRouter(prefix="/seo", tags=["SEO"])

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE_URL = "https://ctf.zecurx.com"
OG_CACHE_DIR = Path("/app/og-cache")
CATEGORY_CACHE_DIR = OG_CACHE_DIR / "categories"
LOGO_PATH = Path("/app/logo.png")  # Copied in Dockerfile or mounted

# Standard OG image dimensions
OG_WIDTH = 1200
OG_HEIGHT = 630
ILLUSTRATION_SIZE = (380, 380)

# Pollinations.ai — free, no API key required
POLLINATIONS_BASE = "https://image.pollinations.ai/prompt"

# Ensure cache dirs exist
OG_CACHE_DIR.mkdir(parents=True, exist_ok=True)
CATEGORY_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Category → prompt mapping for fallback illustrations
CATEGORY_PROMPTS = {
    "web exploitation": "cybersecurity web hacking illustration, browser with code injection, HTTP requests, broken padlocks, dark green teal aesthetic, digital art, moody dark background, no text",
    "cryptography": "cryptography illustration, encryption keys, cipher wheels, mathematical symbols, locked vault with digital patterns, golden dark blue aesthetic, digital art, moody dark background, no text",
    "forensics": "digital forensics illustration, magnifying glass over binary data, hard drive analysis, fingerprint on circuit board, blue cyan aesthetic, digital art, moody dark background, no text",
    "binary exploitation": "binary exploitation illustration, assembly code, buffer overflow memory stack, CPU chip exposed circuits, red dark aesthetic, digital art, moody dark background, no text",
    "general skills": "computer skills illustration, Linux terminal, command line interface, networking cables, green matrix aesthetic, digital art, moody dark background, no text",
    "reverse engineering": "reverse engineering illustration, disassembly debugger, binary analysis, gear mechanism with code, orange dark aesthetic, digital art, moody dark background, no text",
    "osint": "OSINT open source intelligence illustration, world map with data connections, social media icons, magnifying glass, blue purple aesthetic, digital art, moody dark background, no text",
    "network security": "network security illustration, firewall, packet inspection, network topology, shield with data streams, teal blue aesthetic, digital art, moody dark background, no text",
    "miscellaneous": "cybersecurity miscellaneous illustration, mixed hacking tools, terminal windows, lock and key, dark aesthetic, digital art, moody dark background, no text",
    "pwn": "binary pwn exploitation illustration, stack smashing, shellcode injection, memory corruption, red black aesthetic, digital art, moody dark background, no text",
    "steganography": "steganography illustration, hidden message in image, pixel manipulation, invisible ink digital, teal dark aesthetic, digital art, moody dark background, no text",
}

# Fallback for unknown categories
DEFAULT_PROMPT = "cybersecurity hacking illustration, terminal with code, digital padlock, dark moody aesthetic, digital art, no text"


# ---------------------------------------------------------------------------
# Font helpers
# ---------------------------------------------------------------------------
def _load_fonts():
    """Load best available fonts. Returns (title, body, tag, brand) tuple."""
    bold_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf",
    ]
    regular_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/ubuntu/Ubuntu-R.ttf",
    ]

    bold_font_path = None
    regular_font_path = None

    for p in bold_paths:
        if os.path.exists(p):
            bold_font_path = p
            break

    for p in regular_paths:
        if os.path.exists(p):
            regular_font_path = p
            break

    if bold_font_path:
        title_font = ImageFont.truetype(bold_font_path, 42)
        tag_font = ImageFont.truetype(bold_font_path, 24)
        brand_font = ImageFont.truetype(bold_font_path, 28)
    else:
        title_font = ImageFont.load_default()
        tag_font = ImageFont.load_default()
        brand_font = ImageFont.load_default()

    if regular_font_path:
        body_font = ImageFont.truetype(regular_font_path, 22)
        small_font = ImageFont.truetype(regular_font_path, 18)
    else:
        body_font = ImageFont.load_default()
        small_font = ImageFont.load_default()

    return title_font, body_font, tag_font, brand_font, small_font


# ---------------------------------------------------------------------------
# Illustration fetching (Pollinations.ai)
# ---------------------------------------------------------------------------
async def _fetch_illustration_from_pollinations(prompt: str, width: int = 500, height: int = 500) -> bytes | None:
    """Fetch an AI-generated illustration from Pollinations.ai. Returns PNG bytes or None."""
    encoded = quote(prompt)
    url = f"{POLLINATIONS_BASE}/{encoded}?width={width}&height={height}&nologo=true&seed={hashlib.md5(prompt.encode()).hexdigest()[:8]}"

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code == 200 and len(resp.content) > 1000:
                return resp.content
            logger.warning("Pollinations returned status=%s, size=%d", resp.status_code, len(resp.content))
    except Exception as e:
        logger.error("Pollinations fetch failed: %s", e)

    return None


async def _get_or_generate_category_fallback(category_name: str) -> Image.Image | None:
    """Get category fallback illustration from cache, or generate via Pollinations."""
    safe_name = category_name.lower().replace(" ", "_").replace("/", "_")
    cache_path = CATEGORY_CACHE_DIR / f"{safe_name}.png"

    # Check cache
    if cache_path.exists():
        try:
            return Image.open(cache_path).convert("RGBA")
        except Exception:
            cache_path.unlink(missing_ok=True)

    # Generate via Pollinations
    prompt = CATEGORY_PROMPTS.get(category_name.lower(), DEFAULT_PROMPT)
    img_bytes = await _fetch_illustration_from_pollinations(prompt)

    if img_bytes:
        try:
            img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
            img.save(str(cache_path), "PNG")
            logger.info("Cached category fallback: %s", cache_path)
            return img
        except Exception as e:
            logger.error("Failed to process category image: %s", e)

    return None


async def _get_challenge_illustration(challenge_id: str, title: str, category: str, description: str) -> Image.Image | None:
    """Get challenge-specific AI illustration. Checks cache first, generates if needed."""
    cache_path = OG_CACHE_DIR / f"illustration_{challenge_id}.png"

    # Cached illustration exists
    if cache_path.exists():
        try:
            return Image.open(cache_path).convert("RGBA")
        except Exception:
            cache_path.unlink(missing_ok=True)

    # Build a challenge-specific prompt
    prompt = (
        f"cybersecurity CTF challenge illustration about {title}, "
        f"related to {category}, "
        f"dark moody digital art, retro-futuristic hacker aesthetic, "
        f"detailed illustration, no text, square format, dark background"
    )
    img_bytes = await _fetch_illustration_from_pollinations(prompt)

    if img_bytes:
        try:
            img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
            img.save(str(cache_path), "PNG")
            logger.info("Cached challenge illustration: %s", challenge_id)
            return img
        except Exception as e:
            logger.error("Failed to process challenge image: %s", e)

    return None


# ---------------------------------------------------------------------------
# Composite OG image builder
# ---------------------------------------------------------------------------
def _build_composite(
    illustration: Image.Image | None,
    title: str,
    description: str,
    category: str,
    difficulty: str,
    points: int,
    author: str | None = None,
) -> bytes:
    """Build the final 1200×630 OG composite image matching the rich card layout."""

    title_font, body_font, tag_font, brand_font, small_font = _load_fonts()

    # Create base canvas with dark green gradient background (matching ZecurX brand)
    img = Image.new("RGB", (OG_WIDTH, OG_HEIGHT), color="#0d1b17")
    d = ImageDraw.Draw(img)

    # Subtle vertical gradient overlay (slightly lighter at bottom)
    for y in range(OG_HEIGHT):
        r = int(13 + (y / OG_HEIGHT) * 8)
        g = int(27 + (y / OG_HEIGHT) * 12)
        b = int(23 + (y / OG_HEIGHT) * 10)
        d.line([(0, y), (OG_WIDTH, y)], fill=(r, g, b))

    # Subtle border
    d.rounded_rectangle(
        [(8, 8), (OG_WIDTH - 8, OG_HEIGHT - 8)],
        radius=16,
        outline="#1a3a2f",
        width=2,
    )

    # --- Title bar area (top) ---
    title_y = 28
    wrapped_title = textwrap.fill(title, width=38)
    title_lines = wrapped_title.split("\n")[:2]  # Max 2 lines
    for line in title_lines:
        d.text((40, title_y), line, fill="white", font=title_font)
        title_y += 48

    # --- Author line ---
    author_text = author or "ZecurX CTF"
    d.text((40, title_y + 4), f"👤  {author_text}", fill="#8b9da5", font=small_font)

    # --- Illustration (left side, below title) ---
    illustration_x = 40
    illustration_y = title_y + 44
    illustration_w = 340
    illustration_h = 340

    # Clamp illustration area to fit within card
    max_h = OG_HEIGHT - illustration_y - 80
    if illustration_h > max_h:
        illustration_h = max_h
        illustration_w = max_h  # Keep square

    if illustration:
        ill_resized = illustration.resize((illustration_w, illustration_h), Image.LANCZOS)

        # Round corners on illustration
        mask = Image.new("L", (illustration_w, illustration_h), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.rounded_rectangle(
            [(0, 0), (illustration_w - 1, illustration_h - 1)],
            radius=12,
            fill=255,
        )

        # Create a temp image for pasting with transparency
        temp = Image.new("RGB", (illustration_w, illustration_h), "#0d1b17")
        temp.paste(ill_resized.convert("RGB"), (0, 0))

        img.paste(temp, (illustration_x, illustration_y), mask)
    else:
        # Placeholder rectangle if no illustration
        d.rounded_rectangle(
            [(illustration_x, illustration_y),
             (illustration_x + illustration_w, illustration_y + illustration_h)],
            radius=12,
            fill="#162b23",
            outline="#1a3a2f",
        )
        d.text(
            (illustration_x + illustration_w // 2 - 40, illustration_y + illustration_h // 2 - 10),
            "🔒 CTF",
            fill="#3a6b56",
            font=brand_font,
        )

    # --- Right side: Description + metadata ---
    right_x = illustration_x + illustration_w + 36
    right_y = illustration_y + 8
    right_max_w = OG_WIDTH - right_x - 40

    # Description text (wrapped)
    desc_truncated = description[:200] + ("..." if len(description) > 200 else "")
    char_width = 32  # approximate chars per line in right column
    wrapped_desc = textwrap.fill(desc_truncated, width=char_width)
    desc_lines = wrapped_desc.split("\n")[:6]  # Max 6 lines

    for line in desc_lines:
        d.text((right_x, right_y), line, fill="#c8d6d0", font=body_font)
        right_y += 28

    # --- Category + Year ---
    right_y += 16
    year_text = "2026"
    meta_text = f"{category}  •  {year_text}"
    d.text((right_x, right_y), meta_text, fill="#6b8a7d", font=tag_font)

    # --- Difficulty + Points tags ---
    right_y += 40
    diff_colors = {
        "EASY": ("#d1fae5", "#065f46"),
        "MEDIUM": ("#fef3c7", "#92400e"),
        "HARD": ("#fee2e2", "#991b1b"),
    }
    bg_hex, txt_hex = diff_colors.get(difficulty.upper(), ("#f4f4f5", "#27272a"))

    # Difficulty tag
    diff_text = difficulty.upper()
    diff_w = len(diff_text) * 15 + 24
    d.rounded_rectangle(
        [(right_x, right_y), (right_x + diff_w, right_y + 32)],
        radius=8,
        fill=bg_hex,
    )
    d.text((right_x + 12, right_y + 4), diff_text, fill=txt_hex, font=tag_font)

    # Points tag
    pts_x = right_x + diff_w + 12
    pts_text = f"{points} PTS"
    pts_w = len(pts_text) * 15 + 24
    d.rounded_rectangle(
        [(pts_x, right_y), (pts_x + pts_w, right_y + 32)],
        radius=8,
        fill="#2563eb",
    )
    d.text((pts_x + 12, right_y + 4), pts_text, fill="white", font=tag_font)

    # --- Bottom bar ---
    bottom_y = OG_HEIGHT - 60

    # Domain
    d.text((40, bottom_y), "ctf.zecurx.com", fill="#4a7a68", font=small_font)

    # --- Brand logo + text (bottom right) ---
    # Try loading logo
    logo_img = None
    logo_paths_to_try = [
        LOGO_PATH,
        Path("/app/frontend/public/logo.png"),
        Path("/app/frontend/dist/logo.png"),
    ]
    for lp in logo_paths_to_try:
        if lp.exists():
            try:
                logo_img = Image.open(lp).convert("RGBA")
                break
            except Exception:
                pass

    brand_x = OG_WIDTH - 200
    if logo_img:
        logo_resized = logo_img.resize((36, 36), Image.LANCZOS)
        # Create mask for transparency
        if logo_resized.mode == "RGBA":
            img.paste(logo_resized.convert("RGB"), (brand_x, bottom_y - 4), logo_resized.split()[3])
        else:
            img.paste(logo_resized.convert("RGB"), (brand_x, bottom_y - 4))
        d.text((brand_x + 42, bottom_y + 2), "ZecurX", fill="#0ea5e9", font=brand_font)
    else:
        d.text((brand_x, bottom_y + 2), "🔒 ZecurX", fill="#0ea5e9", font=brand_font)

    # CTA text
    d.text((OG_WIDTH // 2 - 100, bottom_y), "Let's solve this exciting CTF!", fill="#3a6b56", font=small_font)

    # Save to bytes
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Background task: generate & cache AI illustration
# ---------------------------------------------------------------------------
async def _background_generate_og(challenge_id: str, title: str, category: str, description: str,
                                   difficulty: str, points: int, author: str | None):
    """Background task: fetch AI illustration from Pollinations and cache the final composite."""
    cache_path = OG_CACHE_DIR / f"{challenge_id}.png"

    try:
        # Try challenge-specific illustration first
        illustration = await _get_challenge_illustration(challenge_id, title, category, description)

        # Fall back to category illustration
        if illustration is None:
            illustration = await _get_or_generate_category_fallback(category)

        # Build and cache composite
        composite_bytes = _build_composite(
            illustration=illustration,
            title=title,
            description=description,
            category=category,
            difficulty=difficulty,
            points=points,
            author=author,
        )

        cache_path.write_bytes(composite_bytes)
        logger.info("Cached OG composite for challenge: %s", challenge_id)

    except Exception as e:
        logger.error("Background OG generation failed for %s: %s", challenge_id, e)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@seo_router.api_route("/challenge/{challenge_id}", methods=["GET", "HEAD"], response_class=HTMLResponse)
async def seo_challenge(challenge_id: str):
    """Serve static HTML with OG tags for social media bots."""
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

        title = challenge["title"]
        description = challenge["description"]
        if len(description) > 150:
            description = description[:147] + "..."

        points = challenge.get("points", 0)
        difficulty = challenge.get("difficulty", "medium").capitalize()
        category = challenge.get("category_name") or "Challenge"

        og_image_url = f"{BASE_URL}/api/seo/og-image/{challenge_id}"
        challenge_url = f"{BASE_URL}/challenges/{challenge_id}"

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
            <meta property="og:image:width" content="1200">
            <meta property="og:image:height" content="630">

            <!-- Twitter -->
            <meta property="twitter:card" content="summary_large_image">
            <meta property="twitter:url" content="{challenge_url}">
            <meta property="twitter:title" content="{title} - ZecurX CTF">
            <meta property="twitter:description" content="{description}">
            <meta property="twitter:image" content="{og_image_url}">

            <script>
                // Redirect real users to the actual SPA immediately
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
    """Dynamically generate a rich OG preview image for a CTF challenge.

    - Serves cached composite if available (instant).
    - Otherwise serves composite with category fallback + triggers background AI generation.
    """
    # 1. Check full composite cache
    cache_path = OG_CACHE_DIR / f"{challenge_id}.png"
    if cache_path.exists():
        return Response(
            content=cache_path.read_bytes(),
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=86400"},
        )

    # 2. Fetch challenge data
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

    title = challenge.get("title", "Unknown Challenge")
    category = challenge.get("category_name") or "Cybersecurity"
    difficulty = (challenge.get("difficulty") or "medium").upper()
    points = challenge.get("points", 0)
    description = challenge.get("description", "")
    author = challenge.get("author") or challenge.get("createdBy")

    # 3. Try category fallback illustration (may be cached)
    fallback_illustration = await _get_or_generate_category_fallback(category)

    # 4. Build composite with whatever illustration we have
    composite_bytes = _build_composite(
        illustration=fallback_illustration,
        title=title,
        description=description,
        category=category,
        difficulty=difficulty,
        points=points,
        author=author,
    )

    # 5. Kick off background task to generate challenge-specific AI illustration
    asyncio.create_task(
        _background_generate_og(
            challenge_id=challenge_id,
            title=title,
            category=category,
            description=description,
            difficulty=difficulty,
            points=points,
            author=author,
        )
    )

    return Response(
        content=composite_bytes,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=300"},  # Short TTL until AI image ready
    )


# ---------------------------------------------------------------------------
# Admin endpoint: force regenerate OG image
# ---------------------------------------------------------------------------
@seo_router.post("/og-image/{challenge_id}/regenerate")
async def regenerate_og_image(challenge_id: str):
    """Force regenerate the OG image for a challenge (clears cache)."""
    # Clear cached files
    cache_path = OG_CACHE_DIR / f"{challenge_id}.png"
    ill_path = OG_CACHE_DIR / f"illustration_{challenge_id}.png"
    cache_path.unlink(missing_ok=True)
    ill_path.unlink(missing_ok=True)

    return {"status": "cleared", "message": f"Cache cleared for {challenge_id}. Next request will regenerate."}
