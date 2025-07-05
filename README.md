# Claude Auto-Resume

A shell script utility that automatically resumes Claude CLI tasks when usage limits are lifted. It detects Claude usage restrictions, waits intelligently, and resumes task execution automatically.

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

### After Global Installation

```bash
claude-auto-resume
```

### Local Usage

```bash
# Ensure script is executable
chmod +x claude-auto-resume.sh

# Run the script
./claude-auto-resume.sh
```

## How It Works

1. **Detect Limits**: Execute `claude -p 'check'` command
2. **Parse Output**: Look for `Claude AI usage limit reached|<timestamp>` format messages
3. **Calculate Wait Time**: Calculate required wait time based on timestamp
4. **Display Countdown**: Show real-time remaining wait time
5. **Auto Resume**: Automatically execute `claude -c --dangerously-skip-permissions -p 'continue'` after waiting

## Requirements

- **Claude CLI**: Must be installed and available in PATH
- **Standard Unix Tools**: `grep`, `date`, `sleep`, `awk` (usually pre-installed)

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