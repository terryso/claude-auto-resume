# Claude Auto-Resume Troubleshooting Guide

## Common Issues and Solutions

### Installation Issues

#### Script Not Found

**Problem**: `claude-auto-resume: command not found`

**Solutions**:
1. Check installation path:
   ```bash
   which claude-auto-resume
   ls -la /usr/local/bin/claude-auto-resume
   ```

2. Add to PATH:
   ```bash
   export PATH="$PATH:/usr/local/bin"
   echo 'export PATH="$PATH:/usr/local/bin"' >> ~/.bashrc
   source ~/.bashrc
   ```

3. Verify permissions:
   ```bash
   chmod +x /usr/local/bin/claude-auto-resume
   ```

#### Permission Denied

**Problem**: `Permission denied` when installing

**Solutions**:
1. Use sudo for system directories:
   ```bash
   sudo make install
   ```

2. Install to user directory:
   ```bash
   make install PREFIX=$HOME/.local
   ```

3. Fix ownership:
   ```bash
   sudo chown $USER:$USER /usr/local/bin/claude-auto-resume
   ```

### Configuration Issues

#### Config Not Loading

**Problem**: Custom configuration not being applied

**Solutions**:
1. Check config location:
   ```bash
   claude-auto-resume --show-config
   ```

2. Validate JSON syntax:
   ```bash
   jq . ~/.config/claude-auto-resume/config.json
   ```

3. Check file permissions:
   ```bash
   ls -la ~/.config/claude-auto-resume/
   ```

4. Test with explicit config:
   ```bash
   claude-auto-resume --config ./my-config.json --debug
   ```

#### Invalid Configuration

**Problem**: `Invalid configuration file`

**Solutions**:
1. Validate configuration:
   ```bash
   claude-auto-resume --validate-config
   ```

2. Check for syntax errors:
   ```bash
   python -m json.tool < ~/.config/claude-auto-resume/config.json
   ```

3. Use default config:
   ```bash
   cp claude-resume-config.json ~/.config/claude-auto-resume/config.json
   ```

### Runtime Issues

#### Claude Command Not Found

**Problem**: `claude: command not found`

**Solutions**:
1. Install Claude CLI:
   ```bash
   # Check Claude documentation for installation
   ```

2. Verify Claude installation:
   ```bash
   which claude
   claude --version
   ```

3. Add Claude to PATH:
   ```bash
   export PATH="$PATH:/path/to/claude"
   ```

#### Usage Limit Not Detected

**Problem**: Script doesn't detect usage limits

**Solutions**:
1. Check error patterns:
   ```bash
   claude-auto-resume --test-patterns
   ```

2. Update error patterns in config:
   ```json
   {
     "advanced": {
       "error_patterns": {
         "usage_limit": ["your error message here"]
       }
     }
   }
   ```

3. Enable debug mode:
   ```bash
   claude-auto-resume --debug
   ```

#### Resume Not Working

**Problem**: Script doesn't resume after waiting

**Solutions**:
1. Check saved state:
   ```bash
   cat ~/.cache/claude-auto-resume/resume_state.json
   ```

2. Test resume manually:
   ```bash
   claude --resume
   ```

3. Clear cache and retry:
   ```bash
   rm -rf ~/.cache/claude-auto-resume/*
   ```

### Hook Issues

#### Hooks Not Triggering

**Problem**: Configured hooks don't execute

**Solutions**:
1. Validate hooks configuration:
   ```bash
   claude-auto-resume --validate-hooks
   ```

2. Test hooks directly:
   ```bash
   claude-auto-resume --test-hook Stop
   ```

3. Check Claude Code version:
   ```bash
   claude --version
   # Ensure version supports hooks
   ```

4. Enable hook debugging:
   ```bash
   export CLAUDE_HOOK_DEBUG=true
   claude-auto-resume --trace-hooks
   ```

#### Hook Command Failures

**Problem**: Hook commands fail to execute

**Solutions**:
1. Test command directly:
   ```bash
   # Run the exact command from hook config
   claude-auto-resume --handle-stop
   ```

2. Check permissions:
   ```bash
   ls -la ~/.config/claude-auto-resume/hooks.d/
   ```

3. View hook logs:
   ```bash
   tail -f ~/.local/share/claude-auto-resume/hooks.log
   ```

### Notification Issues

#### No Desktop Notifications

**Problem**: Notifications not appearing

**Solutions**:
1. Check notification tools:
   ```bash
   # Linux
   which notify-send
   
   # macOS
   which osascript
   which terminal-notifier
   ```

2. Test notifications:
   ```bash
   claude-auto-resume --test-notification
   ```

3. Install notification tool:
   ```bash
   # Linux
   sudo apt-get install libnotify-bin
   
   # macOS
   brew install terminal-notifier
   ```

4. Disable if not needed:
   ```bash
   claude-auto-resume --no-notifications
   ```

### Performance Issues

#### Slow Startup

**Problem**: Script takes long to start

**Solutions**:
1. Profile startup:
   ```bash
   time claude-auto-resume --version
   ```

2. Disable unnecessary features:
   ```bash
   claude-auto-resume --no-hooks --no-notifications
   ```

3. Use minimal config:
   ```bash
   claude-auto-resume --preset minimal
   ```

#### High Memory Usage

**Problem**: Script uses too much memory

**Solutions**:
1. Limit log size:
   ```json
   {
     "logging": {
       "max_log_size": "5M",
       "log_rotation": 3
     }
   }
   ```

2. Clear old cache:
   ```bash
   claude-auto-resume --cleanup --age 7
   ```

3. Disable state compression:
   ```json
   {
     "advanced": {
       "performance": {
         "state_compression": false
       }
     }
   }
   ```

## Debugging Techniques

### Enable Debug Mode

```bash
# Via command line
claude-auto-resume --debug --verbose

# Via environment
export CLAUDE_AUTO_RESUME_DEBUG=true
export CLAUDE_AUTO_RESUME_VERBOSE=true

# Via config
{
  "logging": {
    "debug_mode": true,
    "verbose": true,
    "log_level": "debug"
  }
}
```

### Trace Execution

```bash
# Bash trace mode
bash -x claude-auto-resume

# Detailed trace
claude-auto-resume --trace

# Specific component trace
claude-auto-resume --trace-component hooks
```

### Log Analysis

```bash
# View logs
tail -f ~/.local/share/claude-auto-resume/auto-resume.log

# Search for errors
grep ERROR ~/.local/share/claude-auto-resume/auto-resume.log

# Filter by date
grep "2024-01-15" ~/.local/share/claude-auto-resume/auto-resume.log
```

## Error Messages

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 1 | General error | Check logs for details |
| 2 | Invalid timestamp | Update error patterns |
| 3 | Configuration error | Validate config file |
| 4 | Resume failed | Check Claude CLI |
| 10 | Missing dependency | Install requirements |
| 20 | Permission denied | Fix file permissions |
| 30 | Network error | Check connectivity |
| 75 | CI/CD limit reached | Expected in CI mode |

### Error Message Reference

#### "Failed to extract resume timestamp"
- Check Claude output format
- Update error patterns
- Enable debug mode to see raw output

#### "Configuration file not found"
- Run installer to create default config
- Specify config path explicitly
- Check file permissions

#### "Hook execution failed"
- Test hook command directly
- Check command permissions
- Review hook logs

## Platform-Specific Issues

### macOS

#### Date Command Differences
```bash
# Fix in config
{
  "advanced": {
    "date_command": "gdate"
  }
}

# Or install GNU date
brew install coreutils
```

#### Notification Permissions
1. System Preferences > Notifications
2. Allow Terminal/iTerm notifications
3. Test with `osascript`

### Linux

#### Missing Dependencies
```bash
# Debian/Ubuntu
sudo apt-get install jq libnotify-bin

# Fedora/RHEL
sudo dnf install jq libnotify

# Arch
sudo pacman -S jq libnotify
```

#### SELinux Issues
```bash
# Check SELinux status
getenforce

# Allow script execution
sudo chcon -t bin_t /usr/local/bin/claude-auto-resume
```

### Windows (WSL)

#### Path Issues
```bash
# Use Unix paths
claude-auto-resume --config /mnt/c/Users/name/config.json

# Fix line endings
dos2unix claude-auto-resume.sh
```

#### Notification Workarounds
```bash
# Use Windows notifications via PowerShell
alias notify-send='powershell.exe -Command "New-BurntToastNotification -Text"'
```

## Getting Help

### Diagnostic Information

Collect diagnostic info for bug reports:
```bash
claude-auto-resume --diagnostic > diagnostic.txt
```

### Support Channels

1. **GitHub Issues**: Report bugs and request features
2. **Documentation**: Check docs for updates
3. **Community**: Join discussions

### Reporting Bugs

Include:
1. Version: `claude-auto-resume --version`
2. Config: `claude-auto-resume --show-config`
3. Logs: Recent error logs
4. Steps to reproduce
5. Expected vs actual behavior

## Recovery Procedures

### Reset to Defaults

```bash
# Backup current config
cp -r ~/.config/claude-auto-resume ~/.config/claude-auto-resume.backup

# Reset configuration
rm -rf ~/.config/claude-auto-resume
rm -rf ~/.cache/claude-auto-resume
rm -rf ~/.local/share/claude-auto-resume

# Reinstall
./install.sh
```

### Emergency Mode

```bash
# Run without any configuration
claude-auto-resume --no-config --no-hooks --no-state

# Minimal operation
claude-auto-resume --emergency-mode
```

### Manual Resume

If auto-resume fails:
```bash
# Get conversation ID from logs
grep "conversation_id" ~/.local/share/claude-auto-resume/auto-resume.log

# Resume manually
claude --resume <conversation_id>
```