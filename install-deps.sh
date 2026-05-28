#!/bin/bash
set -e
cd /mnt/e/code/projects/arad-atlas

echo "=== Installing runtime deps ==="
npm install drizzle-orm @libsql/client zod recharts lucide-react bcryptjs robots-parser cheerio
echo "=== Runtime deps done ==="

echo "=== Installing dev deps ==="
npm install -D drizzle-kit vitest @vitest/coverage-v8 @types/bcryptjs @types/cheerio tsx jsdom @vitejs/plugin-react
echo "=== Dev deps done ==="

echo "=== ALL DONE ==="
