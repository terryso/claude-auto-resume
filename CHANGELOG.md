# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]












## [2.0.15] - 2025-07-13

### Changed
- Performance improvements and bug fixes
- Enhanced stability and compatibility

### Notes
- See commit history for detailed changes
- Maintains 100% backward compatibility


## [2.0.14] - 2025-07-13

### Changed
- Performance improvements and bug fixes
- Enhanced stability and compatibility

### Notes
- See commit history for detailed changes
- Maintains 100% backward compatibility


## [2.0.13] - 2025-07-13

### Changed
- Performance improvements and bug fixes
- Enhanced stability and compatibility

### Notes
- See commit history for detailed changes
- Maintains 100% backward compatibility


## [2.0.12] - 2025-07-13

### Changed
- Performance improvements and bug fixes
- Enhanced stability and compatibility

### Notes
- See commit history for detailed changes
- Maintains 100% backward compatibility


## [2.0.11] - 2025-07-13

### Changed
- Performance improvements and bug fixes
- Enhanced stability and compatibility

### Notes
- See commit history for detailed changes
- Maintains 100% backward compatibility


## [2.0.10] - 2025-07-13

### Changed
- Performance improvements and bug fixes
- Enhanced stability and compatibility

### Notes
- See commit history for detailed changes
- Maintains 100% backward compatibility


## [2.0.9] - 2025-07-13

### Changed
- Performance improvements and bug fixes
- Enhanced stability and compatibility

### Notes
- See commit history for detailed changes
- Maintains 100% backward compatibility


## [2.0.8] - 2025-07-13

### Fixed
- **Unlimited Execution Time**: Removed 5-minute timeout limit in CommandExecutor to match shell script behavior
- **Claude CLI Compatibility**: TypeScript version now waits indefinitely for Claude operations like the original shell script
- **Test Coverage**: Updated related tests to reflect unlimited execution time changes

### Technical Details
- Changed `MAX_EXECUTION_TIME_MS` from 300000 (5 minutes) to 0 (unlimited)
- Modified `executeCustomCommand` to only set timeout when > 0
- Updated log messages to indicate unlimited execution time
- Ensures 100% feature parity with shell script execution behavior


## [2.0.7] - 2025-07-13

### Changed
- Version bump for release
- Bug fixes and improvements


## [2.0.6] - 2025-07-13

### Changed
- Version bump for release
- Bug fixes and improvements


## [2.0.5] - 2025-07-13

### Changed
- Version bump for release
- Bug fixes and improvements


## [2.0.4] - 2025-07-13

### 🔧 Optimizations
- **Simplified Wait Logic**: Changed default waitBuffer from 0 to 10 seconds for consistent behavior
- **Removed Redundant Code**: Eliminated duplicate 10-second sleep in TypeScript version
- **Unified Configuration**: Use waitBuffer setting to handle pause uniformly across both TypeScript and shell versions
- **Enhanced Test Reliability**: Fixed all test failures and improved test coverage
- **100% Feature Parity**: Ensured identical behavior between TypeScript and shell script implementations

### ✨ Benefits
- Cleaner codebase without duplicate timing logic
- User-configurable pause time via `CLAUDE_AUTO_RESUME_WAIT_BUFFER` environment variable
- Consistent behavior across all implementation versions
- All 384 tests pass with 92%+ coverage maintained

## [2.0.1] - 2025-07-13

### 🚀 Features
- **TypeScript Migration**: Complete rewrite from shell script to TypeScript
- **NPM Distribution**: Available via `npm install -g claude-resume` and `npx claude-resume`
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
- **Easy Migration**: `npm install -g claude-resume` replaces shell installation
- **No Workflow Changes**: Existing usage patterns remain the same

### 📦 Distribution
- **NPM Package**: Global installation and npx support
- **GitHub Releases**: Automated releases with comprehensive changelogs
- **Documentation**: Updated README with migration guide and examples

## [1.3.0] - 2025-07-08

### Added
- Custom command execution with `-e/--execute/--cmd` flags
- Environment variable configuration support
- Enhanced error handling and validation
- Test mode for development and validation

### Fixed
- Cross-platform date command compatibility
- Network connectivity validation
- Signal handling for graceful termination

## [1.0.0] - 2025-07-07

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