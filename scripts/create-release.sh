#!/bin/bash

# Midnight Guardian Release Script
# This script helps create and push a release tag to trigger the GitHub Actions workflow

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "  Midnight Guardian Release Creator"
echo "================================================"
echo ""

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"

echo -e "${GREEN}Current version:${NC} ${VERSION}"
echo -e "${GREEN}Release tag:${NC} ${TAG}"
echo ""

# Check if tag already exists locally
if git tag -l | grep -q "^${TAG}$"; then
    echo -e "${YELLOW}Warning:${NC} Tag ${TAG} already exists locally"
    read -p "Do you want to delete and recreate it? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git tag -d ${TAG}
        echo -e "${GREEN}✓${NC} Local tag deleted"
    else
        echo "Exiting..."
        exit 1
    fi
fi

# Check if tag exists on remote
if git ls-remote --tags origin | grep -q "refs/tags/${TAG}"; then
    echo -e "${YELLOW}Warning:${NC} Tag ${TAG} already exists on remote"
    echo "You need to delete it first with:"
    echo "  git push origin :refs/tags/${TAG}"
    exit 1
fi

# Verify all changes are committed
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}Error:${NC} You have uncommitted changes"
    echo "Please commit or stash your changes first"
    git status -s
    exit 1
fi

# Create the annotated tag
echo ""
echo "Creating annotated tag ${TAG}..."
git tag -a ${TAG} -m "Release ${TAG}"
echo -e "${GREEN}✓${NC} Tag created"

# Push the tag
echo ""
echo "Pushing tag to GitHub..."
echo "This will trigger the build workflow at:"
echo "  .github/workflows/build-release.yml"
echo ""
read -p "Continue? (Y/n) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    git push origin ${TAG}
    echo -e "${GREEN}✓${NC} Tag pushed to GitHub"
    echo ""
    echo "================================================"
    echo "  Release workflow started!"
    echo "================================================"
    echo ""
    echo "Next steps:"
    echo "1. Monitor the workflow at:"
    echo "   https://github.com/arif-aygun/midnight-guardian/actions"
    echo ""
    echo "2. Once complete, create a GitHub Release:"
    echo "   https://github.com/arif-aygun/midnight-guardian/releases/new?tag=${TAG}"
    echo ""
    echo "3. Use the template from:"
    echo "   .github/release-template.md"
    echo ""
    echo "4. Download and attach build artifacts from the workflow run"
    echo ""
else
    echo "Tag not pushed. You can push it later with:"
    echo "  git push origin ${TAG}"
fi
