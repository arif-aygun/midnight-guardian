# Release Process

This document describes how to create and publish releases for Midnight Guardian.

## Overview

Midnight Guardian uses GitHub Actions for automated builds and releases. The release process is triggered by pushing a version tag to the repository.

## Prerequisites

Before creating a release, ensure:

1. All changes are committed and pushed to the main branch
2. Version number in `package.json` is updated
3. `CHANGELOG.md` is updated with release notes
4. All tests pass and the app builds successfully locally

## Release Steps

### 1. Update Version

Update the version number in `package.json`:

```json
{
  "version": "1.0.0"
}
```

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR** version (1.x.x) for incompatible API changes
- **MINOR** version (x.1.x) for new functionality in a backwards compatible manner
- **PATCH** version (x.x.1) for backwards compatible bug fixes

### 2. Update CHANGELOG

Add release notes to `CHANGELOG.md`:

```markdown
## [1.0.0] - 2026-02-02

### Added
- New feature description

### Changed
- Changed feature description

### Fixed
- Bug fix description
```

### 3. Commit Changes

```bash
git add package.json CHANGELOG.md
git commit -m "chore: prepare release v1.0.0"
git push origin main
```

### 4. Create and Push Tag

```bash
# Create an annotated tag
git tag -a v1.0.0 -m "Release v1.0.0"

# Push the tag to GitHub
git push origin v1.0.0
```

### 5. Automated Build Process

Once the tag is pushed, GitHub Actions will automatically:

1. **Build for multiple platforms**:
   - Windows: NSIS installer and portable executable
   - macOS: DMG and ZIP archives
   - Linux: AppImage and DEB packages

2. **Create artifacts**:
   - Windows installers uploaded as `windows-installers`
   - macOS installers uploaded as `macos-installers`
   - Linux installers uploaded as `linux-installers`

3. **Workflow location**: `.github/workflows/build-release.yml`

### 6. Create GitHub Release

After the workflow completes:

1. Go to the [Releases page](https://github.com/arif-aygun/midnight-guardian/releases)
2. Click "Draft a new release"
3. Select the tag you just created (e.g., `v1.0.0`)
4. Set the release title (e.g., `Midnight Guardian v1.0.0`)
5. Copy the relevant section from `CHANGELOG.md` into the release notes
6. Download the artifacts from the workflow run
7. Attach the installers to the release:
   - Windows: `.exe` files
   - macOS: `.dmg` and `.zip` files
   - Linux: `.AppImage` and `.deb` files
8. Mark as "Latest release" if appropriate
9. Click "Publish release"

## Local Build Testing

Before creating a release, test the build process locally:

### Build for Windows
```bash
npm run dist -- --win
```

### Build for macOS
```bash
npm run dist -- --mac
```

### Build for Linux
```bash
npm run dist -- --linux
```

### Build for all platforms
```bash
npm run dist
```

Built installers will be in the `dist/` directory.

## Build Configuration

The build configuration is defined in `package.json` under the `build` key:

- **App ID**: `com.arifaygun.midnight-guardian`
- **Product Name**: `Midnight Guardian`
- **Output Directory**: `dist/`
- **Icons**: Located in `build/` directory
  - Windows: `icon.ico`
  - macOS: `icon.icns`
  - Linux: `icon.png`

## Troubleshooting

### Build fails locally

1. Ensure all dependencies are installed: `npm install`
2. Check Node.js version (requires 16+)
3. Clear cache: `npm run postinstall`

### GitHub Actions workflow fails

1. Check the workflow run logs in the Actions tab
2. Ensure the tag format is correct (`v*` pattern)
3. Verify all dependencies in `package.json` are valid
4. Check that icons exist in the `build/` directory

### Tag already exists

If you need to recreate a tag:

```bash
# Delete local tag
git tag -d v1.0.0

# Delete remote tag
git push origin :refs/tags/v1.0.0

# Create new tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

## Post-Release Checklist

- [ ] Verify all platform installers are attached to the release
- [ ] Test Windows installer on a clean Windows machine
- [ ] Update README.md badges if needed
- [ ] Announce the release (social media, discussions, etc.)
- [ ] Monitor issue tracker for release-related bugs
- [ ] Create milestone for next release

## Version History

- v1.0.0 - Initial release (2026-02-02)

## Additional Resources

- [Electron Builder Documentation](https://www.electron.build/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
