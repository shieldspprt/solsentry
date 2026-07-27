#!/usr/bin/env bash
# publish.sh — Build and publish all @npmsolsentry packages in dependency order
# Usage: ./publish.sh [--dry-run] [--tag latest]

set -euo pipefail

DRY_RUN=false
TAG="latest"

for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    --tag=*) TAG="${arg#*=}" ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKGS=(
  "packages/sdk"
  "packages/cli"
  "packages/mcp"
)

PUBLISH_ARGS=(--access public)
if [[ "$TAG" != "latest" ]]; then
  PUBLISH_ARGS+=(--tag "$TAG")
fi
if [[ "$DRY_RUN" == "true" ]]; then
  PUBLISH_ARGS+=(--dry-run)
fi

echo "📦 Publishing @npmsolsentry packages in order: ${PKGS[*]}"

for pkg in "${PKGS[@]}"; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📁 $pkg"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  cd "$ROOT/$pkg"
  
  echo "🔨 Building..."
  npm run build
  
  echo "🚀 Publishing..."
  npm publish "${PUBLISH_ARGS[@]}"
  
  echo "✅ $pkg published"
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 All packages published successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
