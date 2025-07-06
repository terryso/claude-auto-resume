# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an enhanced shell script utility called `claude-auto-resume.sh` that automatically resumes Claude CLI tasks after usage limits are lifted. Version 2.0 includes modern Claude Code integration with hooks, memory system, advanced workflows, and comprehensive configuration options.

## Auto-Resume Memory Context

### Current Resume State
When encountering usage limits, the script automatically:
- Saves the current conversation ID and context
- Preserves session type (default/extended/multimodal)
- Maintains task hierarchy and subtask progress
- Stores retry counts and error history

### Resume Behavior
- **Default**: Automatically resume with saved context when limit lifts
- **Extended Thinking**: Preserves thinking chain and checkpoints
- **Multimodal**: Caches images and maintains visual context
- **Complex Tasks**: Tracks incomplete subtasks and dependencies

### Configuration
- Config directory: `~/.config/claude-auto-resume/`
- Hooks config: `claude-resume-hooks.json`
- Default config: `claude-resume-config.json`
- State preservation: `~/.cache/claude-auto-resume/resume_state.json`

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

## Error Handling

The script includes robust error handling for:
- Invalid timestamp extraction (exit code 2)
- Claude CLI execution failures (exit code 1)
- Resume command failures (exit code 4)
- Cross-platform date formatting differences

## Testing

Manual testing is used as specified in the PRD. The script is designed to be deterministic and handles various output scenarios from the Claude CLI.