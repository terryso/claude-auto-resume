# Epic: Custom Command Execution - Brownfield Enhancement

## Epic Goal

Enable claude-auto-resume to execute any custom shell command after wait completion, transforming it from a Claude-specific tool into a general-purpose "intelligent wait-and-execute" utility while maintaining backward compatibility and the tool's core simplicity.

## Epic Description

**Existing System Context:**
- Current functionality: Shell script that monitors Claude CLI usage limits, waits for resolution, then executes claude commands with custom prompts
- Technology stack: Bash shell script (~600 lines), uses standard Unix utilities (grep, date, sleep, awk)
- Integration points: Claude CLI tool, standard Unix command environment, user's shell environment

**Enhancement Details:**
- What's being added/changed: New command-line option (-e/--execute) to run arbitrary shell commands instead of claude commands
- How it integrates: Extends existing argument parsing and execution logic with new execution mode alongside current Claude prompt mode
- Success criteria: Users can execute any shell command after wait completion while preserving all existing Claude-specific functionality

## Use Cases

### Development Scenarios
```bash
# Restart development server after limit
claude-auto-resume -e "npm run dev"

# Run build process
claude-auto-resume --cmd "make build && make deploy"

# Execute Python application
claude-auto-resume -e "python manage.py runserver"
```

### Testing and CI/CD
```bash
# Run test suite
claude-auto-resume -e "./run_integration_tests.sh"

# Build and test Docker container
claude-auto-resume --cmd "docker build -t myapp . && docker run -d myapp"
```

### Data Processing
```bash
# Process large datasets
claude-auto-resume -e "python process_large_dataset.py"

# Run data migration
claude-auto-resume --cmd "./migrate_database.sh"
```

## Stories

### Story 1: Add Custom Command Execution Mode
**Goal:** Implement basic custom command execution functionality

**Acceptance Criteria:**
- Add `-e/--execute` and `--cmd` command-line options
- Extend argument parsing to handle custom commands
- Implement execution mode detection (Claude vs Custom)
- Execute custom commands with proper error handling
- Maintain all existing Claude functionality unchanged

**Technical Tasks:**
- Modify argument parsing section to handle new flags
- Add `USE_EXECUTE_MODE` variable and logic
- Implement `eval "$CUSTOM_COMMAND"` execution path
- Add execution mode display messages
- Test with various shell commands

### Story 2: Enhance Help System and Safety
**Goal:** Provide comprehensive documentation and safety features

**Acceptance Criteria:**
- Update help text with new command examples
- Add security warnings about command execution
- Implement optional command preview mode
- Add basic command validation
- Update usage examples in help output

**Technical Tasks:**
- Modify `show_help()` function with new examples
- Add security warnings to help text
- Optional: Add `--dry-run` mode to preview commands
- Add basic command format validation
- Update all example commands in help

### Story 3: Testing and Documentation
**Goal:** Ensure comprehensive testing and documentation

**Acceptance Criteria:**
- Update README.md with new functionality
- Add usage examples for common scenarios
- Create test scenarios for both execution modes
- Verify complete backward compatibility
- Document security considerations

**Technical Tasks:**
- Update README with custom command examples
- Add new section explaining execution modes
- Test all existing command-line combinations
- Test new custom command functionality
- Update security warnings in documentation

## Compatibility Requirements

- [x] Existing APIs remain unchanged (all current command-line options work identically)
- [x] Database schema changes are backward compatible (N/A - no database)
- [x] UI changes follow existing patterns (command-line interface consistency)
- [x] Performance impact is minimal (simple conditional execution)

## Risk Mitigation

**Primary Risk:** Users executing dangerous commands automatically without understanding security implications

**Mitigation Strategies:**
- Clear security warnings in help text and documentation
- Optional command preview/confirmation mode
- Maintain existing security warnings about automated execution
- Recommend testing in safe environments
- Document best practices for safe command usage

**Rollback Plan:** Single-file script allows easy reversion to previous version; new functionality is opt-in via new flags

## Definition of Done

- [x] All stories completed with acceptance criteria met
- [x] Existing functionality verified through testing (all current use cases continue to work)
- [x] Integration points working correctly (maintains compatibility with shell environment)
- [x] Documentation updated appropriately (README, help text, examples)
- [x] No regression in existing features (backward compatibility maintained)

## Technical Implementation Notes

### Command Line Interface Changes
```bash
# Current functionality (unchanged)
claude-auto-resume                              # Start new Claude session
claude-auto-resume "custom prompt"              # Start new Claude session with prompt
claude-auto-resume -c "continue task"           # Continue previous conversation

# New functionality
claude-auto-resume -e "npm run dev"             # Execute custom command
claude-auto-resume --cmd "python app.py"        # Execute custom command (alias)
claude-auto-resume --execute "make build"       # Execute custom command (long form)
```

### Code Structure Changes
```bash
# Add new variables
USE_EXECUTE_MODE=false
CUSTOM_COMMAND=""

# Modify argument parsing
case $1 in
    -e|--execute|--cmd)
        USE_EXECUTE_MODE=true
        CUSTOM_COMMAND="$2"
        shift 2
        ;;
esac

# Add execution logic
if [ "$USE_EXECUTE_MODE" = true ]; then
    echo "Automatically executing command: '$CUSTOM_COMMAND'"
    eval "$CUSTOM_COMMAND"
else
    # Existing Claude execution logic
fi
```

## Success Metrics

1. **Functionality:** All new command-line options work as specified
2. **Compatibility:** 100% backward compatibility with existing usage
3. **Documentation:** Clear examples and security warnings provided
4. **Safety:** Users understand security implications of custom commands
5. **Usability:** Tool becomes useful for non-Claude scenarios while maintaining simplicity

## Timeline

- **Story 1:** 1-2 days (core functionality)
- **Story 2:** 1 day (help and safety)
- **Story 3:** 1 day (testing and documentation)

**Total Epic Duration:** 3-4 days

---

*Epic created: 2025-01-08*
*Last updated: 2025-01-08*