# Claude Auto-Resume v2.0

🚀 **Enhanced with Modern Claude Code Integration** - A sophisticated shell script utility that automatically resumes Claude Code tasks after usage limits are lifted. Version 2.0 features hooks integration, memory system support, advanced workflows, and comprehensive configuration options.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS-lightgrey.svg)

## ✨ What's New in v2.0

- **🪝 Hooks Integration**: Automatic limit detection and resume scheduling via Claude Code hooks
- **🧠 Memory System**: Persistent state management and context preservation
- **🎯 Modern CLI**: Support for `--resume`, `--extended-thinking`, and conversation IDs
- **⚙️ Configuration System**: JSON-based configuration with presets and customization
- **🎨 Enhanced UI**: Progress bars, colored output, and desktop notifications
- **🔄 Advanced Workflows**: Support for extended thinking and multimodal sessions
- **🛠️ Better Error Handling**: Smart retry logic and comprehensive error recovery
- **📊 Logging & Debugging**: Detailed logs, debug mode, and diagnostic tools

## 🎯 Use Cases

This enhanced script is essential for Claude Code power users:

1. **Automatic Limit Handling**: Seamlessly resume work when hitting usage limits
2. **Complex Task Management**: Preserve context for multi-step operations
3. **CI/CD Integration**: Automated handling of limits in pipelines
4. **Team Collaboration**: Shared configurations and standardized workflows
5. **Extended Sessions**: Maintain state across long-running tasks

## 🚀 Quick Start

```bash
# Install with configuration
sudo make install config

# Basic usage
claude-auto-resume

# Resume specific conversation
claude-auto-resume --resume

# Extended thinking mode
claude-auto-resume --extended-thinking

# Custom configuration
claude-auto-resume --config ./my-config.json
```

## 📦 Installation

### Method 1: Automated Installation (Recommended)

```bash
# Run the installer
sudo ./install.sh

# Or use make
sudo make install config

# For development
make dev-install
```

### Method 2: Manual Installation

```bash
# Copy files
sudo cp claude-auto-resume.sh /usr/local/bin/claude-auto-resume
sudo chmod +x /usr/local/bin/claude-auto-resume

# Install configurations
mkdir -p ~/.config/claude-auto-resume
cp claude-resume-*.json ~/.config/claude-auto-resume/
```

### Method 3: Package Managers (Coming Soon)

```bash
# Homebrew (macOS)
brew install claude-auto-resume

# apt (Debian/Ubuntu)
sudo apt install claude-auto-resume
```

## 🎮 Usage

### Basic Commands

```bash
# Start new session with default prompt
claude-auto-resume

# Custom prompt
claude-auto-resume "implement the new feature"

# Resume last conversation
claude-auto-resume --resume

# Resume specific conversation
claude-auto-resume --resume conv_abc123

# Extended thinking mode
claude-auto-resume --extended-thinking --prompt "solve complex problem"
```

### Advanced Options

```bash
# Custom configuration
claude-auto-resume --config ./custom-config.json

# CI/CD mode
claude-auto-resume --preset ci_cd --no-notifications

# Debug mode
claude-auto-resume --debug --verbose

# Dry run
claude-auto-resume --dry-run --show-config
```

### Configuration

```bash
# Edit configuration
nano ~/.config/claude-auto-resume/config.json

# Test configuration
claude-auto-resume --validate-config

# Use presets
claude-auto-resume --preset development
```

## 🪝 Hooks Integration

Claude Auto-Resume integrates with Claude Code's hook system:

```json
{
  "hooks": {
    "Stop": {
      "commands": [{
        "name": "auto_resume",
        "command": "claude-auto-resume --handle-stop"
      }]
    }
  }
}
```

See [HOOKS.md](HOOKS.md) for detailed hook configuration.

## ⚙️ Configuration

### Basic Configuration

```json
{
  "general": {
    "default_prompt": "continue",
    "session_type": "default",
    "auto_resume": true
  },
  "notifications": {
    "enabled": true,
    "method": "auto"
  }
}
```

### Environment Variables

```bash
export CLAUDE_AUTO_RESUME_PROMPT="custom prompt"
export CLAUDE_AUTO_RESUME_LOG_LEVEL="debug"
export CLAUDE_AUTO_RESUME_NO_HOOKS=true
```

See [CONFIGURATION.md](CONFIGURATION.md) for complete configuration guide.

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌────────────┐
│  Claude Code    │────▶│ Auto-Resume  │────▶│   Hooks    │
│     CLI         │     │    Script    │     │   System   │
└─────────────────┘     └──────────────┘     └────────────┘
         │                      │                     │
         ▼                      ▼                     ▼
┌─────────────────┐     ┌──────────────┐     ┌────────────┐
│ Error Detection │     │    State     │     │  Config    │
│   & Parsing     │     │ Persistence  │     │   Files    │
└─────────────────┘     └──────────────┘     └────────────┘
```

## 🛠️ Development

### Testing

```bash
# Run test suite
make test-full

# Specific tests
./test-suite.sh test_hook_configuration

# Lint code
make lint
```

### Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Make changes and test
4. Commit (`git commit -m 'Add amazing feature'`)
5. Push (`git push origin feature/amazing`)
6. Create Pull Request

### Building

```bash
# Prepare release
make release

# Check dependencies
make check-deps

# Format code
make format
```

## 📚 Documentation

- [Configuration Guide](CONFIGURATION.md) - Detailed configuration options
- [Hooks Integration](HOOKS.md) - Hook system documentation
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues and solutions
- [Architecture](docs/architecture.md) - Technical architecture
- [Claude Code Memory](CLAUDE.md) - Memory system integration

## 🔧 Troubleshooting

### Common Issues

**Script not found**
```bash
export PATH="$PATH:/usr/local/bin"
source ~/.bashrc
```

**Hooks not triggering**
```bash
claude-auto-resume --validate-hooks
claude-auto-resume --test-hook Stop
```

**Configuration not loading**
```bash
claude-auto-resume --show-config
claude-auto-resume --validate-config
```

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for comprehensive troubleshooting.

## 📋 Requirements

- **Claude Code CLI**: Latest version with hooks support
- **Bash**: Version 4.0 or higher
- **Standard Unix Tools**: grep, awk, sed, date
- **Optional**: jq (JSON processing), notification tools

## 🔄 Migration from v1.x

```bash
# Backup old configuration
cp ~/.claude-auto-resume.conf ~/.claude-auto-resume.conf.backup

# Install v2.0
sudo make install config

# Migrate settings (if needed)
claude-auto-resume --migrate-config
```

## 📊 Performance

- **Startup Time**: < 0.1s
- **Memory Usage**: < 10MB
- **CPU Usage**: Negligible
- **State File Size**: < 1KB per session

## 🔒 Security

- No network calls except through Claude CLI
- Configuration files use standard permissions
- No sensitive data storage
- Audit trail via logs

## 📝 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Support

- 📖 [Documentation](https://github.com/your-repo/claude-auto-resume/wiki)
- 🐛 [Issue Tracker](https://github.com/your-repo/claude-auto-resume/issues)
- 💬 [Discussions](https://github.com/your-repo/claude-auto-resume/discussions)
- 📧 [Email Support](mailto:support@example.com)

## 🙏 Acknowledgments

- Claude Code team for the amazing CLI tool
- Contributors and testers
- Open source community

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=your-repo/claude-auto-resume&type=Date)](https://star-history.com/#your-repo/claude-auto-resume&Date)

---

**Note**: This tool requires Claude Code CLI v2.0+ with hooks support. The script adapts to Claude Code output format changes automatically.