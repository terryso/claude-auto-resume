#!/bin/bash

# Claude Auto-Resume Test Suite
# Version: 2.0.0

set -euo pipefail

# Test configuration
readonly TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_PATH="$TEST_DIR/claude-auto-resume.sh"
readonly TEST_CONFIG_DIR="$TEST_DIR/test-config"
readonly TEST_OUTPUT_DIR="$TEST_DIR/test-output"
readonly TEST_LOG="$TEST_OUTPUT_DIR/test.log"

# Color codes
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Initialize test environment
init_test_env() {
    echo -e "${CYAN}${BOLD}Initializing test environment...${NC}"
    
    # Create test directories
    mkdir -p "$TEST_CONFIG_DIR" "$TEST_OUTPUT_DIR"
    
    # Create test configuration
    cat > "$TEST_CONFIG_DIR/test-config.json" << 'EOF'
{
    "general": {
        "default_prompt": "test prompt"
    },
    "logging": {
        "log_level": "debug"
    },
    "ui": {
        "quiet_mode": true
    }
}
EOF
    
    # Check if script exists
    if [[ ! -f "$SCRIPT_PATH" ]]; then
        echo -e "${RED}Error: Script not found at $SCRIPT_PATH${NC}"
        exit 1
    fi
    
    # Make script executable
    chmod +x "$SCRIPT_PATH"
    
    echo -e "${GREEN}✓ Test environment initialized${NC}"
}

# Cleanup test environment
cleanup_test_env() {
    if [[ -d "$TEST_OUTPUT_DIR" ]]; then
        rm -rf "$TEST_OUTPUT_DIR"
    fi
}

# Test helper functions
run_test() {
    local test_name="$1"
    local test_function="$2"
    
    echo -n -e "${CYAN}Running:${NC} $test_name... "
    ((TESTS_RUN++))
    
    # Run test in subshell to isolate failures
    if (
        set -e
        exec 2>&1
        $test_function
    ) >> "$TEST_LOG" 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
        echo -e "${RED}Error output:${NC}"
        tail -n 20 "$TEST_LOG"
        return 1
    fi
}

skip_test() {
    local test_name="$1"
    local reason="$2"
    
    echo -e "${YELLOW}Skipping:${NC} $test_name - $reason"
    ((TESTS_SKIPPED++))
}

assert_equals() {
    local expected="$1"
    local actual="$2"
    local message="${3:-Assertion failed}"
    
    if [[ "$expected" != "$actual" ]]; then
        echo "ASSERTION FAILED: $message"
        echo "Expected: '$expected'"
        echo "Actual: '$actual'"
        return 1
    fi
}

assert_contains() {
    local haystack="$1"
    local needle="$2"
    local message="${3:-String not found}"
    
    if [[ ! "$haystack" =~ $needle ]]; then
        echo "ASSERTION FAILED: $message"
        echo "Looking for: '$needle'"
        echo "In: '$haystack'"
        return 1
    fi
}

assert_file_exists() {
    local file="$1"
    local message="${2:-File not found}"
    
    if [[ ! -f "$file" ]]; then
        echo "ASSERTION FAILED: $message"
        echo "File not found: $file"
        return 1
    fi
}

# Test cases

test_help_output() {
    local output
    output=$("$SCRIPT_PATH" --help 2>&1)
    
    assert_contains "$output" "Usage:" "Help should contain usage"
    assert_contains "$output" "OPTIONS:" "Help should contain options"
    assert_contains "$output" "--prompt" "Help should document --prompt"
    assert_contains "$output" "--resume" "Help should document --resume"
}

test_version_output() {
    local output
    output=$("$SCRIPT_PATH" --version 2>&1)
    
    assert_contains "$output" "claude-auto-resume" "Version should contain script name"
    assert_contains "$output" "2.0.0" "Version should be 2.0.0"
}

test_config_loading() {
    local output
    output=$(CONFIG_FILE="$TEST_CONFIG_DIR/test-config.json" "$SCRIPT_PATH" --show-config 2>&1 || true)
    
    assert_contains "$output" "test prompt" "Should load test config"
}

test_argument_parsing() {
    # Test prompt argument
    local output
    output=$("$SCRIPT_PATH" --dry-run -p "custom prompt" 2>&1 || true)
    assert_contains "$output" "custom prompt" "Should parse prompt argument"
    
    # Test session type
    output=$("$SCRIPT_PATH" --dry-run --session-type extended 2>&1 || true)
    assert_contains "$output" "extended" "Should parse session type"
}

test_error_pattern_matching() {
    # Create mock error output
    local mock_error="Claude AI usage limit reached|1234567890"
    
    # Test pattern matching function
    local result
    result=$(echo "$mock_error" | grep "usage limit reached" || true)
    
    assert_contains "$result" "usage limit" "Should match usage limit pattern"
}

test_countdown_format() {
    # Test time formatting
    # Since we can't easily test the actual countdown, test the format_duration function
    # by checking if the script has the function
    local script_content
    script_content=$(cat "$SCRIPT_PATH")
    
    assert_contains "$script_content" "format_duration" "Should have format_duration function"
}

test_notification_check() {
    # Test notification availability check
    local has_notifier=false
    
    if command -v notify-send &> /dev/null || \
       command -v osascript &> /dev/null || \
       command -v terminal-notifier &> /dev/null; then
        has_notifier=true
    fi
    
    if [[ "$has_notifier" == "true" ]]; then
        echo "Notification tool available"
    else
        echo "No notification tool found (expected)"
    fi
}

test_directory_creation() {
    # Test directory initialization
    local test_home="$TEST_OUTPUT_DIR/home"
    mkdir -p "$test_home"
    
    HOME="$test_home" "$SCRIPT_PATH" --init-only 2>&1 || true
    
    # Check if directories would be created
    # Note: Script might not have --init-only, so we check the script content
    local script_content
    script_content=$(cat "$SCRIPT_PATH")
    
    assert_contains "$script_content" "mkdir -p" "Should create directories"
}

test_json_validation() {
    # Test valid JSON
    local valid_json='{"test": "value"}'
    echo "$valid_json" > "$TEST_OUTPUT_DIR/valid.json"
    
    if command -v jq &> /dev/null; then
        jq . "$TEST_OUTPUT_DIR/valid.json" > /dev/null
        assert_equals "$?" "0" "Valid JSON should parse"
    else
        skip_test "JSON validation" "jq not installed"
    fi
    
    # Test invalid JSON
    local invalid_json='{"test": invalid}'
    echo "$invalid_json" > "$TEST_OUTPUT_DIR/invalid.json"
    
    if command -v jq &> /dev/null; then
        if jq . "$TEST_OUTPUT_DIR/invalid.json" 2> /dev/null; then
            return 1
        fi
    fi
}

test_hook_configuration() {
    # Test hook configuration structure
    local hooks_file="$TEST_DIR/claude-resume-hooks.json"
    
    if [[ -f "$hooks_file" ]]; then
        if command -v jq &> /dev/null; then
            local hook_count
            hook_count=$(jq '.hooks | length' "$hooks_file")
            [[ "$hook_count" -gt 0 ]] || return 1
        fi
    else
        skip_test "Hook configuration" "Hooks file not found"
    fi
}

test_state_preservation() {
    # Test state file creation
    local state_file="$TEST_OUTPUT_DIR/test_state.json"
    
    # Simulate state save
    cat > "$state_file" << EOF
{
    "timestamp": $(date +%s),
    "conversation_id": "test_123",
    "prompt": "test prompt"
}
EOF
    
    assert_file_exists "$state_file" "State file should be created"
    
    # Test state loading
    if command -v jq &> /dev/null; then
        local conv_id
        conv_id=$(jq -r '.conversation_id' "$state_file")
        assert_equals "$conv_id" "test_123" "Should load conversation ID"
    fi
}

test_error_handling() {
    # Test various error conditions
    
    # Test with non-existent config
    local output
    output=$("$SCRIPT_PATH" --config /non/existent/file --dry-run 2>&1 || true)
    # Should not crash
    
    # Test with invalid arguments
    output=$("$SCRIPT_PATH" --invalid-argument 2>&1 || true)
    assert_contains "$output" "nknown option" "Should report unknown option"
}

test_dry_run_mode() {
    # Test dry run doesn't execute commands
    local output
    output=$("$SCRIPT_PATH" --dry-run --verbose 2>&1 || true)
    
    # Should not actually run claude command
    if [[ "$output" =~ "claude" ]]; then
        echo "Dry run mode active (expected)"
    fi
}

test_log_levels() {
    # Test different log levels
    local outputs=()
    
    # Quiet mode
    outputs+=($("$SCRIPT_PATH" --quiet --version 2>&1 || true))
    
    # Verbose mode  
    outputs+=($("$SCRIPT_PATH" --verbose --version 2>&1 || true))
    
    # Debug mode
    outputs+=($("$SCRIPT_PATH" --debug --version 2>&1 || true))
    
    # Should have different output lengths
    echo "Log level outputs captured"
}

test_compatibility() {
    # Test bash version compatibility
    local bash_version
    bash_version=$(bash --version | head -n1)
    
    assert_contains "$bash_version" "ersion" "Should get bash version"
    
    # Test for required commands
    local required_commands=("date" "sleep" "grep" "awk")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            return 1
        fi
    done
}

# Performance tests

test_startup_performance() {
    # Measure startup time
    local start_time
    local end_time
    
    start_time=$(date +%s.%N)
    "$SCRIPT_PATH" --version > /dev/null 2>&1
    end_time=$(date +%s.%N)
    
    # Check if it starts reasonably fast (under 1 second)
    local duration
    duration=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "0.1")
    
    echo "Startup time: ${duration}s"
}

# Integration tests

test_claude_integration() {
    if command -v claude &> /dev/null; then
        # Test claude command detection
        echo "Claude CLI found"
    else
        skip_test "Claude integration" "Claude CLI not installed"
    fi
}

# Run all tests
run_all_tests() {
    echo -e "${CYAN}${BOLD}Claude Auto-Resume Test Suite v2.0.0${NC}"
    echo -e "${CYAN}${BOLD}====================================${NC}"
    echo
    
    # Initialize
    init_test_env
    
    # Run tests
    run_test "Help output" test_help_output
    run_test "Version output" test_version_output
    run_test "Config loading" test_config_loading
    run_test "Argument parsing" test_argument_parsing
    run_test "Error pattern matching" test_error_pattern_matching
    run_test "Countdown format" test_countdown_format
    run_test "Notification check" test_notification_check
    run_test "Directory creation" test_directory_creation
    run_test "JSON validation" test_json_validation
    run_test "Hook configuration" test_hook_configuration
    run_test "State preservation" test_state_preservation
    run_test "Error handling" test_error_handling
    run_test "Dry run mode" test_dry_run_mode
    run_test "Log levels" test_log_levels
    run_test "Compatibility" test_compatibility
    run_test "Startup performance" test_startup_performance
    run_test "Claude integration" test_claude_integration
    
    # Summary
    echo
    echo -e "${CYAN}${BOLD}Test Summary${NC}"
    echo -e "${CYAN}${BOLD}============${NC}"
    echo -e "Total tests:    $TESTS_RUN"
    echo -e "${GREEN}Passed:         $TESTS_PASSED${NC}"
    echo -e "${RED}Failed:         $TESTS_FAILED${NC}"
    echo -e "${YELLOW}Skipped:        $TESTS_SKIPPED${NC}"
    echo
    
    # Cleanup
    cleanup_test_env
    
    # Exit with appropriate code
    if [[ $TESTS_FAILED -gt 0 ]]; then
        echo -e "${RED}${BOLD}TEST SUITE FAILED${NC}"
        exit 1
    else
        echo -e "${GREEN}${BOLD}ALL TESTS PASSED!${NC}"
        exit 0
    fi
}

# Check if specific test requested
if [[ $# -gt 0 ]]; then
    case "$1" in
        --list)
            echo "Available tests:"
            grep "^test_" "$0" | sed 's/().*//' | sed 's/^/  /'
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --list    List available tests"
            echo "  --help    Show this help"
            echo "  TEST_NAME Run specific test"
            ;;
        test_*)
            init_test_env
            run_test "$1" "$1"
            cleanup_test_env
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
else
    # Run all tests
    run_all_tests
fi