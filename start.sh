#!/bin/sh
set -eu
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then npm ci; fi
printf 'Open http://localhost:5173 after Vite starts below.\n'
exec npm run dev
