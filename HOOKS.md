# Claude Auto-Resume Hooks Integration

## Overview

Claude Auto-Resume v2.0 integrates with Claude Code's hook system to provide automatic limit detection, state preservation, and seamless resume functionality. Hooks enable event-driven automation throughout the Claude Code lifecycle.

## Hook Types

### Available Hooks

1. **PreToolUse**: Triggered before any tool execution
2. **PostToolUse**: Triggered after tool execution
3. **Stop**: Triggered when session stops (including limits)
4. **SubagentStop**: Triggered when subagent stops
5. **Notification**: Custom notification hooks
6. **Error**: Error handling hooks
7. **SessionStart**: Session initialization
8. **SessionEnd**: Session cleanup

## Hook Configuration

### Basic Structure

```json
{
  "hooks": {
    "Stop": {
      "enabled": true,
      "commands": [
        {
          "name": "auto_resume_handler",
          "command": "claude-auto-resume --handle-stop",
          "description": "Handle usage limits",
          "conditions": {
            "errorTypes": ["usage_limit"]
          }
        }
      ]
    }
  }
}
```

### Hook Properties

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | boolean | Enable/disable the hook |
| `commands` | array | List of commands to execute |
| `name` | string | Unique identifier for the command |
| `command` | string | Shell command to execute |
| `description` | string | Human-readable description |
| `conditions` | object | Conditions for execution |

## Hook Implementation

### Usage Limit Detection

```json
{
  "Stop": {
    "enabled": true,
    "commands": [
      {
        "name": "usage_limit_detector",
        "command": "claude-auto-resume --handle-stop",
        "conditions": {
          "errorTypes": ["usage_limit", "rate_limit"],
          "autoSchedule": true,
          "preserveContext": true
        }
      }
    ]
  }
}
```

### Context Preservation

```json
{
  "PostToolUse": {
    "enabled": true,
    "commands": [
      {
        "name": "save_context",
        "command": "claude-auto-resume --save-context",
        "conditions": {
          "tools": ["Write", "Edit", "MultiEdit"],
          "throttle": 30
        }
      }
    ]
  }
}
```

### Progress Notifications

```json
{
  "Notification": {
    "enabled": true,
    "commands": [
      {
        "name": "usage_warning",
        "command": "claude-auto-resume --notify-warning",
        "conditions": {
          "thresholds": {
            "usage": 80,
            "tokens": 90
          },
          "frequency": "once_per_session"
        }
      }
    ]
  }
}
```

## Advanced Hook Patterns

### Conditional Execution

```json
{
  "PreToolUse": {
    "commands": [
      {
        "name": "check_limits",
        "command": "claude-auto-resume --check-limits",
        "conditions": {
          "tools": ["*"],
          "skipFor": ["Read", "LS"],
          "onlyIf": {
            "envVar": "CLAUDE_AUTO_RESUME_ENABLED",
            "equals": "true"
          }
        }
      }
    ]
  }
}
```

### Chain Multiple Commands

```json
{
  "Stop": {
    "commands": [
      {
        "name": "save_state",
        "command": "claude-auto-resume --save-session"
      },
      {
        "name": "git_backup",
        "command": "git add -A && git commit -m 'Auto-backup: Claude limit'"
      },
      {
        "name": "schedule_resume",
        "command": "claude-auto-resume --schedule"
      }
    ]
  }
}
```

### Error Recovery

```json
{
  "Error": {
    "commands": [
      {
        "name": "error_handler",
        "command": "claude-auto-resume --handle-error",
        "conditions": {
          "retryable": true,
          "maxRetries": 3,
          "backoff": "exponential"
        }
      }
    ]
  }
}
```

## Hook Command Reference

### Available Commands

| Command | Description |
|---------|-------------|
| `--handle-stop` | Process stop events and detect limits |
| `--save-context` | Save current working context |
| `--save-session` | Save complete session state |
| `--check-limits` | Check usage limits proactively |
| `--notify-warning` | Send usage warning notification |
| `--notify-resume` | Send resume ready notification |
| `--handle-error` | Process and recover from errors |
| `--load-state` | Load previous session state |
| `--cleanup` | Clean up old state files |
| `--schedule` | Schedule automatic resume |

### Command Options

```bash
# Save context with metadata
claude-auto-resume --save-context --metadata "checkpoint before complex operation"

# Handle stop with custom behavior
claude-auto-resume --handle-stop --strategy wait_and_retry

# Check limits with threshold
claude-auto-resume --check-limits --threshold 90

# Schedule resume with delay
claude-auto-resume --schedule --delay 300
```

## Custom Hooks

### Creating Custom Hooks

1. Create hook script:
```bash
#!/bin/bash
# ~/.config/claude-auto-resume/hooks.d/custom-backup.sh

# Save current work
git add -A
git commit -m "Auto-backup: $(date +%Y-%m-%d_%H:%M:%S)"

# Notify
claude-auto-resume --notify "Work backed up successfully"
```

2. Register in configuration:
```json
{
  "customHooks": {
    "backup_on_limit": {
      "trigger": "Stop",
      "command": "~/.config/claude-auto-resume/hooks.d/custom-backup.sh",
      "enabled": true
    }
  }
}
```

### Hook Variables

Available environment variables in hook context:

| Variable | Description |
|----------|-------------|
| `CLAUDE_SESSION_ID` | Current session identifier |
| `CLAUDE_CONVERSATION_ID` | Current conversation ID |
| `CLAUDE_ERROR_TYPE` | Type of error (if applicable) |
| `CLAUDE_TOOL_NAME` | Name of tool being used |
| `CLAUDE_TIMESTAMP` | Event timestamp |
| `CLAUDE_USAGE_PERCENT` | Current usage percentage |

## Integration Examples

### Development Workflow

```json
{
  "hooks": {
    "PreToolUse": {
      "commands": [
        {
          "name": "lint_check",
          "command": "npm run lint",
          "conditions": {
            "tools": ["Write", "Edit"],
            "filePatterns": ["*.js", "*.ts"]
          }
        }
      ]
    },
    "PostToolUse": {
      "commands": [
        {
          "name": "test_runner",
          "command": "npm test",
          "conditions": {
            "tools": ["Write", "Edit"],
            "runTests": true
          }
        }
      ]
    }
  }
}
```

### CI/CD Integration

```json
{
  "hooks": {
    "Stop": {
      "commands": [
        {
          "name": "ci_handler",
          "command": "claude-auto-resume --ci-mode",
          "conditions": {
            "environment": "CI",
            "failOnLimit": true
          }
        }
      ]
    }
  }
}
```

### Team Collaboration

```json
{
  "hooks": {
    "SessionEnd": {
      "commands": [
        {
          "name": "team_notify",
          "command": "slack-notify 'Claude session ended: ${CLAUDE_SESSION_ID}'",
          "conditions": {
            "notifyTeam": true
          }
        }
      ]
    }
  }
}
```

## Best Practices

### 1. Performance

- Use `skipFor` to exclude lightweight operations
- Throttle frequent hooks
- Run heavy operations asynchronously

### 2. Error Handling

- Always handle command failures gracefully
- Use retry logic for network operations
- Log errors for debugging

### 3. Security

- Validate all inputs
- Use absolute paths for commands
- Restrict file system access

### 4. Maintainability

- Use descriptive hook names
- Document custom hooks
- Version control hook configurations

## Troubleshooting

### Hooks Not Firing

```bash
# Check hook configuration
claude-auto-resume --validate-hooks

# Test specific hook
claude-auto-resume --test-hook Stop

# Enable debug logging
export CLAUDE_AUTO_RESUME_DEBUG=true
```

### Command Failures

```bash
# Check command permissions
ls -la ~/.config/claude-auto-resume/hooks.d/

# Test command directly
claude-auto-resume --handle-stop --debug

# View hook logs
tail -f ~/.local/share/claude-auto-resume/hooks.log
```

### Performance Issues

```bash
# Profile hook execution
claude-auto-resume --profile-hooks

# Disable specific hooks
claude-auto-resume --disable-hook PreToolUse

# Run in minimal mode
claude-auto-resume --no-hooks
```

## Hook Development

### Testing Hooks

```bash
# Test hook configuration
claude-auto-resume --test-hooks

# Simulate hook trigger
claude-auto-resume --simulate Stop --error-type usage_limit

# Dry run with hooks
claude-auto-resume --dry-run --verbose
```

### Debugging Hooks

```bash
# Enable hook debugging
export CLAUDE_HOOK_DEBUG=true

# Trace hook execution
claude-auto-resume --trace-hooks

# Hook execution report
claude-auto-resume --hook-report
```

## Migration Guide

### From Manual Scripts

1. Identify trigger points
2. Create hook configuration
3. Test with `--dry-run`
4. Enable incrementally

### From Other Tools

1. Map existing automation to hooks
2. Convert scripts to hook commands
3. Preserve existing functionality
4. Add Claude-specific features