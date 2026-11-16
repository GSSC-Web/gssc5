#!/usr/bin/env bash
# Start backend → public → members for Playwright (no concurrent prisma generate).
# Types/seed must already be done (`mise run //e2e:test` depends on them).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

wait_url() {
  local url="$1"
  local name="$2"
  local i
  for i in $(seq 1 240); do
    if curl -sf "$url" >/dev/null; then
      echo "e2e-stack: $name ready ($url)"
      return 0
    fi
    sleep 1
  done
  echo "e2e-stack: timed out waiting for $name at $url" >&2
  return 1
}

cleanup() {
  local pids
  pids="$(jobs -p 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    # shellcheck disable=SC2086
    kill ${pids} 2>/dev/null || true
  fi
}
trap cleanup EXIT

(
  cd gssc5-web/apps/backend
  exec bun run dev
) &
wait_url "http://127.0.0.1:3000/" "backend"

(
  cd gssc5-web/apps/public
  # Avoid Angular CI cache disable when Playwright sets CI=true.
  unset CI
  exec bunx ng serve --host 127.0.0.1 --port 4200
) &
wait_url "http://127.0.0.1:4200/" "public"

(
  cd gssc5-web/apps/members
  unset CI
  exec bunx ng serve --host 127.0.0.1 --port 4201
) &
wait_url "http://127.0.0.1:4201/" "members"

wait
