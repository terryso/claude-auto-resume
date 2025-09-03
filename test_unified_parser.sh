#!/bin/bash

# Simple test script for the unified parse_limit_message function

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_PATH="${SCRIPT_DIR}/claude-auto-resume.sh"

# Source the script to access the function
source "$SCRIPT_PATH" 2>/dev/null || {
    echo "Error: Could not source claude-auto-resume.sh"
    exit 1
}

echo "Testing unified parse_limit_message function..."
echo "=============================================="

# Test cases
test_messages=(
    "Claude AI usage limit reached|1735776000"
    "5-hour limit reached ∙ resets 3am"
    "5-hour limit reached ∙ resets 12:30am" 
    "5-hour limit reached ∙ resets 11:45pm"
    "5-hour limit reached ∙ resets 12pm"
    "5-hour limit reached ∙ resets 6:15am"
)

current_time=$(date +%s)

for msg in "${test_messages[@]}"; do
    echo "Testing: $msg"
    if timestamp=$(parse_limit_message "$msg" 2>/dev/null); then
        if [[ "$timestamp" =~ ^[0-9]+$ ]] && [ "$timestamp" -gt 0 ]; then
            echo "  ✓ SUCCESS: Generated timestamp $timestamp"
            # Format timestamp for display
            if date --version >/dev/null 2>&1; then
                formatted_time=$(date -d "@$timestamp" "+%Y-%m-%d %H:%M:%S")
            else
                formatted_time=$(date -r "$timestamp" "+%Y-%m-%d %H:%M:%S")
            fi
            echo "  ✓ Formatted time: $formatted_time"
        else
            echo "  ✗ FAIL: Invalid timestamp: $timestamp"
        fi
    else
        echo "  ✗ FAIL: Could not parse message"
    fi
    echo
done

echo "Test completed."