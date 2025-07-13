# Claude Auto-Resume

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/terryso/claude-auto-resume.svg)](https://github.com/terryso/claude-auto-resume/stargazers)
[![NPM Version](https://badge.fury.io/js/claude-auto-resume.svg)](https://www.npmjs.com/package/claude-auto-resume)
[![NPM Downloads](https://img.shields.io/npm/dm/claude-auto-resume.svg)](https://www.npmjs.com/package/claude-auto-resume)
[![Node Version](https://img.shields.io/node/v/claude-auto-resume?style=flat-square&color=brightgreen)](https://nodejs.org/)

[![GitHub License](https://img.shields.io/github/license/terryso/claude-auto-resume?style=flat-square)](https://github.com/terryso/claude-auto-resume/blob/main/LICENSE)
[![Release](https://img.shields.io/github/actions/workflow/status/terryso/claude-auto-resume/release.yml?style=flat-square&label=Release)](https://github.com/terryso/claude-auto-resume/actions/workflows/release.yml)
[![DeepWiki](https://img.shields.io/badge/DeepWiki-项目文档-blue)](https://deepwiki.com/terryso/claude-auto-resume)

</div>

🚀 **Now Available as a TypeScript CLI Tool!** - Enhanced reliability, better error handling, and modern Node.js distribution.

A TypeScript CLI utility that automatically resumes Claude CLI tasks when usage limits are lifted, or executes custom shell commands after waiting periods. It detects Claude usage restrictions, waits intelligently, and resumes task execution automatically.

## 🆕 What's New in v2.0 (TypeScript Edition)

- **✨ Enhanced User Experience**: Better error messages, progress indicators, and logging
- **🛠️ Modern Architecture**: TypeScript codebase with comprehensive testing (92%+ coverage)
- **📦 Easy Installation**: Available via npm - install globally or use with npx
- **🔧 Configuration Support**: Optional configuration files and enhanced environment variables
- **🐛 Better Debugging**: Debug mode with comprehensive system diagnostics
- **⚡ Performance**: <65ms startup time with enhanced functionality
- **🔄 Migration Path**: Seamless upgrade from shell script version

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/F1F11HO935)

## ⚠️ SECURITY WARNING

**This script uses `--dangerously-skip-permissions` flag when executing Claude commands and can execute arbitrary shell commands**, which means:

- **Claude Code will execute tasks WITHOUT asking for permission**
- **Custom shell commands will execute WITHOUT user confirmation**
- **File operations, system commands, and code changes will run automatically**
- **Use ONLY in trusted environments and with trusted prompts/commands**
- **Review your prompt or command carefully before running this script**

**Recommended Usage:**
- Use in isolated development environments
- Avoid on production systems or with sensitive data
- Be specific with your prompts to limit scope of actions
- Consider the potential impact of automated execution

## Use Cases

This script is particularly useful when using Claude Code for development in the following scenarios:

1. **Task Interrupted by Usage Limits**: When your Claude Code shows `Claude usage limit reached.` but your task is not yet completely finished
2. **Automatic Task Resumption**: Simply run `claude-auto-resume` in your project's root directory, and when the usage limit is lifted, the script will automatically let Claude Code continue executing your previously unfinished task
3. **Custom Command Execution**: Execute any shell command after waiting for usage limits, useful for restarting services, running builds, or processing data

## Features

### Core Functionality
- 🔄 Automatically detects Claude CLI usage limits
- ⏰ Smart waiting with enhanced countdown display and progress indicators
- 🚀 Automatic task resumption with continue conversation support
- 🔧 Custom command execution after wait periods
- 🧪 Built-in test mode for development and validation

### Enhanced TypeScript Features
- 📊 Comprehensive logging with configurable verbosity levels (quiet, normal, verbose, debug)
- 🛡️ Enhanced security warnings with detailed validation
- 🔧 Configuration file support (.claude-auto-resume.json)
- 🐛 Debug mode with system diagnostics and performance metrics
- ✅ Input validation with helpful error messages and suggestions
- 🎯 Better error handling with contextual hints and troubleshooting guides
- ⚡ Performance optimized with <100ms startup time

### Cross-Platform & Distribution
- 🖥️ Cross-platform support (Linux/macOS/Windows)
- 📦 npm distribution - install globally or use with npx
- 🔄 100% backward compatibility with shell script version
- 🔗 Support for complex commands (pipes, redirections, operators)

## Installation

### 📦 Method 1: NPM Installation (Recommended - TypeScript Version)

```bash
# Global installation
npm install -g claude-auto-resume

# Use without installing (via npx)
npx claude-auto-resume "your prompt here"

# Verify installation
claude-auto-resume --version
claude-auto-resume --help
```

### 🆕 Migrating from Shell Script Version

If you're upgrading from the shell script version:

```bash
# 1. Uninstall old shell script version (if installed via make)
sudo make uninstall

# 2. Install new TypeScript version
npm install -g claude-auto-resume

# 3. Verify migration - all commands work identically
claude-auto-resume "test migration"
claude-auto-resume -c "continue conversation"
claude-auto-resume -e "echo 'custom command works'"

# 4. (Optional) Remove old shell script file
# rm claude-auto-resume.sh  # if you have local copy
```

**Migration Benefits:**
- ✨ Enhanced error messages and debugging
- 📊 Configurable logging and verbosity levels
- 🔧 Configuration file support
- 🐛 Debug mode with system diagnostics
- ⚡ Better performance and reliability
- 🔄 100% command compatibility - no workflow changes needed!

### 📜 Method 2: Legacy Shell Script Version

> **Note**: The shell script version is maintained for compatibility but new features are only added to the TypeScript version.

```bash
# Using Makefile
sudo make install                    # Global installation
sudo make install PREFIX=/opt/local  # Custom location
sudo make uninstall                  # Uninstall

# Manual installation
sudo cp claude-auto-resume.sh /usr/local/bin/claude-auto-resume
sudo chmod +x /usr/local/bin/claude-auto-resume

# Direct usage (no installation)
chmod +x claude-auto-resume.sh
./claude-auto-resume.sh
```

## Usage

### 🚀 Quick Start (TypeScript Version)

```bash
# Basic usage - start new session with default prompt "continue"
claude-auto-resume

# Custom prompt for new session
claude-auto-resume "implement user authentication"

# Continue previous conversation
claude-auto-resume -c "please continue the previous task"

# Execute custom command after wait period
claude-auto-resume -e "npm run dev"

# Get comprehensive help
claude-auto-resume --help
```

### 📦 NPX Usage (No Installation Required)

```bash
# Use latest version without installing
npx claude-auto-resume "your prompt here"
npx claude-auto-resume -c "continue conversation"
npx claude-auto-resume -e "npm test"
```

### 🔧 Advanced Usage

#### Enhanced Logging and Debugging
```bash
# Verbose output for detailed information
claude-auto-resume --verbose "debug this issue"

# Quiet mode (errors only)
claude-auto-resume --quiet "continue"

# Full debug mode with system diagnostics
claude-auto-resume --debug "help troubleshoot"

# Log to file
CLAUDE_AUTO_RESUME_LOG_FILE=app.log claude-auto-resume "debug task"
```

#### Configuration and Environment
```bash
# Use custom wait buffer
CLAUDE_AUTO_RESUME_WAIT_BUFFER=30 claude-auto-resume "continue"

# Disable automatic permission skipping
CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS=false claude-auto-resume "careful task"

# System information and health check
claude-auto-resume --check
```

#### Development and Testing
```bash
# Test mode - simulate usage limit for development
claude-auto-resume --test-mode 5 "test prompt"  # 5-second wait
claude-auto-resume --test-mode 10 -e "npm run test"  # Test with custom command
```

## How It Works

1. **Detect Limits**: Execute `claude -p 'check'` command
2. **Parse Output**: Look for `Claude AI usage limit reached|<timestamp>` format messages
3. **Calculate Wait Time**: Calculate required wait time based on timestamp
4. **Display Countdown**: Show real-time remaining wait time
5. **Auto Resume**: Automatically execute either:
   - `claude --dangerously-skip-permissions -p "<custom-prompt>"` (new session, default)
   - `claude -c --dangerously-skip-permissions -p "<custom-prompt>"` (continue conversation with -c flag)
   - Custom shell command with `-e/--execute` or `--cmd` flags

## Command Line Options

### Basic Options
- **No arguments**: Start new session with default prompt "continue"
- **Single argument**: Start new session with custom prompt (e.g., `claude-auto-resume "implement feature"`)
- **-p, --prompt**: Specify custom prompt with flag (e.g., `claude-auto-resume -p "write tests"`)
- **-c, --continue**: Continue previous conversation (adds -c flag to claude command)
- **-e, --execute**: Execute custom shell command after wait period (e.g., `claude-auto-resume -e "npm run dev"`)
- **--cmd**: Alias for -e/--execute (e.g., `claude-auto-resume --cmd "python app.py"`)

### Enhanced Options (TypeScript Version)
- **-v, --verbose**: Enable verbose logging (INFO level)
- **-q, --quiet**: Enable quiet mode (ERROR level only)
- **--debug**: Enable debug mode with comprehensive diagnostic output
- **--test-mode <seconds>**: [DEV] Simulate usage limit with specified wait time
- **--check**: Show system check information and diagnostics
- **-h, --help**: Show comprehensive help message with examples
- **-V, --version**: Show version information

### Environment Variables
- **CLAUDE_AUTO_RESUME_WAIT_BUFFER**: Add extra wait time in seconds (default: 0)
- **CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS**: Control permission skipping (default: true)
- **CLAUDE_AUTO_RESUME_LOG_FILE**: Enable file logging to specified path

## Session Types

### Start New Session (Default)
Uses `claude` without `-c` for fresh conversation:
```bash
claude-auto-resume                    # New session with "continue"
claude-auto-resume "new feature"      # New session with custom prompt
claude-auto-resume -p "write tests"   # New session with flag
```

### Continue Previous Conversation
Uses `claude -c` to continue the last conversation:
```bash
claude-auto-resume -c "keep going"           # Continue with custom prompt
claude-auto-resume -c -p "resume work"       # Continue with flag
```

### Execute Custom Commands
Execute any shell command after the wait period:
```bash
claude-auto-resume -e "npm run dev"                    # Start development server
claude-auto-resume --cmd "python app.py"               # Run Python application
claude-auto-resume -e "make build && npm test"         # Complex command with operators
claude-auto-resume -e "ls -la | grep '.js' | wc -l"    # Pipeline commands
claude-auto-resume -e "docker build -t myapp ."       # Docker commands
```

### Configuration File Support (TypeScript Version)

Create `.claude-auto-resume.json` in your home or project directory:

```json
{
  "waitBuffer": 30,
  "skipPermissions": false,
  "logFile": "/path/to/logfile.log",
  "logLevel": "info",
  "verbosity": "verbose"
}
```

### Development and Testing
```bash
# Test mode with enhanced diagnostics
claude-auto-resume --test-mode 5 --debug "test prompt"
claude-auto-resume --test-mode 10 --verbose -e "npm run test"

# Troubleshooting with full diagnostics
claude-auto-resume --debug --check
```

## Requirements

### TypeScript Version (Recommended)
- **Node.js**: Version 18.0.0 or higher
- **Claude CLI**: Must be installed and available in PATH
- **npm**: For installation (comes with Node.js)

### Shell Script Version (Legacy)
- **Claude CLI**: Must be installed and available in PATH
- **Standard Unix Tools**: `grep`, `date`, `sleep`, `awk` (usually pre-installed)
- **Bash/Zsh**: Compatible shell environment

## Security Considerations

### Permission Bypass
This script uses `--dangerously-skip-permissions` to enable unattended operation. This means:

1. **No interactive prompts**: Claude will not ask for confirmation before executing commands
2. **Automatic execution**: File changes, system commands, and other operations run without user approval
3. **Trust requirement**: You must trust both the script and the prompt you provide

### Best Practices
- **Environment isolation**: Use only in development/testing environments
- **Prompt review**: Carefully craft prompts to limit scope (e.g., "continue implementing the login function in src/auth.js")
- **Command review**: Verify custom commands are safe and appropriate for your environment
- **Backup your work**: Ensure you have version control or backups before running
- **Monitor execution**: Check the output to understand what actions were taken
- **Limit scope**: Use specific prompts/commands rather than open-ended ones

## Error Handling

The script includes comprehensive error handling:

- **Exit Code 1**: Claude CLI execution failed
- **Exit Code 2**: Unable to extract valid resume timestamp
- **Exit Code 4**: Resume command execution failed

## Testing

### TypeScript Version
```bash
# Run all tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format
```

### Shell Script Version (Legacy)
```bash
# Syntax check
make test

# Or use bash directly
bash -n claude-auto-resume.sh
```

## Project Structure

```
claude-auto-resume/
├── src/                     # TypeScript source code
│   ├── cli/                 # CLI interface and commands
│   ├── config/              # Configuration management
│   ├── core/                # Core business logic
│   ├── utils/               # Shared utilities
│   └── __tests__/           # Test files
├── dist/                    # Built JavaScript files
├── docs/                    # Project documentation
│   ├── architecture.md      # Architecture documentation
│   ├── prd/                 # Product requirements (epics)
│   └── stories/             # User stories
├── claude-auto-resume.sh    # Legacy shell script
├── package.json             # NPM package configuration
├── tsconfig.json            # TypeScript configuration
├── jest.config.js           # Test configuration
├── Makefile                 # Legacy installation script
├── CLAUDE.md               # Claude Code guide
└── README.md               # Project description
```

## Roadmap

### ✅ Completed (v2.0 TypeScript Edition)
- **✅ Epic 4**: Complete TypeScript migration with enhanced features
- **✅ Phase 1**: Core stability improvements (environment validation, error handling)
- **✅ Phase 2**: Feature extensions (custom command execution, configuration options) 
- **✅ Phase 3**: User experience optimization (enhanced help, better time display)

### 🕰️ Future Enhancements
See our [Development Roadmap](docs/ROADMAP.md) for planned features:

- **Configuration UI**: Web-based configuration management
- **Plugin System**: Extensible architecture for custom behaviors
- **Cloud Integration**: Enhanced Claude service integration
- **Performance Monitoring**: Built-in performance analytics

## Contributing

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Create a Pull Request

Before contributing new features, please check our [roadmap](docs/ROADMAP.md) to ensure alignment with project goals.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## Support

### Getting Help

1. **Built-in Help**: `claude-auto-resume --help` for comprehensive usage guide
2. **Debug Mode**: `claude-auto-resume --debug --check` for system diagnostics
3. **Check Documentation**: Review this README and inline help

### Reporting Issues

If you encounter issues:

1. **Run diagnostics**: `claude-auto-resume --debug --check`
2. **Check existing [Issues](https://github.com/terryso/claude-auto-resume/issues)**
3. **Create a new Issue** with:
   - Debug output from step 1
   - Your system information (OS, Node.js version, Claude CLI version)
   - Steps to reproduce the issue
4. **Submit a Pull Request** for fixes or improvements

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=terryso/claude-auto-resume&type=Date)](https://www.star-history.com/#terryso/claude-auto-resume&Date)

---

## Version History

- **v2.0.0**: TypeScript CLI with enhanced features, npm distribution, comprehensive testing
- **v1.3.0**: Shell script with custom command execution and environment variables
- **v1.0.0**: Initial shell script version

## Migration from Shell Script

The TypeScript version maintains 100% compatibility with the shell script version while adding enhanced features. See the [Installation](#installation) section for migration instructions.

**Note**: This tool depends on Claude CLI output format. The TypeScript version includes enhanced parsing and error handling to better accommodate Claude CLI updates.
