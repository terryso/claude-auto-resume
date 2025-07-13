# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.1] - 2025-07-13

### 🚀 Features
- **TypeScript Migration**: Complete rewrite from shell script to TypeScript
- **NPM Distribution**: Available via `npm install -g claude-auto-resume` and `npx claude-auto-resume`
- **Enhanced User Experience**: Better error messages, progress indicators, and logging
- **Configuration Support**: Optional configuration files and enhanced environment variables
- **Debug Mode**: Comprehensive system diagnostics with `--debug` flag
- **Performance Optimization**: <65ms startup time with enhanced functionality

### ✨ Enhancements
- **Simple Countdown Display**: Single-line countdown matching shell script behavior
- **Claude Output Display**: Shows execution results like original shell script
- **Reduced Debug Output**: Cleaner console output with essential information only
- **Cross-Platform Compatibility**: Works on Linux, macOS, and Windows
- **Comprehensive Testing**: 92%+ test coverage with 384 tests

### 🔧 Technical Improvements
- **Modern Architecture**: TypeScript codebase with comprehensive testing
- **CI/CD Pipeline**: GitHub Actions for automated testing and releases
- **Version Management**: Automated releases with `npm run release:patch`
- **Error Handling**: Enhanced error messages with contextual hints
- **Input Validation**: Comprehensive validation with helpful suggestions

### 🔄 Migration from Shell Script
- **100% Backward Compatibility**: All shell script commands work identically
- **Enhanced Features**: Better logging, configuration, and debugging
- **Easy Migration**: `npm install -g claude-auto-resume` replaces shell installation
- **No Workflow Changes**: Existing usage patterns remain the same

### 📦 Distribution
- **NPM Package**: Global installation and npx support
- **GitHub Releases**: Automated releases with comprehensive changelogs
- **Documentation**: Updated README with migration guide and examples

## [1.3.0] - 2024-12-01

### Added
- Custom command execution with `-e/--execute/--cmd` flags
- Environment variable configuration support
- Enhanced error handling and validation
- Test mode for development and validation

### Fixed
- Cross-platform date command compatibility
- Network connectivity validation
- Signal handling for graceful termination

## [1.0.0] - 2024-11-01

### Added
- Initial release of shell script version
- Basic Claude CLI usage limit detection
- Automatic waiting and resumption
- Continue conversation support
- Basic error handling

[Unreleased]: https://github.com/terryso/claude-auto-resume/compare/v2.0.1...HEAD
[2.0.1]: https://github.com/terryso/claude-auto-resume/compare/v1.3.0...v2.0.1
[1.3.0]: https://github.com/terryso/claude-auto-resume/compare/v1.0.0...v1.3.0
[1.0.0]: https://github.com/terryso/claude-auto-resume/releases/tag/v1.0.0