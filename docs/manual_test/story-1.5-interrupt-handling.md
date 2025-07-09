# Story 1.5: Interrupt Handling - Manual Verification Guide

## Overview

This document provides comprehensive manual verification steps for Story 1.5 Interrupt Handling functionality. The feature includes SIGINT signal handling, friendly exit messages, cleanup mechanisms, and interruption handling during different script phases.

## Pre-Verification Setup

1. Ensure you have the latest version of `claude-auto-resume.sh` script with interrupt handling
2. Ensure script has execute permissions: `chmod +x claude-auto-resume.sh`
3. Backup your original Claude CLI environment (if needed)

## Cross-Platform Compatibility Note

This document uses cross-platform compatible timestamp generation methods:
- **Compatible method**: `FUTURE_TIME=$(($(date +%s) + seconds))`
- **Avoid using**:
  - GNU date syntax: `date -d '+1 second'` (Linux)
  - BSD date syntax: `date -v+1S` (macOS)
- **Reason**: Ensures test scripts work on Linux, macOS, and other systems

## Verification Scenarios

### 1. SIGINT Signal Handling Verification

#### Scenario 1.1: Interruption During Wait Period
```bash
# Create test environment
mkdir -p /tmp/claude-test
cd /tmp/claude-test

cat > claude << 'EOF'
#!/bin/bash
if [[ "$*" == *"check"* ]]; then
    # Return usage limit, wait 30 seconds
    FUTURE_TIME=$(($(date +%s) + 30))
    echo "Claude AI usage limit reached|$FUTURE_TIME"
    exit 0
else
    echo "Normal operation"
    exit 0
fi
EOF

chmod +x claude
export PATH="/tmp/claude-test:$PATH"

# Run test and press Ctrl+C during countdown
./claude-auto-resume.sh "test prompt"
# During countdown, press Ctrl+C

# Expected output:
# Checking network connectivity...
# Network connectivity confirmed.
# Executing Claude CLI command...
# Claude usage limit detected. Waiting until [time]...
# Resuming in 00:00:29...
# [Press Ctrl+C]
# 
# [INFO] Script interrupted by user (Ctrl+C)
# [INFO] Cleaning up and exiting gracefully...
# [INFO] Cleanup completed

# Cleanup
rm -rf /tmp/claude-test
```

#### Scenario 1.2: Interruption During Network Check
```bash
# Create slow network check scenario
# This tests interrupt during environment validation phase

# Run script and quickly press Ctrl+C during "Checking network connectivity..."
./claude-auto-resume.sh "test prompt"
# Immediately press Ctrl+C during network check

# Expected output:
# Checking network connectivity...
# [Press Ctrl+C]
# 
# [INFO] Script interrupted by user (Ctrl+C)
# [INFO] Cleaning up and exiting gracefully...
# [INFO] Cleanup completed
```

#### Scenario 1.3: Interruption During Argument Parsing
```bash
# Test interruption during help display
./claude-auto-resume.sh --help &
# Press Ctrl+C during help display
# Should handle interruption gracefully

# Expected behavior:
# Help should display normally or interrupt gracefully
# No error messages should appear
```

#### Verification Standards:
- [ ] ✅ SIGINT signal captured correctly during wait periods
- [ ] ✅ Friendly exit message displayed: "[INFO] Script interrupted by user (Ctrl+C)"
- [ ] ✅ Cleanup message displayed: "[INFO] Cleaning up and exiting gracefully..."
- [ ] ✅ Exit code 130 (interrupted process)
- [ ] ✅ Interrupt handling works during different script phases

### 2. Cleanup Mechanisms Verification

#### Scenario 2.1: Process Cleanup During Claude CLI Execution
```bash
# Create test environment
mkdir -p /tmp/claude-test
cd /tmp/claude-test

cat > claude << 'EOF'
#!/bin/bash
if [[ "$*" == *"check"* ]]; then
    # Return usage limit, immediate resume
    FUTURE_TIME=$(($(date +%s) + 1))
    echo "Claude AI usage limit reached|$FUTURE_TIME"
    exit 0
elif [[ "$*" == *"dangerously-skip-permissions"* ]]; then
    # Start long-running process that can be interrupted
    echo "Starting long-running Claude process..."
    sleep 30
    echo "This should not appear if interrupted"
    exit 0
fi
EOF

chmod +x claude
export PATH="/tmp/claude-test:$PATH"

# Run test and interrupt during resume execution
./claude-auto-resume.sh "test prompt"
# Wait for "Starting long-running Claude process..." then press Ctrl+C

# Expected output:
# [after resume starts]
# Starting long-running Claude process...
# [Press Ctrl+C]
# 
# [INFO] Script interrupted by user (Ctrl+C)
# [INFO] Cleaning up and exiting gracefully...
# [INFO] Cleanup completed

# Verify no orphaned processes remain
ps aux | grep "claude" | grep -v grep
# Should show no orphaned claude processes

# Cleanup
rm -rf /tmp/claude-test
```

#### Scenario 2.2: Double Cleanup Prevention
```bash
# Test that cleanup doesn't run twice
# This is automated within the script - observe output for duplicate cleanup messages

# Create test environment
mkdir -p /tmp/claude-test
cd /tmp/claude-test

cat > claude << 'EOF'
#!/bin/bash
if [[ "$*" == *"check"* ]]; then
    FUTURE_TIME=$(($(date +%s) + 5))
    echo "Claude AI usage limit reached|$FUTURE_TIME"
    exit 0
fi
EOF

chmod +x claude
export PATH="/tmp/claude-test:$PATH"

# Run and interrupt
./claude-auto-resume.sh "test prompt"
# Press Ctrl+C during wait

# Expected output should show cleanup message only once:
# [INFO] Script interrupted by user (Ctrl+C)
# [INFO] Cleaning up and exiting gracefully...
# [INFO] Cleanup completed
# (Should NOT show duplicate cleanup messages)

# Cleanup
rm -rf /tmp/claude-test
```

#### Verification Standards:
- [ ] ✅ Background processes terminated properly
- [ ] ✅ No orphaned processes remain after interruption
- [ ] ✅ Cleanup function executes successfully
- [ ] ✅ Double cleanup prevention works (CLEANUP_DONE flag)
- [ ] ✅ Cleanup message displayed once

### 3. Exit Code Verification

#### Scenario 3.1: Interrupt Exit Code (130)
```bash
# Test that interrupt returns correct exit code
mkdir -p /tmp/claude-test
cd /tmp/claude-test

cat > claude << 'EOF'
#!/bin/bash
if [[ "$*" == *"check"* ]]; then
    FUTURE_TIME=$(($(date +%s) + 10))
    echo "Claude AI usage limit reached|$FUTURE_TIME"
    exit 0
fi
EOF

chmod +x claude
export PATH="/tmp/claude-test:$PATH"

# Run and interrupt, then check exit code
./claude-auto-resume.sh "test prompt" &
PID=$!
sleep 2
kill -INT $PID
wait $PID
echo "Exit code: $?"

# Expected output:
# Exit code: 130

# Cleanup
rm -rf /tmp/claude-test
```

#### Scenario 3.2: Normal vs Interrupt Exit Codes
```bash
# Test different exit code scenarios
mkdir -p /tmp/claude-test
cd /tmp/claude-test

# Test normal completion (no limit)
cat > claude << 'EOF'
#!/bin/bash
echo "No waiting required. Task completed."
exit 0
EOF

chmod +x claude
export PATH="/tmp/claude-test:$PATH"

./claude-auto-resume.sh "test prompt"
echo "Normal exit code: $?"

# Expected: Exit code 0

# Test error condition
cat > claude << 'EOF'
#!/bin/bash
echo "Error occurred" >&2
exit 1
EOF

./claude-auto-resume.sh "test prompt"
echo "Error exit code: $?"

# Expected: Exit code 1

# Cleanup
rm -rf /tmp/claude-test
```

#### Verification Standards:
- [ ] ✅ Interrupt exit code is 130
- [ ] ✅ Normal completion exit code is 0
- [ ] ✅ Error exit codes remain unchanged (1, 2, 3, 4, 5)
- [ ] ✅ Exit code consistency maintained

### 4. Integration with Existing Error Handling

#### Scenario 4.1: Interrupt During Error Conditions
```bash
# Test interruption during error handling
mkdir -p /tmp/claude-test
cd /tmp/claude-test

cat > claude << 'EOF'
#!/bin/bash
if [[ "$*" == *"check"* ]]; then
    # Simulate malformed output
    echo "Claude AI usage limit reached|invalid_timestamp"
    exit 0
fi
EOF

chmod +x claude
export PATH="/tmp/claude-test:$PATH"

# Run and quickly interrupt during error processing
./claude-auto-resume.sh "test prompt" &
PID=$!
sleep 0.5
kill -INT $PID
wait $PID

# Expected output:
# Should handle interrupt gracefully even during error processing

# Cleanup
rm -rf /tmp/claude-test
```

#### Scenario 4.2: Integration with cleanup_on_exit
```bash
# Test that interrupt handling works with existing cleanup_on_exit
mkdir -p /tmp/claude-test
cd /tmp/claude-test

cat > claude << 'EOF'
#!/bin/bash
if [[ "$*" == *"check"* ]]; then
    FUTURE_TIME=$(($(date +%s) + 15))
    echo "Claude AI usage limit reached|$FUTURE_TIME"
    exit 0
fi
EOF

chmod +x claude
export PATH="/tmp/claude-test:$PATH"

# Run and interrupt
./claude-auto-resume.sh "test prompt"
# Press Ctrl+C during wait

# Expected output should show:
# [INFO] Script interrupted by user (Ctrl+C)
# [INFO] Cleaning up and exiting gracefully...
# [INFO] Cleanup completed
# (Should NOT show duplicate cleanup messages from cleanup_on_exit)

# Cleanup
rm -rf /tmp/claude-test
```

#### Verification Standards:
- [ ] ✅ Interrupt handling works during error conditions
- [ ] ✅ Integration with existing cleanup_on_exit is seamless
- [ ] ✅ No duplicate cleanup messages
- [ ] ✅ Consistent error message format maintained

### 5. Cross-Platform Compatibility

#### Scenario 5.1: Linux Signal Handling
```bash
# Test on Linux system (if available)
# Use timeout to simulate interrupt
timeout 5s ./claude-auto-resume.sh "test prompt"
echo "Exit code: $?"

# Expected: Exit code 124 (timeout) or 130 (if interrupt handling catches it)
```

#### Scenario 5.2: macOS Signal Handling
```bash
# Test on macOS system (if available)
# Use gtimeout or timeout to simulate interrupt
gtimeout 5s ./claude-auto-resume.sh "test prompt" 2>/dev/null || timeout 5s ./claude-auto-resume.sh "test prompt"
echo "Exit code: $?"

# Expected: Exit code 124 (timeout) or 130 (if interrupt handling catches it)
```

#### Verification Standards:
- [ ] ✅ Signal handling works on Linux
- [ ] ✅ Signal handling works on macOS
- [ ] ✅ Exit codes consistent across platforms
- [ ] ✅ Cleanup behavior consistent across platforms

### 6. End-to-End Interrupt Scenarios

#### Scenario 6.1: Multiple Interrupt Attempts
```bash
# Test multiple interrupt attempts
mkdir -p /tmp/claude-test
cd /tmp/claude-test

cat > claude << 'EOF'
#!/bin/bash
if [[ "$*" == *"check"* ]]; then
    FUTURE_TIME=$(($(date +%s) + 20))
    echo "Claude AI usage limit reached|$FUTURE_TIME"
    exit 0
fi
EOF

chmod +x claude
export PATH="/tmp/claude-test:$PATH"

# Run and try multiple interrupts
./claude-auto-resume.sh "test prompt"
# Press Ctrl+C multiple times quickly

# Expected output:
# Should handle first interrupt gracefully
# Subsequent interrupts should be ignored or handled gracefully

# Cleanup
rm -rf /tmp/claude-test
```

#### Scenario 6.2: Interrupt During Different Operations
```bash
# Test interrupt during various operations
mkdir -p /tmp/claude-test
cd /tmp/claude-test

cat > claude << 'EOF'
#!/bin/bash
if [[ "$*" == *"check"* ]]; then
    # Simulate slow initial check
    sleep 2
    FUTURE_TIME=$(($(date +%s) + 10))
    echo "Claude AI usage limit reached|$FUTURE_TIME"
    exit 0
elif [[ "$*" == *"dangerously-skip-permissions"* ]]; then
    # Simulate slow resume
    sleep 3
    echo "Task completed"
    exit 0
fi
EOF

chmod +x claude
export PATH="/tmp/claude-test:$PATH"

# Test interrupt during initial check
./claude-auto-resume.sh "test prompt" &
PID=$!
sleep 1
kill -INT $PID
wait $PID

# Test interrupt during resume
./claude-auto-resume.sh "test prompt"
# Wait for countdown to complete, then interrupt during resume

# Expected: Both scenarios should handle interrupt gracefully

# Cleanup
rm -rf /tmp/claude-test
```

#### Verification Standards:
- [ ] ✅ Multiple interrupts handled gracefully
- [ ] ✅ Interrupt during initial check works
- [ ] ✅ Interrupt during resume works
- [ ] ✅ Interrupt during countdown works
- [ ] ✅ All phases handle interruption consistently

## Verification Completion Checklist

After completing all verifications, use this checklist to ensure functionality is working:

### SIGINT Signal Handling
- [ ] ✅ SIGINT captured during wait periods
- [ ] ✅ SIGINT captured during network checks  
- [ ] ✅ SIGINT captured during argument parsing
- [ ] ✅ Friendly exit message displayed
- [ ] ✅ Cleanup message displayed

### Cleanup Mechanisms
- [ ] ✅ Background processes terminated
- [ ] ✅ No orphaned processes remain
- [ ] ✅ Cleanup function executes successfully
- [ ] ✅ Double cleanup prevention works
- [ ] ✅ Resource cleanup completed

### Exit Code Handling
- [ ] ✅ Exit code 130 for interrupts
- [ ] ✅ Other exit codes unchanged
- [ ] ✅ Exit code consistency maintained
- [ ] ✅ Cross-platform compatibility

### Integration with Existing Systems
- [ ] ✅ Works with existing error handling
- [ ] ✅ Integrates with cleanup_on_exit
- [ ] ✅ Maintains error message format
- [ ] ✅ No duplicate cleanup messages

### Cross-Platform Compatibility
- [ ] ✅ Works on Linux systems
- [ ] ✅ Works on macOS systems
- [ ] ✅ Consistent behavior across platforms
- [ ] ✅ Signal handling portable

### End-to-End Scenarios
- [ ] ✅ Multiple interrupts handled
- [ ] ✅ Interrupt during different phases
- [ ] ✅ Consistent behavior throughout
- [ ] ✅ No edge case failures

## Exit Code Reference

- **Exit code 0**: Normal completion
- **Exit code 1**: Claude CLI execution failures
- **Exit code 2**: Invalid timestamp extraction
- **Exit code 3**: Network/timeout issues
- **Exit code 4**: Resume command failures
- **Exit code 5**: Malformed output detection
- **Exit code 130**: User interrupt (Ctrl+C) - NEW

## Troubleshooting

### Common Issues
1. **Signal not captured**: Check if script has proper signal trap setup
2. **Cleanup not working**: Verify cleanup_resources function exists
3. **Wrong exit code**: Check interrupt_handler function implementation
4. **Orphaned processes**: Verify process cleanup logic

### Debug Commands
```bash
# Check signal traps
trap -l

# Check background processes
ps aux | grep claude

# Check script signal handling
kill -l

# Test interrupt manually
kill -INT <PID>
```

## Cleanup Script
```bash
# Use this to clean up test environment
rm -rf /tmp/claude-test
# Restore PATH environment variable
export PATH="/usr/local/bin:/usr/bin:/bin"
# Or restart terminal
```

## Verification Report Template

After completing verification, record the following:
- **Verification Date**: 
- **Verifier**: 
- **System Environment**: 
- **Passed Test Scenarios**: 
- **Failed Test Scenarios**: 
- **Issues Found**: 
- **Recommended Improvements**: 

---

**Note**: All test scenarios in this document should be performed in a non-production environment. Some tests may require administrator privileges or temporarily affect system behavior.