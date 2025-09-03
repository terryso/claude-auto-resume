#!/bin/bash

# Unit test script for claude-auto-resume message format parsing
# This script tests both old and new message formats

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_PATH="${SCRIPT_DIR}/claude-auto-resume.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local expected_result="$2"
    local actual_result="$3"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -n "Testing $test_name... "
    
    if [ "$expected_result" = "$actual_result" ]; then
        echo -e "${GREEN}PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}FAIL${NC}"
        echo "  Expected: $expected_result"
        echo "  Actual: $actual_result"
    fi
}

# Test extract_old_format_timestamp function
test_old_format() {
    echo -e "${YELLOW}Testing old format timestamp extraction...${NC}"
    
    # Source the script to get access to functions
    source "$SCRIPT_PATH"
    
    # Test cases for old format
    test_output="Claude AI usage limit reached|1735776000"
    expected_timestamp="1735776000"
    actual_timestamp=$(extract_old_format_timestamp "$test_output")
    run_test "old format extraction" "$expected_timestamp" "$actual_timestamp"
    
    # Test error case
    test_output="Claude AI usage limit reached|invalid"
    if extract_old_format_timestamp "$test_output" 2>/dev/null; then
        echo -e "${RED}FAIL${NC}: Should have failed with invalid timestamp"
    else
        echo -e "${GREEN}PASS${NC}: Correctly failed with invalid timestamp"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
    TESTS_RUN=$((TESTS_RUN + 1))
}

# Test extract_new_format_timestamp function
test_new_format() {
    echo -e "${YELLOW}Testing new format timestamp extraction...${NC}"
    
    # Source the script to get access to functions
    source "$SCRIPT_PATH"
    
    # Test cases for new format
    local current_time=$(date +%s)
    local test_cases=(
        "5-hour limit reached ∙ resets 3am"
        "5-hour limit reached ∙ resets 12:30am"
        "5-hour limit reached ∙ resets 11:45pm"
        "5-hour limit reached ∙ resets 12pm"
        "5-hour limit reached ∙ resets 6:15am"
    )
    
    for test_case in "${test_cases[@]}"; do
        echo "  Testing: $test_case"
        if timestamp=$(extract_new_format_timestamp "$test_case" 2>/dev/null); then
            # Verify timestamp is reasonable (within next 24 hours)
            if [ "$timestamp" -gt "$current_time" ] && [ "$timestamp" -lt $((current_time + 86400)) ]; then
                echo -e "    ${GREEN}PASS${NC}: Generated valid future timestamp"
                TESTS_PASSED=$((TESTS_PASSED + 1))
            else
                echo -e "    ${RED}FAIL${NC}: Generated invalid timestamp: $timestamp"
            fi
        else
            echo -e "    ${RED}FAIL${NC}: Failed to extract timestamp from: $test_case"
        fi
        TESTS_RUN=$((TESTS_RUN + 1))
    done
    
    # Test error case
    test_output="5-hour limit reached ∙ resets invalid"
    if extract_new_format_timestamp "$test_output" 2>/dev/null; then
        echo -e "${RED}FAIL${NC}: Should have failed with invalid time format"
    else
        echo -e "${GREEN}PASS${NC}: Correctly failed with invalid time format"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
    TESTS_RUN=$((TESTS_RUN + 1))
}

# Test message detection
test_message_detection() {
    echo -e "${YELLOW}Testing message format detection...${NC}"
    
    local old_messages=(
        "Claude AI usage limit reached|1735776000"
        "Some text Claude AI usage limit reached|1735776000 more text"
    )
    
    local new_messages=(
        "5-hour limit reached ∙ resets 3am"
        "5-hour limit reached ∙ resets 12:30am"
        "Some text 5-hour limit reached ∙ resets 11:45pm more text"
    )
    
    for msg in "${old_messages[@]}"; do
        if echo "$msg" | grep -qE "(Claude AI usage limit reached|limit reached.*resets)"; then
            echo -e "  ${GREEN}PASS${NC}: Detected old format message"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "  ${RED}FAIL${NC}: Failed to detect old format message: $msg"
        fi
        TESTS_RUN=$((TESTS_RUN + 1))
    done
    
    for msg in "${new_messages[@]}"; do
        if echo "$msg" | grep -qE "(Claude AI usage limit reached|limit reached.*resets)"; then
            echo -e "  ${GREEN}PASS${NC}: Detected new format message"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "  ${RED}FAIL${NC}: Failed to detect new format message: $msg"
        fi
        TESTS_RUN=$((TESTS_RUN + 1))
    done
}

# Test script integration
test_script_integration() {
    echo -e "${YELLOW}Testing script integration...${NC}"
    
    # Test old format in test mode
    echo "  Testing old format test mode..."
    if timeout 15s "$SCRIPT_PATH" --test-mode 2 "test" >/dev/null 2>&1; then
        echo -e "  ${GREEN}PASS${NC}: Old format test mode completed"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "  ${RED}FAIL${NC}: Old format test mode failed"
    fi
    TESTS_RUN=$((TESTS_RUN + 1))
    
    # Test new format in test mode
    echo "  Testing new format test mode..."
    if timeout 15s "$SCRIPT_PATH" --test-mode 2 --test-new-format "test" >/dev/null 2>&1; then
        echo -e "  ${GREEN}PASS${NC}: New format test mode completed"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "  ${RED}FAIL${NC}: New format test mode failed"
    fi
    TESTS_RUN=$((TESTS_RUN + 1))
}

# Main test runner
main() {
    echo "Running claude-auto-resume message format tests..."
    echo "=================================================="
    
    # Make sure script is executable
    chmod +x "$SCRIPT_PATH"
    
    # Run all tests
    test_old_format
    echo
    test_new_format
    echo
    test_message_detection
    echo
    test_script_integration
    
    # Summary
    echo
    echo "=================================================="
    echo "Test Summary:"
    echo "  Tests run: $TESTS_RUN"
    echo "  Tests passed: $TESTS_PASSED"
    echo "  Tests failed: $((TESTS_RUN - TESTS_PASSED))"
    
    if [ $TESTS_PASSED -eq $TESTS_RUN ]; then
        echo -e "  Result: ${GREEN}ALL TESTS PASSED${NC}"
        exit 0
    else
        echo -e "  Result: ${RED}SOME TESTS FAILED${NC}"
        exit 1
    fi
}

# Run tests
main