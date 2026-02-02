# How to Publish Midnight Guardian

This guide explains how to create installable packages and publish releases of Midnight Guardian on GitHub.

## Prerequisites

- [ ] Have app icons ready (see [Icon Requirements](#icon-requirements) below)
- [ ] Have your code pushed to GitHub
- [ ] Have git installed and configured

## Quick Start - Manual Release

### 1. Build Locally (Testing)

To test building installers on your machine:

```bash
npm run dist
```

This will create installers in the `dist/` folder:
- **Windows**: `.exe` (installer) and `-portable.exe` (portable version)
- **macOS**: `.dmg` and `.zip` files
- **Linux**: `.AppImage` and `.deb` packages

### 2. Create a GitHub Release (Manual)

1. **Create a new tag**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Go to GitHub**:
   - Navigate to your repository
   - Click "Releases" → "Create a new release"
   - Select your tag (v1.0.0)
   - Fill in the release title and description
   - Upload the installer files from `dist/` folder
   - Click "Publish release"

## Automated Releases (Recommended)

The GitHub Actions workflow (`.github/workflows/build-release.yml`) will automatically build installers for all platforms when you push a tag.

### How to Use Automated Releases:

1. **Update version in package.json**:
   ```json
   {
     "version": "1.0.0"
   }
   ```

2. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Release v1.0.0"
   ```

3. **Create and push a tag**:
   ```bash
   git tag v1.0.0
   git push origin main
   git push origin v1.0.0
   ```

4. **Wait for GitHub Actions**:
   - Go to the "Actions" tab in your GitHub repository
   - Watch the build progress
   - Once complete, installers will be uploaded to your release automatically

## Icon Requirements

Before building, you need app icons. Create a `build/` folder with these files:

- **Windows**: `build/icon.ico` (256x256 px, .ico format)
- **macOS**: `build/icon.icns` (512x512 px, .icns format)
- **Linux**: `build/icon.png` (512x512 px, .png format)

### Quick Icon Generation

If you have a single PNG icon (512x512), you can use online tools:
- **ICO Converter**: [icoconvert.com](https://icoconvert.com/)
- **ICNS Converter**: [cloudconvert.com](https://cloudconvert.com/png-to-icns)

Or use command-line tools:
- **electron-icon-builder**: `npm install -g electron-icon-builder`
  ```bash
  electron-icon-builder --input=./icon.png --output=./build
  ```

## Release Checklist

- [ ] Update version in `package.json`
- [ ] Update CHANGELOG or release notes
- [ ] Add/update app icons in `build/` folder
- [ ] Test the app locally with `npm start`
- [ ] Build installers locally with `npm run dist` (optional, for testing)
- [ ] Commit all changes
- [ ] Create and push a git tag (e.g., `v1.0.0`)
- [ ] Verify GitHub Actions completed successfully
- [ ] Download and test the installers from the release

## Versioning

Follow [Semantic Versioning](https://semver.org/):
- **Major** (v2.0.0): Breaking changes
- **Minor** (v1.1.0): New features, backwards compatible
- **Patch** (v1.0.1): Bug fixes

## Troubleshooting

### Build fails on GitHub Actions
- Check the Actions tab for error logs
- Ensure `package.json` has correct build configuration
- Verify icons exist in the `build/` folder

### Installer doesn't run
- On Windows: Users might need to click "More info" → "Run anyway" (SmartScreen)
- Consider code signing for production releases (requires certificate)

### Large file size
- The installer includes all node_modules
- You can exclude unnecessary files in `package.json` under `build.files`

## Publishing to Microsoft Store / Mac App Store

For official store distribution, you'll need:
- **Windows Store**: Developer account ($19/year) + code signing certificate
- **Mac App Store**: Apple Developer account ($99/year) + code signing

This is optional and recommended only for wider distribution.

## Next Steps

1. Add app icons to the `build/` folder
2. Test building locally with `npm run dist`
3. Create your first release with `git tag v1.0.0 && git push origin v1.0.0`
4. Share the download link from your GitHub Releases page!

---

**Need help?** Check the [electron-builder documentation](https://www.electron.build/)
