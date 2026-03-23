#!/bin/bash
# Push a workout/settings update to the Health Hub API
# Usage: ./scripts/push-update.sh '{"changes":[...],"reason":"..."}'

SCRIPT_DIR="$(dirname "$0")"
source "${SCRIPT_DIR}/../.env"

if [ -z "$1" ]; then
  echo "Usage: $0 '<json_payload>'"
  exit 1
fi

curl -s -X POST "${HEALTH_HUB_URL}/api/update" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${UPDATE_TOKEN}" \
  -d "$1"
echo
