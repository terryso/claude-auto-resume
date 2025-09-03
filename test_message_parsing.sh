#!/bin/bash

# Direct test of message parsing without running full script

# Define the parse_limit_message function directly for testing
parse_limit_message() {
    local claude_output="$1"
    local resume_timestamp
    
    # Check for old format: Claude AI usage limit reached|<timestamp>
    if echo "$claude_output" | grep -q "Claude AI usage limit reached|"; then
        resume_timestamp=$(echo "$claude_output" | awk -F'|' '{print $2}')
        if ! [[ "$resume_timestamp" =~ ^[0-9]+$ ]] || [ "$resume_timestamp" -le 0 ]; then
            echo "[ERROR] Failed to extract a valid resume timestamp from Claude output."
            return 1
        fi
        echo "$resume_timestamp"
        return
    fi
    
    # Check for new format: X-hour limit reached ∙ resets Xam/pm or X:XXam/pm
    if echo "$claude_output" | grep -q "limit reached.*resets"; then
        local reset_time reset_hour reset_minute reset_period reset_hour_24
        local now_timestamp today_reset
        
        # Extract the reset time (e.g., "3am", "12:30am")
        reset_time=$(echo "$claude_output" | grep -o "resets [0-9]*:*[0-9]*[ap]m" | awk '{print $2}')
        if [ -z "$reset_time" ]; then
            echo "[ERROR] Failed to extract reset time from new Claude output format."
            return 1
        fi
        
        # Convert reset time to timestamp
        # Extract hour, minute (if present), and am/pm
        reset_period=$(echo "$reset_time" | grep -o '[ap]m')
        
        # Check if time includes minutes (e.g., "12:30am")
        if echo "$reset_time" | grep -q ":"; then
            reset_hour=$(echo "$reset_time" | cut -d: -f1)
            reset_minute=$(echo "$reset_time" | sed 's/[ap]m//' | cut -d: -f2)
        else
            # Only hour specified (e.g., "3am")
            reset_hour=$(echo "$reset_time" | sed 's/[ap]m//')
            reset_minute=0
        fi
        
        # Convert to 24-hour format
        if [ "$reset_period" = "am" ]; then
            if [ "$reset_hour" = "12" ]; then
                reset_hour_24=0
            else
                reset_hour_24=$reset_hour
            fi
        else
            if [ "$reset_hour" = "12" ]; then
                reset_hour_24=12
            else
                reset_hour_24=$((reset_hour + 12))
            fi
        fi
        
        # Get current time and calculate next reset time
        now_timestamp=$(date +%s)
        
        # Get today's reset time
        if date --version >/dev/null 2>&1; then
            # GNU date (Linux)
            today_reset=$(date -d "today ${reset_hour_24}:${reset_minute}:00" +%s)
        else
            # BSD date (macOS)
            today_reset=$(date -j -f "%Y-%m-%d %H:%M:%S" "$(date +%Y-%m-%d) ${reset_hour_24}:${reset_minute}:00" +%s)
        fi
        
        # If reset time has passed today, use tomorrow's reset time
        if [ $now_timestamp -gt $today_reset ]; then
            if date --version >/dev/null 2>&1; then
                # GNU date (Linux)
                resume_timestamp=$(date -d "tomorrow ${reset_hour_24}:${reset_minute}:00" +%s)
            else
                # BSD date (macOS)
                local tomorrow=$(date -j -v+1d +%Y-%m-%d)
                resume_timestamp=$(date -j -f "%Y-%m-%d %H:%M:%S" "${tomorrow} ${reset_hour_24}:${reset_minute}:00" +%s)
            fi
        else
            resume_timestamp=$today_reset
        fi
        
        echo "$resume_timestamp"
        return
    fi
    
    # If no recognized format found
    echo "[ERROR] Unrecognized Claude usage limit message format."
    return 1
}

echo "Testing parse_limit_message function..."
echo "======================================"

# Test cases with expected behavior
test_cases=(
    "Claude AI usage limit reached|1735776000"
    "5-hour limit reached ∙ resets 3am"
    "5-hour limit reached ∙ resets 12:30am"
    "5-hour limit reached ∙ resets 11:45pm"  
    "5-hour limit reached ∙ resets 12pm"
    "5-hour limit reached ∙ resets 6:15am"
)

current_time=$(date +%s)
passed=0
total=0

for msg in "${test_cases[@]}"; do
    total=$((total + 1))
    echo -n "Testing: '$msg' ... "
    
    if timestamp=$(parse_limit_message "$msg" 2>/dev/null); then
        if [[ "$timestamp" =~ ^[0-9]+$ ]] && [ "$timestamp" -gt 0 ]; then
            echo "✅ PASS (timestamp: $timestamp)"
            
            # Show formatted time for verification
            if date --version >/dev/null 2>&1; then
                formatted=$(date -d "@$timestamp" "+%Y-%m-%d %H:%M:%S")
            else
                formatted=$(date -r "$timestamp" "+%Y-%m-%d %H:%M:%S")
            fi
            echo "   → Formatted: $formatted"
            passed=$((passed + 1))
        else
            echo "❌ FAIL (invalid timestamp: $timestamp)"
        fi
    else
        echo "❌ FAIL (parsing error)"
    fi
    echo
done

echo "Results: $passed/$total tests passed"

if [ $passed -eq $total ]; then
    echo "🎉 All tests passed!"
    exit 0
else
    echo "❌ Some tests failed"
    exit 1
fi