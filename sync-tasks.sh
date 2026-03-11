#!/bin/bash
# Sync tasks from GitHub Gist to local tasks.json
# Usage: ./sync-tasks.sh [GIST_ID]
#
# The Gist ID can be provided as:
#   1. First argument: ./sync-tasks.sh abc123def456
#   2. Environment variable: GIST_ID=abc123def456 ./sync-tasks.sh
#   3. gh CLI will use your authenticated GitHub account

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT="$SCRIPT_DIR/tasks.json"

# Get Gist ID from argument or environment
GIST_ID="${1:-$GIST_ID}"

if [ -z "$GIST_ID" ]; then
    echo "Error: No Gist ID provided"
    echo "Usage: ./sync-tasks.sh <GIST_ID>"
    echo "   or: GIST_ID=<id> ./sync-tasks.sh"
    exit 1
fi

echo "Syncing tasks from GitHub Gist..."

# Try gh CLI first, fall back to curl
if command -v gh &>/dev/null; then
    CONTENT=$(gh gist view "$GIST_ID" --filename tasks.json 2>/dev/null)
else
    CONTENT=$(curl -sL "https://api.github.com/gists/$GIST_ID" 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data['files']['tasks.json']['content'])
" 2>/dev/null)
fi

if [ -z "$CONTENT" ]; then
    echo "Error: Could not fetch gist content"
    exit 1
fi

# Validate JSON structure
if ! echo "$CONTENT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'categories' in d" 2>/dev/null; then
    echo "Error: Invalid tasks.json format (missing 'categories')"
    echo "$CONTENT" | head -c 200
    exit 1
fi

# Write to file (update synced_at timestamp)
echo "$CONTENT" | python3 -c "
import sys, json
from datetime import datetime, timezone

data = json.load(sys.stdin)
data['synced_at'] = datetime.now(timezone.utc).isoformat()

# Recalculate summary
total = 0
done = 0
for cat_info in data.get('categories', {}).values():
    for t in cat_info.get('tasks', []):
        total += 1
        if t.get('done'):
            done += 1

data['summary'] = {
    'total': total,
    'done': done,
    'remaining': total - done,
    'percent': round(done / total * 100) if total > 0 else 0
}

print(json.dumps(data, ensure_ascii=False, indent=2))
" > "$OUTPUT"

if [ $? -eq 0 ]; then
    TOTAL=$(python3 -c "import json; d=json.load(open('$OUTPUT')); print(d['summary']['total'])")
    DONE=$(python3 -c "import json; d=json.load(open('$OUTPUT')); print(d['summary']['done'])")
    PCT=$(python3 -c "import json; d=json.load(open('$OUTPUT')); print(d['summary']['percent'])")
    echo "Synced successfully! $DONE/$TOTAL tasks done ($PCT%)"
    echo "Output: $OUTPUT"
else
    echo "Error: Failed to process task data"
    exit 1
fi
