#!/usr/bin/env bash
# Signs the packaged Duly.app for this Mac (SPEC-W1 point 21). Forge's postPackage hook calls it
# after the fuses are set and before the DMG is made; it can also be run by hand.
#
#   1. every Mach-O under Resources/python, the .so and .dylib files before the python3 binary;
#   2. python-manifest.json written again, since signing changed those files' bytes;
#   3. the Electron helpers and frameworks, inner before outer;
#   4. Duly.app itself;
#   5. codesign --verify --deep --strict.
#
# Ad hoc (--sign -) unless DULY_SIGN_IDENTITY names a code-signing identity in the login
# keychain (point 22). Hardened runtime, no timestamp. The .app bundles carry
# desktop/build/entitlements.plist (allow-jit for V8, and library validation off because an ad hoc
# or self-made signature has no team); the interpreter carries python-entitlements.plist (library
# validation off). The Developer ID build drops both library-validation keys.
#
# --dry-run prints the codesign order and changes nothing.
set -euo pipefail

dry=0
if [[ "${1:-}" == "--dry-run" ]]; then
  dry=1
  shift
fi
if [[ $# -ne 1 || ! -d "$1/Contents" ]]; then
  echo "usage: sign-adhoc.sh [--dry-run] <path to Duly.app>" >&2
  exit 2
fi

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
app="$(cd "$1" && pwd)"
identity="${DULY_SIGN_IDENTITY:--}"
entitlements="$here/../build/entitlements.plist"
python_entitlements="$here/../build/python-entitlements.plist"
for f in "$entitlements" "$python_entitlements"; do
  [[ -f "$f" ]] || {
    echo "sign-adhoc: no $f" >&2
    exit 1
  }
done

run() {
  echo "+ $*"
  if [[ $dry -eq 0 ]]; then "$@"; fi
}

sign() {
  run codesign --force --sign "$identity" --options runtime --timestamp=none "$@"
}

# A Mach-O file, thin or universal, by its first four bytes.
macho() {
  case "$(od -An -tx1 -N4 "$1" 2>/dev/null | tr -d ' \n')" in
    cffaedfe | cefaedfe | feedfacf | feedface | cafebabe | bebafeca) return 0 ;;
    *) return 1 ;;
  esac
}

# Paths read from stdin, deepest first, so what is inside is signed before what holds it.
deepest_first() {
  awk -F/ '{ print NF "\t" $0 }' | LC_ALL=C sort -t $'\t' -k1,1nr -k2,2 | cut -f2-
}

resources="$app/Contents/Resources"

echo "step 0: the runtime's links, relative again"
# Forge copies extraResource with each link made absolute, into desktop/build/python, and
# codesign refuses a link whose target is outside the app. Point each one back inside, relative;
# a link that still leads outside Resources/python stops the build.
if [[ -d "$resources/python" ]]; then
  run node -e '
    const fs = require("node:fs"), path = require("node:path");
    const base = fs.realpathSync(process.argv[1]);
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isSymbolicLink()) {
          const t = fs.readlinkSync(p);
          if (!path.isAbsolute(t)) continue;
          const i = t.lastIndexOf("/python/");
          const inside = i < 0 ? null : path.join(base, t.slice(i + "/python/".length));
          if (!inside || !fs.existsSync(inside)) { console.error("sign-adhoc: link leaves the app: " + p + " -> " + t); process.exit(1); }
          fs.unlinkSync(p);
          fs.symlinkSync(path.relative(path.dirname(p), inside), p);
        } else if (e.isDirectory()) walk(p);
      }
    };
    walk(base);
  ' "$resources/python"
fi

echo "step 1: the bundled runtime"
if [[ -d "$resources/python" ]]; then
  while IFS= read -r file; do
    if ! macho "$file"; then continue; fi
    case "$file" in
      *.so | *.dylib) sign "$file" ;;
      # The interpreter loads its own ad hoc signed libraries, which have no team (threat model).
      *) sign --entitlements "$python_entitlements" "$file" ;;
    esac
  done < <(
    find "$resources/python" -type f \( -name '*.so' -o -name '*.dylib' \) | deepest_first
    find "$resources/python" -type f -not -name '*.so' -not -name '*.dylib' | deepest_first
  )
fi

echo "step 2: the runtime's manifest"
if [[ -f "$resources/python-manifest.json" ]]; then
  run node "$here/manifest.mjs" "$resources"
fi

echo "step 3: the Electron helpers and frameworks"
if [[ -d "$app/Contents/Frameworks" ]]; then
  while IFS= read -r path; do
    if [[ -d "$path" && "$path" == *.app ]]; then
      sign --entitlements "$entitlements" "$path"
    elif [[ -d "$path" ]] || macho "$path"; then
      sign "$path"
    fi
  done < <(
    find "$app/Contents/Frameworks" \( -type d \( -name '*.framework' -o -name '*.app' \) -print \) \
      -o \( -type f -print \) |
      deepest_first
  )
fi

echo "step 4: Duly.app"
sign --entitlements "$entitlements" "$app"

echo "step 5: verify"
run codesign --verify --deep --strict --verbose=1 "$app"
echo "sign-adhoc: done"
