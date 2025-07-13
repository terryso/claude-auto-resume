# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a shell script utility called `claude-auto-resume.sh` that automatically resumes Claude CLI tasks after usage limits are lifted. The script monitors for Claude usage limits, waits for the restriction period to end, and then automatically continues the task.

**⚠️ SECURITY NOTE**: This script uses `--dangerously-skip-permissions` flag, which bypasses all safety prompts and allows Claude to execute commands automatically without user confirmation. Use only in trusted environments.

## Installation

### Method 1: Using Makefile (Recommended)
```bash
# Install globally
sudo make install

# Install to custom location
sudo make install PREFIX=/opt/local

# Uninstall
sudo make uninstall
```

### Method 2: Manual Installation
```bash
# Copy to system path
sudo cp claude-auto-resume.sh /usr/local/bin/claude-auto-resume
sudo chmod +x /usr/local/bin/claude-auto-resume

# Or create symlink
sudo ln -s $(pwd)/claude-auto-resume.sh /usr/local/bin/claude-auto-resume
```

### Method 3: Direct Usage
```bash
# Make executable and run directly
chmod +x claude-auto-resume.sh
./claude-auto-resume.sh
```

## Key Commands

- `claude-auto-resume` - Start new session with default prompt "continue"
- `claude-auto-resume "custom prompt"` - Start new session with custom prompt
- `claude-auto-resume -p "prompt"` - Start new session with custom prompt using flag
- `claude-auto-resume -c "continue task"` - Continue previous conversation with custom prompt
- `claude-auto-resume -c -p "prompt"` - Continue previous conversation with custom prompt using flag
- `claude-auto-resume --help` - Show help and usage examples
- `./claude-auto-resume.sh` - Execute the script locally
- `chmod +x claude-auto-resume.sh` - Make the script executable
- `make test` - Test script syntax

## Architecture

The project follows a single-file architecture:
- **claude-auto-resume.sh**: Main script containing all logic
- **Makefile**: Simple installation/uninstallation script
- **docs/**: Documentation including PRD, architecture, and user stories

### Core Logic Flow
1. Parses command line arguments for custom prompt and session type (new vs continue)
2. Runs `claude -p 'check'` command
3. Parses output for usage limit messages with format: `Claude AI usage limit reached|<timestamp>`
4. Calculates wait time from timestamp
5. Displays countdown timer and waits
6. Automatically runs either:
   - `claude --dangerously-skip-permissions -p '<custom-prompt>'` (new session, default)
   - `claude -c --dangerously-skip-permissions -p '<custom-prompt>'` (continue conversation with -c flag)

### Dependencies
- Standard Unix utilities: `grep`, `date`, `sleep`, `awk`
- `claude` CLI tool (must be installed and in PATH)
- Cross-platform compatibility (Linux/macOS date command differences handled)

## Network Configuration

### Proxy Settings
If you're using a VPN or proxy (especially common in China), ensure the TypeScript version can access the same proxy settings as your shell:

```bash
# Set proxy environment variables before running
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890

# Then run claude-auto-resume
claude-auto-resume --test-mode 5 -p "test message"
```

**Note**: The shell script version inherits terminal proxy settings automatically, but the TypeScript version requires explicit environment variable configuration.

## Error Handling

The script includes robust error handling for:
- Invalid timestamp extraction (exit code 2)
- Claude CLI execution failures (exit code 1)
- Resume command failures (exit code 4)
- Cross-platform date formatting differences
- Network connectivity issues (proxy configuration required)

## Testing

Manual testing is used as specified in the PRD. The script is designed to be deterministic and handles various output scenarios from the Claude CLI.