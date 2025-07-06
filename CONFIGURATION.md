# Claude Auto-Resume Configuration Guide

## Overview

Claude Auto-Resume v2.0 supports comprehensive configuration through JSON files, environment variables, and command-line options. This guide covers all configuration aspects.

## Configuration Files

### Location

Configuration files are stored in:
- **Default**: `~/.config/claude-auto-resume/`
- **Custom**: Use `--config` flag to specify alternate location
- **Hierarchy**: Command-line > Environment > User Config > Default Config

### Main Configuration File

The main configuration file is `config.json`:

```json
{
  "general": {
    "default_prompt": "continue",
    "session_type": "default",
    "auto_resume": true
  },
  "limits": {
    "max_retries": 3,
    "retry_delay": 10
  },
  "notifications": {
    "enabled": true,
    "method": "auto"
  }
}
```

## Configuration Sections

### General Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `default_prompt` | string | "continue" | Default prompt when resuming |
| `session_type` | string | "default" | Session type: default, extended, multimodal |
| `auto_resume` | boolean | true | Automatically resume after limits |
| `extended_thinking` | boolean | false | Enable extended thinking preservation |
| `preserve_multimodal` | boolean | true | Preserve multimodal context |
| `conversation_picker` | boolean | true | Show conversation picker when resuming |

### Limit Handling

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `max_retries` | integer | 3 | Maximum retry attempts |
| `retry_delay` | integer | 10 | Delay between retries (seconds) |
| `wait_buffer` | integer | 10 | Additional wait time after limit |
| `check_interval` | integer | 60 | Interval for limit checks |
| `warning_threshold` | integer | 80 | Usage percentage for warnings |

### Notifications

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabled` | boolean | true | Enable desktop notifications |
| `method` | string | "auto" | Notification method: auto, notify-send, osascript, terminal-notifier |
| `sound` | boolean | true | Play sound with notifications |
| `periodic_updates` | boolean | true | Send periodic status updates |
| `update_interval` | integer | 300 | Interval for updates (seconds) |

### Logging

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `log_level` | string | "info" | Log level: error, warn, info, debug |
| `log_file` | string | "auto" | Log file location or "auto" |
| `max_log_size` | string | "10M" | Maximum log file size |
| `log_rotation` | integer | 5 | Number of log files to keep |
| `debug_mode` | boolean | false | Enable debug mode |
| `verbose` | boolean | false | Enable verbose output |

### UI Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `colors` | boolean | true | Enable colored output |
| `progress_bar` | boolean | true | Show progress bar |
| `countdown_format` | string | "detailed" | Countdown format: simple, detailed |
| `quiet_mode` | boolean | false | Suppress non-error output |
| `unicode_symbols` | boolean | true | Use Unicode symbols |

## Environment Variables

Override configuration with environment variables:

```bash
# General settings
export CLAUDE_AUTO_RESUME_PROMPT="continue working on the task"
export CLAUDE_AUTO_RESUME_SESSION_TYPE="extended"
export CLAUDE_AUTO_RESUME_AUTO=true

# Limit settings
export CLAUDE_AUTO_RESUME_MAX_RETRIES=5
export CLAUDE_AUTO_RESUME_RETRY_DELAY=15

# Notification settings
export CLAUDE_AUTO_RESUME_NOTIFICATIONS=true
export CLAUDE_AUTO_RESUME_NOTIFICATION_METHOD="notify-send"

# Logging
export CLAUDE_AUTO_RESUME_LOG_LEVEL="debug"
export CLAUDE_AUTO_RESUME_VERBOSE=true
```

## Command-Line Options

Command-line options override all other settings:

```bash
# Override prompt
claude-auto-resume --prompt "implement the new feature"

# Override session type
claude-auto-resume --session-type extended

# Override retry settings
claude-auto-resume --max-retries 10 --retry-delay 30

# Disable features
claude-auto-resume --no-notifications --no-hooks
```

## Presets

Use predefined configuration presets:

### Available Presets

1. **default**: Standard configuration
2. **minimal**: Minimal output, no UI enhancements
3. **ci_cd**: Optimized for CI/CD environments
4. **development**: Enhanced debugging and logging
5. **production**: Stable, minimal logging
6. **quiet**: Suppress all non-error output
7. **verbose**: Maximum verbosity

### Using Presets

```bash
# In config.json
{
  "presets": {
    "current": "development"
  }
}

# Via command line
claude-auto-resume --preset production
```

### Creating Custom Presets

Create custom preset files in `~/.config/claude-auto-resume/presets/`:

```json
// ~/.config/claude-auto-resume/presets/custom.json
{
  "name": "custom",
  "description": "My custom preset",
  "config": {
    "general": {
      "default_prompt": "continue with custom settings"
    },
    "ui": {
      "colors": false,
      "progress_bar": false
    }
  }
}
```

## Advanced Configuration

### Error Pattern Matching

Customize error detection patterns:

```json
{
  "advanced": {
    "error_patterns": {
      "usage_limit": [
        "usage limit reached",
        "daily limit exceeded",
        "quota exhausted"
      ],
      "rate_limit": [
        "rate limit",
        "too many requests",
        "slow down"
      ]
    }
  }
}
```

### Resume Strategies

Configure resume strategies per error type:

```json
{
  "advanced": {
    "resume_strategies": {
      "usage_limit": "wait_and_retry",
      "rate_limit": "exponential_backoff",
      "token_limit": "truncate_context",
      "unknown": "prompt_user"
    }
  }
}
```

### Workflow-Specific Settings

Configure behavior for different workflows:

```json
{
  "workflows": {
    "extended_thinking": {
      "preserve_chain": true,
      "checkpoint_interval": 300,
      "auto_save": true
    },
    "multimodal": {
      "preserve_images": true,
      "image_cache": true,
      "max_image_size": "10M"
    }
  }
}
```

## Integration Settings

### CI/CD Integration

```json
{
  "integration": {
    "ci_cd": {
      "enabled": true,
      "fail_on_limit": false,
      "wait_timeout": 3600,
      "exit_codes": {
        "success": 0,
        "limit_reached": 75,
        "error": 1
      }
    }
  }
}
```

### Git Integration

```json
{
  "integration": {
    "git": {
      "auto_commit": true,
      "commit_message": "Auto-save: Claude limit reached",
      "branch_prefix": "claude-auto-save",
      "push_on_limit": false
    }
  }
}
```

## Configuration Validation

Validate configuration files:

```bash
# Validate current configuration
claude-auto-resume --validate-config

# Validate specific file
claude-auto-resume --validate-config ./custom-config.json

# Check configuration without running
claude-auto-resume --dry-run --verbose
```

## Best Practices

1. **Version Control**: Keep configuration files in version control
2. **Environment-Specific**: Use different configs for dev/prod
3. **Secrets**: Never store sensitive data in config files
4. **Backup**: Backup configurations before major changes
5. **Documentation**: Document custom configurations

## Troubleshooting

### Configuration Not Loading

```bash
# Check configuration paths
claude-auto-resume --debug --show-config

# Verify file permissions
ls -la ~/.config/claude-auto-resume/

# Test with minimal config
claude-auto-resume --config /dev/null --debug
```

### Invalid Configuration

```bash
# Validate JSON syntax
jq . ~/.config/claude-auto-resume/config.json

# Check for common issues
claude-auto-resume --validate-config --verbose
```

## Migration from v1.x

To migrate from v1.x configurations:

1. Run migration tool: `claude-auto-resume --migrate-config`
2. Review generated configuration
3. Update deprecated settings
4. Test with `--dry-run`

## Examples

### Minimal Configuration

```json
{
  "general": {
    "default_prompt": "continue"
  },
  "ui": {
    "quiet_mode": true
  }
}
```

### Development Configuration

```json
{
  "general": {
    "default_prompt": "continue development"
  },
  "logging": {
    "log_level": "debug",
    "verbose": true
  },
  "notifications": {
    "enabled": true,
    "method": "terminal-notifier"
  }
}
```

### CI/CD Configuration

```json
{
  "general": {
    "auto_resume": true
  },
  "ui": {
    "colors": false,
    "progress_bar": false,
    "quiet_mode": true
  },
  "integration": {
    "ci_cd": {
      "enabled": true,
      "fail_on_limit": true
    }
  }
}
```