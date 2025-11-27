# Page Cover Images

This directory contains cover images that are automatically loaded by the BetaQue Notes application.

## 📁 Current Images

Currently contains **11 James Webb Telescope images** (`webb1.jpg` - `webb11.jpg`).

## ✨ How It Works

The cover picker **automatically detects all images** in this folder at runtime. No code changes needed!

- The `/api/covers` endpoint scans this directory
- Supports: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`
- Images are sorted naturally (webb1, webb2, webb3, etc.)

## 🎨 Adding New Covers

### Quick Add
1. Drop any image files into this folder
2. Reload the page
3. Your new images will appear in the cover picker automatically!

### Organizing by Category
Images are automatically categorized by filename prefix:
- `webb*.jpg` → "James Webb Telescope" category
- Other images → "Other Covers" category

### Best Practices
- Use descriptive names: `nasa-mars-1.jpg`, `art-galaxy-2.png`
- Recommended size: 1920x1080 or wider
- Keep file sizes reasonable (< 2MB per image)
- Use `.jpg` for photos, `.png` for graphics

## 🔧 Technical Details

**API Endpoint**: `/api/covers`
**Returns**: JSON array of image objects with `url`, `name`, and `position` fields

**Files Used**:
- `apps/web/app/api/covers/route.ts` - API endpoint
- `apps/web/components/tailwind/editor/CoverImage.tsx` - Cover picker component
- `apps/web/middleware.ts` - Allows public access to /api/covers

## 🎯 Future Enhancements

To create custom categories, you can:
1. Use naming conventions: `category-name-number.jpg`
2. Edit the category logic in `CoverImage.tsx` (around line 40-65)

Example:
- `nasa-*.jpg` → "NASA Archive" category
- `art-*.jpg` → "Artwork" category
- `nature-*.jpg` → "Nature" category
