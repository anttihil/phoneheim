# Claude Code Devcontainer with Browser Automation

A secure, isolated development environment for running Claude Code with browser automation capabilities using the dev-browser skill.

## Features

- **Security isolation**: Firewall rules restrict outbound traffic to whitelisted domains only
- **Browser automation ready**: Playwright and Chromium pre-installed
- **Claude Code pre-configured**: Ready to use out of the box
- **Persistent configuration**: Claude settings and shell history survive container rebuilds

## Quick Start

### 1. Copy files to your project

Copy the `.devcontainer/` folder to your project root:

```
your-project/
├── .devcontainer/
│   ├── devcontainer.json
│   ├── Dockerfile
│   └── init-firewall.sh
└── ... your code ...
```

### 2. Open in VS Code

```bash
code your-project/
```

When prompted, click **"Reopen in Container"** or run:

- `Ctrl+Shift+P` → "Dev Containers: Reopen in Container"

### 3. Install dev-browser plugin

Once inside the container, run in Claude Code:

```
/plugin marketplace add sawyerhood/dev-browser
/plugin install dev-browser@sawyerhood/dev-browser
```

**Restart Claude Code** after installation.

### 4. Use it!

Ask Claude to interact with your browser:

> "Open localhost:3000 and test the signup flow"

> "Go to the dashboard and verify the chart renders correctly"

## Security Model

### What's allowed

| Category              | Examples                                      |
| --------------------- | --------------------------------------------- |
| Claude API            | api.anthropic.com                             |
| Package registries    | npm, PyPI, yarn                               |
| GitHub                | git operations, plugin marketplace            |
| Container localhost   | Services running inside the container         |
| Docker bridge network | Container's /24 subnet (typically 172.17.0.x) |

### What's blocked

Everything else. The firewall uses a default-deny policy.

### Adding domains

If you need to access external sites for testing, edit `.devcontainer/init-firewall.sh`:

```bash
ALLOWED_DOMAINS=(
    # ... existing domains ...

    # Add your domains here
    "api.your-service.com"
    "cdn.your-service.com"
)
```

Then rebuild the container.

## Configuration

### devcontainer.json

| Setting                       | Purpose                                      |
| ----------------------------- | -------------------------------------------- |
| `--ipc=host`                  | Required for Chromium to avoid memory issues |
| `--cap-add=NET_ADMIN,NET_RAW` | Required for firewall rules                  |
| `PLAYWRIGHT_BROWSERS_PATH`    | Ensures browser binaries are found           |

### Dockerfile

| Component       | Notes                                                     |
| --------------- | --------------------------------------------------------- |
| Base image      | `node:22-bookworm` (Debian-based for broad compatibility) |
| Playwright deps | Installed via `npx playwright install-deps chromium`      |
| Browser         | Chromium only (Firefox/WebKit available if needed)        |

## Running with --dangerously-skip-permissions

The container's isolation makes it safer to run:

```bash
claude --dangerously-skip-permissions
```

This skips permission prompts since Claude is sandboxed. However:

- Claude can still access files in your mounted workspace
- Git credentials allow pushing to repos
- Use only with trusted projects

## Troubleshooting

### "Browser not found" errors

```bash
# Verify Chromium is installed
npx playwright install chromium

# Check browser path
echo $PLAYWRIGHT_BROWSERS_PATH
ls ~/.cache/ms-playwright/
```

### Firewall blocking required traffic

```bash
# Check what's being blocked (if logging enabled)
sudo dmesg | grep BLOCKED

```

### Container won't start on Windows

The firewall script requires Linux. On Windows with WSL2 backend, it should work. If not:

1. Comment out `postCreateCommand` in devcontainer.json
2. Run firewall manually after container starts

## License

MIT - Use freely in your projects.
