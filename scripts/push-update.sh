#!/bin/bash
# Push a workout/settings update to the Health Hub API
# Usage: ./scripts/push-update.sh '{"changes":[...],"reason":"..."}'
# Reads UPDATE_TOKEN (and optional HEALTH_HUB_URL) from .env.local (`vercel env pull`).

SCRIPT_DIR="$(dirname "$0")"
set -a; source "${SCRIPT_DIR}/../.env.local"; set +a
HEALTH_HUB_URL="${HEALTH_HUB_URL:-https://health-hub-topaz-sigma.vercel.app}"

if [ -z "$1" ]; then
  echo "Usage: $0 '<json_payload>'"
  exit 1
fi

curl -s -X POST "${HEALTH_HUB_URL}/api/update" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${UPDATE_TOKEN}" \
  -d "$1"
echo
