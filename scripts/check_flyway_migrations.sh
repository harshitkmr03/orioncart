#!/usr/bin/env bash
# Ensure migration versions are unique and valid for CI
set -euo pipefail
DIR="backend/src/main/resources/db/migration"
if [ ! -d "$DIR" ]; then
  echo "Migration directory not found: $DIR" >&2
  exit 1
fi

versions=()
for f in "$DIR"/V*__*.sql; do
  [ -e "$f" ] || continue
  fname=$(basename "$f")
  ver=$(echo "$fname" | sed -E 's/^V([0-9]+)__.*$/\1/')
  if [[ ! "$ver" =~ ^[0-9]+$ ]]; then
    echo "Invalid migration filename: $fname" >&2
    exit 1
  fi
  versions+=("$ver")
done

dups=$(printf "%s\n" "${versions[@]}" | sort | uniq -d || true)
if [ -n "$dups" ]; then
  echo "Duplicate migration versions found: $dups" >&2
  exit 2
fi

echo "Flyway migrations check OK. Count=${#versions[@]}"
exit 0
