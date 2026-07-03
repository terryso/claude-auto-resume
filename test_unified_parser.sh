#!/bin/bash

# Simple test script for the unified parse_limit_message function
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_PATH="${SCRIPT_DIR}/claude-auto-resume.sh"

# Source the script to access the function
source "$SCRIPT_PATH" 2>/dev/null || {
    echo "Error: Could not source claude-auto-resume.sh"
    exit 1
}

echo "Testing unified parse_limit_message function..."
echo "=============================================="

tests_run=0
tests_failed=0

pass() {
    echo "  PASS: $1"
}

fail() {
    echo "  FAIL: $1"
    tests_failed=$((tests_failed + 1))
}

assert_numeric_timestamp() {
    local name="$1"
    local msg="$2"
    local timestamp

    tests_run=$((tests_run + 1))
    echo "Testing: $name"
    if timestamp=$(parse_limit_message "$msg" 2>/dev/null) &&
        [[ "$timestamp" =~ ^[0-9]+$ ]] &&
        [ "$timestamp" -gt 0 ]; then
        pass "parsed timestamp $timestamp"
    else
        fail "could not parse a valid timestamp from: $msg"
    fi
}

assert_exact_timestamp() {
    local name="$1"
    local msg="$2"
    local expected="$3"
    local timestamp

    tests_run=$((tests_run + 1))
    echo "Testing: $name"
    if timestamp=$(parse_limit_message "$msg" 2>/dev/null) && [ "$timestamp" = "$expected" ]; then
        pass "parsed expected timestamp $expected"
    else
        fail "expected timestamp $expected, got '${timestamp:-<none>}'"
    fi
}

format_time_in_tz() {
    local timestamp="$1"
    local timezone="$2"

    if date --version >/dev/null 2>&1; then
        TZ="$timezone" date -d "@$timestamp" "+%H:%M"
    else
        TZ="$timezone" date -r "$timestamp" "+%H:%M"
    fi
}

assert_reset_time() {
    local name="$1"
    local msg="$2"
    local timezone="$3"
    local expected_time="$4"
    local timestamp actual_time

    tests_run=$((tests_run + 1))
    echo "Testing: $name"
    if timestamp=$(parse_limit_message "$msg" 2>/dev/null); then
        actual_time=$(format_time_in_tz "$timestamp" "$timezone")
        if [ "$actual_time" = "$expected_time" ]; then
            pass "parsed reset time $actual_time in $timezone"
        else
            fail "expected reset time $expected_time in $timezone, got $actual_time"
        fi
    else
        fail "could not parse reset timestamp from: $msg"
    fi
}

classify_claude_result() {
    local exit_code="$1"
    local output="$2"
    local limit_msg

    limit_msg=$(detect_limit_message "$output" || true)
    if [ -n "$limit_msg" ]; then
        echo "usage_limit"
    elif [ "$exit_code" -ne 0 ]; then
        echo "execution_error"
    else
        echo "no_limit"
    fi
}

assert_classification() {
    local name="$1"
    local exit_code="$2"
    local output="$3"
    local expected="$4"
    local actual

    tests_run=$((tests_run + 1))
    echo "Testing: $name"
    actual=$(classify_claude_result "$exit_code" "$output")
    if [ "$actual" = "$expected" ]; then
        pass "classified as $expected"
    else
        fail "expected $expected, got $actual"
    fi
}

assert_exact_timestamp \
    "old timestamp format" \
    "Claude AI usage limit reached|1735776000" \
    "1735776000"

assert_numeric_timestamp "5-hour reset at 3am" "5-hour limit reached ∙ resets 3am"
assert_numeric_timestamp "5-hour reset at 12:30am" "5-hour limit reached ∙ resets 12:30am"
assert_numeric_timestamp "5-hour reset at 11:45pm" "5-hour limit reached ∙ resets 11:45pm"
assert_numeric_timestamp "5-hour reset at 12pm" "5-hour limit reached ∙ resets 12pm"
assert_numeric_timestamp "5-hour reset at 6:15am" "5-hour limit reached ∙ resets 6:15am"

assert_reset_time \
    "Claude latest limit format without session" \
    "You've hit your limit · resets 4:20am (Europe/Warsaw)" \
    "Europe/Warsaw" \
    "04:20"

assert_reset_time \
    "Claude latest session limit with minutes" \
    "You've hit your session limit · resets 4:20am (Europe/Warsaw)" \
    "Europe/Warsaw" \
    "04:20"

assert_reset_time \
    "Claude latest session limit hour-only" \
    "You've hit your session limit · resets 2am (Europe/Paris)" \
    "Europe/Paris" \
    "02:00"

assert_classification \
    "session limit output with Claude exit code 1" \
    1 \
    "You've hit your session limit · resets 4:20am (Europe/Warsaw)" \
    "usage_limit"

assert_classification \
    "unrelated Claude CLI failure" \
    1 \
    "Error: authentication failed" \
    "execution_error"

assert_classification \
    "non-limit text mentioning limit without reset" \
    1 \
    "You've hit your context limit. Try a shorter prompt." \
    "execution_error"

echo
echo "Tests run: $tests_run"
echo "Tests failed: $tests_failed"

if [ "$tests_failed" -ne 0 ]; then
    exit 1
fi

echo "All unified parser tests passed."
