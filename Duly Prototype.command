#!/bin/bash
# Double-click to open the Duly prototype in its own window.
cd "$(dirname "$0")"
exec ./node_modules/.bin/electron specs/ui-2/prototype/desktop/main.cjs
