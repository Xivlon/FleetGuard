# FleetGuard App Assets

This directory contains the visual assets for the FleetGuard mobile application.

## Required Assets

### App Icon (`icon.png`)
- **Size**: 1024x1024 pixels
- **Format**: PNG with transparency
- **Purpose**: Main app icon displayed on home screens
- **Current Status**: ⚠️ Placeholder exists, needs to be replaced with actual design

### Adaptive Icon (`adaptive-icon.png`)
- **Size**: 1024x1024 pixels
- **Format**: PNG with transparency
- **Purpose**: Android adaptive icon (centered within safe zone)
- **Safe Zone**: Keep important content within central 768x768px circle
- **Current Status**: ❌ Missing, needs to be created

### Splash Screen (`splash.png`)
- **Size**: 1284x2778 pixels (iPhone 14 Pro Max size)
- **Format**: PNG
- **Purpose**: Loading screen shown when app starts
- **Background**: Dark (#000000) to match app theme
- **Current Status**: ❌ Missing, needs to be created

### Favicon (`favicon.png`)
- **Size**: 48x48 pixels
- **Format**: PNG
- **Purpose**: Web version favicon
- **Current Status**: ❌ Missing, needs to be created

### Notification Icon (`notification-icon.png`)
- **Size**: 96x96 pixels
- **Format**: PNG (white icon on transparent background for Android)
- **Purpose**: Push notification icon
- **Current Status**: ❌ Missing, needs to be created

## Design Guidelines

### Color Scheme
- Primary: #10B981 (Emerald green)
- Secondary: #059669 (Darker emerald)
- Background: #000000 (Black)
- Text: #FFFFFF (White)

### Icon Design Tips
1. **Simple and recognizable**: Should work at small sizes
2. **FleetGuard theme**: Consider using:
   - Truck/vehicle icon
   - Route/navigation marker
   - Shield (for "Guard" aspect)
   - Combination of navigation + fleet concept

3. **Adaptive icon safe zone**: For Android, keep critical elements within the center 66% of the image

### Creating Assets

#### Option 1: Design Tools
Use tools like:
- Figma (free, web-based)
- Adobe Illustrator
- Sketch
- Canva (has app icon templates)

#### Option 2: Asset Generators
After creating the base 1024x1024 icon:
- Use `expo-cli` to generate variants: `npx expo-optimize`
- Or use online generators like appicon.co or makeappicon.com

#### Option 3: AI Generation
Use AI tools like:
- DALL-E
- Midjourney
- Stable Diffusion

Example prompt:
```
"Modern minimalist app icon for a fleet navigation app, emerald green color (#10B981),
featuring a stylized truck with GPS marker, flat design, dark background, professional"
```

## Quick Asset Generation Commands

If you have ImageMagick installed, you can create placeholder assets:

### Create placeholder icon (solid color with text)
```bash
convert -size 1024x1024 xc:#10B981 -gravity center \
  -pointsize 72 -fill white -annotate +0+0 "FG" \
  icon.png
```

### Create adaptive icon
```bash
convert -size 1024x1024 xc:transparent -gravity center \
  -fill #10B981 -draw "circle 512,512 512,200" \
  -pointsize 200 -fill white -annotate +0+0 "FG" \
  adaptive-icon.png
```

### Create splash screen
```bash
convert -size 1284x2778 xc:#000000 -gravity center \
  -pointsize 100 -fill #10B981 -annotate +0-200 "FleetGuard" \
  -pointsize 40 -fill white -annotate +0+200 "Real-Time Fleet Navigation" \
  splash.png
```

### Create favicon
```bash
convert icon.png -resize 48x48 favicon.png
```

### Create notification icon (white on transparent)
```bash
convert -size 96x96 xc:transparent -gravity center \
  -fill white -draw "circle 48,48 48,20" \
  -fill white -draw "polygon 48,30 48,50 60,40" \
  notification-icon.png
```

## Asset Checklist

Before building for production, ensure:
- [ ] All required assets are created
- [ ] Icons are high resolution and crisp
- [ ] Adaptive icon works within safe zone
- [ ] Splash screen matches app design
- [ ] All assets are properly named
- [ ] No placeholder assets remain
- [ ] Assets are optimized for size (use `expo-optimize`)

## Resources

- [Expo App Icons Documentation](https://docs.expo.dev/develop/user-interface/app-icons/)
- [Expo Splash Screens Documentation](https://docs.expo.dev/develop/user-interface/splash-screen/)
- [Material Design Icon Guidelines](https://material.io/design/iconography/product-icons.html)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons)
