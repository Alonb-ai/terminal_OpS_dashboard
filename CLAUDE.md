# Manager Dashboard

A task management dashboard that syncs with GitHub Gist. Used for tracking project tasks with categories, priorities, and progress.

## Architecture

- **Frontend**: `index.html` — Pure HTML/CSS/JS SPA (no build process)
- **Data Source**: GitHub Gist (source of truth) — stores `tasks.json`
- **Local Cache**: `tasks.json` — Auto-generated snapshot for offline/CLI access
- **Legacy**: `google-apps-script.js` — Previous Google Apps Script backend (kept for reference)

## Reading Tasks

To get the current task list, read `tasks.json` in the project root. This file is synced from GitHub Gist using `sync-tasks.sh`.

### Task Structure (tasks.json)

```json
{
  "synced_at": "2026-03-10T12:00:00.000Z",
  "categories": {
    "category_name": {
      "color": "#hex",
      "tasks": [
        {
          "id": 1,
          "task": "Task description",
          "done": false,
          "category": "category_name",
          "priority": 1,
          "est_hours": 2,
          "verified_in_code": false,
          "note": ""
        }
      ]
    }
  },
  "summary": {
    "total": 50,
    "done": 20,
    "remaining": 30,
    "percent": 40
  }
}
```

### Syncing Tasks

Run `./sync-tasks.sh` to download the latest tasks from GitHub Gist into `tasks.json`.

```bash
chmod +x sync-tasks.sh
./sync-tasks.sh <GIST_ID>
```

Or set the environment variable:
```bash
GIST_ID=your_gist_id ./sync-tasks.sh
```

### GitHub Gist API

Tasks are stored in a GitHub Gist as a `tasks.json` file. The dashboard reads and writes via the GitHub REST API:

- **Read**: `GET https://api.github.com/gists/{gist_id}`
- **Write**: `PATCH https://api.github.com/gists/{gist_id}` (requires token with `gist` scope)

#### Claude Code Integration

```bash
# Read tasks
gh gist view <GIST_ID> --filename tasks.json

# Edit tasks
gh gist edit <GIST_ID> --filename tasks.json
```

## Setup

1. Create a GitHub Gist containing a file named `tasks.json` with the task structure above
2. Generate a GitHub Personal Access Token with the `gist` scope
3. Open the dashboard and enter the Gist ID and token in the setup screen

## Categories

| Category | Color | Description |
|----------|-------|-------------|
| מיידי | Red | Immediate/urgent tasks |
| באגים | Orange | Bug fixes |
| פיצ'רים עמר | Purple | Amr's features |
| פיצ'רים יובל לי | Blue | Yuval Li's features |
| טווח קרוב | Teal | Near-term tasks |
| טווח רחוק | Gray | Long-term tasks |
| Production | Green | Production issues |
| n8n אימות | Magenta | n8n authentication |

## Development

No build process needed. Open `index.html` in a browser or serve with any static file server.

The dashboard works on mobile and desktop — any changes made on one device sync through GitHub Gist and appear on the other. The dashboard auto-polls every 30 seconds for updates.
