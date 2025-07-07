# Claude Auto-Resume

A shell script utility that automatically resumes Claude CLI tasks when usage limits are lifted. It detects Claude usage restrictions, waits intelligently, and resumes task execution automatically.

## ⚠️ SECURITY WARNING

**This script uses `--dangerously-skip-permissions` flag when executing Claude commands**, which means:

- **Claude Code will execute tasks WITHOUT asking for permission**
- **File operations, system commands, and code changes will run automatically**
- **Use ONLY in trusted environments and with trusted prompts**
- **Review your prompt carefully before running this script**

**Recommended Usage:**
- Use in isolated development environments
- Avoid on production systems or with sensitive data
- Be specific with your prompts to limit scope of actions
- Consider the potential impact of automated execution

## Use Cases

This script is particularly useful when using Claude Code for development in the following scenarios:

1. **Task Interrupted by Usage Limits**: When your Claude Code shows `Claude usage limit reached.` but your task is not yet completely finished
2. **Automatic Task Resumption**: Simply run `claude-auto-resume` in your project's root directory, and when the usage limit is lifted, the script will automatically let Claude Code continue executing your previously unfinished task

## Features

- 🔄 Automatically detects Claude CLI usage limits
- ⏰ Smart waiting with countdown display
- 🚀 Automatic task resumption
- 🖥️ Cross-platform support (Linux/macOS)
- 📦 Zero external dependencies (only standard Unix tools required)

## Installation

### Method 1: Using Makefile (Recommended)

```bash
# Global installation
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

# Or create symbolic link
sudo ln -s $(pwd)/claude-auto-resume.sh /usr/local/bin/claude-auto-resume
```

### Method 3: Direct Usage (No Installation)

```bash
# Make script executable
chmod +x claude-auto-resume.sh

# Run directly
./claude-auto-resume.sh
```

## Usage

### Basic Usage

```bash
# Start new session with default prompt "continue"
claude-auto-resume

# Start new session with custom prompt
claude-auto-resume "implement user authentication"

# Start new session with custom prompt using flag
claude-auto-resume -p "write unit tests"

# Continue previous conversation with custom prompt
claude-auto-resume -c "please continue the previous task"

# Continue previous conversation with custom prompt using flag
claude-auto-resume -c -p "resume where we left off"

# Show help
claude-auto-resume --help
```

### Local Usage (Before Installation)

```bash
# Ensure script is executable
chmod +x claude-auto-resume.sh

# Start new session with default prompt
./claude-auto-resume.sh

# Start new session with custom prompt
./claude-auto-resume.sh "create login page"

# Continue previous conversation
./claude-auto-resume.sh -c "continue with the implementation"
```

## How It Works

1. **Detect Limits**: Execute `claude -p 'check'` command
2. **Parse Output**: Look for `Claude AI usage limit reached|<timestamp>` format messages
3. **Calculate Wait Time**: Calculate required wait time based on timestamp
4. **Display Countdown**: Show real-time remaining wait time
5. **Auto Resume**: Automatically execute either:
   - `claude --dangerously-skip-permissions -p "<custom-prompt>"` (new session, default)
   - `claude -c --dangerously-skip-permissions -p "<custom-prompt>"` (continue conversation with -c flag)

## Command Line Options

- **No arguments**: Start new session with default prompt "continue"
- **Single argument**: Start new session with custom prompt (e.g., `claude-auto-resume "implement feature"`)
- **-p, --prompt**: Specify custom prompt with flag (e.g., `claude-auto-resume -p "write tests"`)
- **-c, --continue**: Continue previous conversation (adds -c flag to claude command)
- **-h, --help**: Show help message and usage examples

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

## Requirements

- **Claude CLI**: Must be installed and available in PATH
- **Standard Unix Tools**: `grep`, `date`, `sleep`, `awk` (usually pre-installed)

## Security Considerations

### Permission Bypass
This script uses `--dangerously-skip-permissions` to enable unattended operation. This means:

1. **No interactive prompts**: Claude will not ask for confirmation before executing commands
2. **Automatic execution**: File changes, system commands, and other operations run without user approval
3. **Trust requirement**: You must trust both the script and the prompt you provide

### Best Practices
- **Environment isolation**: Use only in development/testing environments
- **Prompt review**: Carefully craft prompts to limit scope (e.g., "continue implementing the login function in src/auth.js")
- **Backup your work**: Ensure you have version control or backups before running
- **Monitor execution**: Check the output to understand what actions were taken
- **Limit scope**: Use specific prompts rather than open-ended ones

## Error Handling

The script includes comprehensive error handling:

- **Exit Code 1**: Claude CLI execution failed
- **Exit Code 2**: Unable to extract valid resume timestamp
- **Exit Code 4**: Resume command execution failed

## Testing

```bash
# Syntax check
make test

# Or use bash directly
bash -n claude-auto-resume.sh
```

## Project Structure

```
claude-auto-resume/
├── claude-auto-resume.sh    # Main script
├── Makefile                 # Installation/uninstallation script
├── docs/                    # Project documentation
│   ├── architecture.md      # Architecture documentation
│   ├── prd.md              # Product requirements document
│   └── stories/            # User stories
├── CLAUDE.md               # Claude Code guide
└── README.md               # Project description
```

## Contributing

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## Support

If you encounter issues or have suggestions:

1. Check existing [Issues](https://github.com/terryso/claude-auto-resume/issues)
2. Create a new Issue describing the problem
3. Or submit a Pull Request

---

**Note**: This tool depends on Claude CLI output format. If Claude CLI updates change the output format, the script may need to be updated.