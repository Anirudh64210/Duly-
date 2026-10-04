#!/usr/bin/env bash
# Builds the Python that Duly carries inside the app (SPEC-W1 point 15). Run by
# make desktop-python, outside the agents' jail: it downloads the runtime and the wheels.
#
#   1. download the runtime named in desktop/python/runtime.json, check its SHA-256, unpack it
#      to desktop/build/python;
#   2. install the desktop dependency group from uv.lock, wheels only, hashes required, into
#      desktop/build/python/site;
#   3. copy the files of desktop/python/bundle.json to desktop/build/engine-root, keeping their
#      paths, the launcher at the top. Each include pattern must match a file; an optional one
#      may match none. No PROGRESS.md or REPORT.json (an agent's work log) is copied;
#   4. precompile every .py, so nothing is written inside the signed app later;
#   5. write desktop/build/python-manifest.json.
#
# --dry-run prints the steps and the files it would copy, and changes nothing.
# DULY_ROOT names another repository root (the tests use a fake one).
set -euo pipefail

dry=0
if [[ "${1:-}" == "--dry-run" ]]; then
  dry=1
elif [[ $# -gt 0 ]]; then
  echo "usage: build-python.sh [--dry-run]" >&2
  exit 2
fi

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="${DULY_ROOT:-$(cd "$here/../.." && pwd)}"
desktop="$root/desktop"
build="$desktop/build"
runtime_json="$desktop/python/runtime.json"
bundle_json="$desktop/python/bundle.json"

fail() {
  echo "build-python: $*" >&2
  exit 1
}

run() {
  echo "+ $*"
  if [[ $dry -eq 0 ]]; then "$@"; fi
}

field() {
  node -e 'const v = require(process.argv[1])[process.argv[2]]; if (typeof v !== "string" || v === "") process.exit(1); console.log(v);' "$1" "$2" ||
    fail "$1 has no $2"
}

[[ -f "$runtime_json" ]] || fail "no $runtime_json"
[[ -f "$bundle_json" ]] || fail "no $bundle_json"
url="$(field "$runtime_json" url)"
asset="$(field "$runtime_json" asset)"
sha256="$(field "$runtime_json" sha256)"
python="$build/python/bin/python3"

echo "step 1: the runtime"
download="$build/download/$asset"
if [[ ! -f "$download" ]]; then
  run mkdir -p "$build/download"
  run curl --fail --location --proto '=https' --tlsv1.2 --output "$download.part" "$url"
  run mv "$download.part" "$download"
fi
if [[ $dry -eq 0 ]]; then
  got="$(shasum -a 256 "$download" | cut -d' ' -f1)"
  if [[ "$got" != "$sha256" ]]; then
    rm -f "$download"
    fail "the runtime's SHA-256 is $got; runtime.json says $sha256. Nothing was unpacked."
  fi
  echo "SHA-256 matches runtime.json: $sha256"
else
  echo "would check SHA-256 $sha256"
fi
run rm -rf "$build/python"
run tar -xzf "$download" -C "$build"
if [[ $dry -eq 0 && ! -x "$python" ]]; then fail "the runtime has no bin/python3"; fi
# Tools and docs the engine never runs: fewer files to sign, nothing that links elsewhere.
run rm -rf "$build/python/share" "$build/python/lib/pkgconfig"
run find "$build/python/bin" -mindepth 1 \( -name '2to3*' -o -name 'idle3*' -o -name 'pydoc3*' \
  -o -name 'python3*-config' \) -exec rm -f {} +

echo "step 2: the desktop dependency group, wheels only"
requirements="$build/requirements.txt"
run uv export --project "$root" --frozen --only-group desktop --no-emit-project --no-header \
  --output-file "$requirements"
run "$python" -I -m pip install --no-input --disable-pip-version-check --require-hashes \
  --only-binary :all: --no-deps --no-compile --target "$build/python/site" -r "$requirements"

echo "step 3: the allowlisted sources"
# One line per file: the path in the repository, a tab, the path under engine-root.
allowlisted() {
  local list pattern match file
  shopt -s nullglob
  cd "$root"
  while IFS=$'\t' read -r list pattern; do
    local found=0
    # Unquoted on purpose: the pattern is a glob from bundle.json.
    # shellcheck disable=SC2086
    for match in $pattern; do
      [[ -e "$match" ]] || continue
      while IFS= read -r file; do
        found=1
        if [[ "$(basename "$file")" == "duly_engine.py" ]]; then
          printf '%s\t%s\n' "$file" "duly_engine.py"
        else
          printf '%s\t%s\n' "$file" "$file"
        fi
      done < <(find "$match" -type f -not -path '*/__pycache__/*' -not -name '.DS_Store' \
        -not -name 'PROGRESS.md' -not -name 'REPORT.json' | LC_ALL=C sort)
    done
    [[ $found -eq 1 || $list == optional ]] || fail "bundle.json names $pattern, which matches no file"
  done < <(node -e 'const b = require(process.argv[1]); for (const l of ["include", "optional"]) for (const p of b[l] ?? []) console.log(`${l}\t${p}`);' "$bundle_json")
}
files="$(allowlisted)" || exit 1
run rm -rf "$build/engine-root"
while IFS=$'\t' read -r from to; do
  echo "copy $from -> engine-root/$to"
  if [[ $dry -eq 0 ]]; then
    mkdir -p "$(dirname "$build/engine-root/$to")"
    cp -p "$root/$from" "$build/engine-root/$to"
  fi
done <<<"$files"

echo "step 4: precompile"
run "$python" -I -m compileall -q -j 0 --invalidation-mode unchecked-hash \
  "$build/python/lib" "$build/python/site" "$build/engine-root"

echo "step 5: the manifest"
if [[ $dry -eq 0 ]]; then
  tzdata="$(sed -n 's/^tzdata==\([^ ;]*\).*/\1/p' "$requirements")"
  [[ -n "$tzdata" ]] || fail "no tzdata in $requirements"
else
  tzdata="<from requirements.txt>"
fi
run node "$here/manifest.mjs" "$build" "$tzdata"
echo "build-python: done"
