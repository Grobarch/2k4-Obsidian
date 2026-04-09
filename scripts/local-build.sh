#!/bin/bash
# local-build.sh — lokalny podgląd wiki (symuluje CI pipeline)
#
# Użycie:
#   bash scripts/local-build.sh          # build + serve na :8080
#   bash scripts/local-build.sh --build  # tylko build (bez serve)
#
set -e
cd "$(dirname "$0")/.."

# Ensure node/npx are in PATH (Git Bash launched from PowerShell may not inherit it)
export PATH="/c/Program Files/nodejs:$PATH"

# globby (używane przez Quartz) respektuje .gitignore, które ma wpis quartz/content/
# — tymczasowo usuwamy ten wpis, żeby Quartz widział pliki treści
cp .gitignore .gitignore.bak
trap 'mv .gitignore.bak .gitignore' EXIT
sed -i '/^quartz\/content\/$/d' .gitignore

echo "[1/4] Kopiowanie vault → quartz/content..."
rm -rf quartz/content
mkdir -p quartz/content
cp -r vault/* quartz/content/

echo "[2/5] Normalizacja frontmatter..."
node scripts/vault-tools.mjs normalize --dir quartz/content --apply 2>&1 | tail -1

echo "[3/5] Usuwanie duplikatów H1..."
node scripts/strip-h1.mjs quartz/content --apply 2>&1 | tail -1

echo "[4/5] Konwersja Obsidian Bases → markdown..."
node scripts/build-bases.mjs quartz/content 2>&1

echo "[5/5] Budowanie Quartz..."
cd quartz
if [ "$1" = "--build" ]; then
  npx quartz build
else
  npx quartz build --serve --port 8080
fi
