#!/bin/bash

# Auto-resume script for Claude CLI tasks
# Depends only on standard shell commands and claude CLI

# Version information
VERSION="1.4.1"

# Default prompt to use when resuming
DEFAULT_PROMPT="continue"
# Default is to start new session (no -c flag)
USE_CONTINUE_FLAG=false
# Custom command execution mode
EXECUTE_MODE=false
CUSTOM_COMMAND=""
# Test mode for simulating usage limits
TEST_MODE=false
TEST_WAIT_SECONDS=0

# Cleanup function for graceful termination
cleanup_on_exit() {
    local exit_code=$?
    
    # Always perform cleanup, regardless of exit code
    cleanup_resources
    
    if [ $exit_code -ne 0 ]; then
        echo ""
        echo "[INFO] Script terminated (exit code: $exit_code)"
        echo "[HINT] Use --help to see usage examples"
    fi
}

# Interrupt handler for SIGINT (Ctrl+C)
interrupt_handler() {
    echo ""
    echo "[INFO] Script interrupted by user (Ctrl+C)"
    echo "[INFO] Cleaning up and exiting gracefully..."
    
    # Perform cleanup
    cleanup_resources
    
    # Exit with appropriate code for interrupted processes
    exit 130
}

# Global flag to prevent double cleanup
CLEANUP_DONE=false


# Cleanup resources and temporary state
cleanup_resources() {
    # Prevent double cleanup
    if [ "$CLEANUP_DONE" = true ]; then
        return
    fi
    
    # Kill any background processes if they exist
    if [ -n "$CLAUDE_PID" ]; then
        echo "[INFO] Terminating Claude CLI process (PID: $CLAUDE_PID)..."
        kill $CLAUDE_PID 2>/dev/null
        # Wait a bit for graceful termination
        sleep 1
        # Force kill if still running
        kill -9 $CLAUDE_PID 2>/dev/null
    fi
    
    # Kill any other potential background processes started by this script
    # Check for any timeout processes that might be lingering
    pkill -f "timeout.*claude" 2>/dev/null
    
    # Kill any background processes from custom commands
    # This is a placeholder - specific cleanup would depend on the commands being run
    # Users should ensure their custom commands handle cleanup appropriately
    
    # Clean up any temporary files or state
    # Currently the script doesn't create temp files, but this provides
    # a placeholder for future enhancements
    
    # Reset variables
    CLAUDE_PID=""
    
    # Mark cleanup as done
    CLEANUP_DONE=true
    
    # echo "[INFO] Cleanup completed"
}

# Set up signal handlers for graceful cleanup
trap cleanup_on_exit EXIT
trap interrupt_handler INT TERM

# Cross-platform timeout wrapper (GNU timeout not available on macOS)
portable_timeout() {
    local seconds="${1%s}"  # Strip trailing 's' if present
    shift
    if command -v timeout >/dev/null 2>&1; then
        timeout "$seconds" "$@"
    elif command -v gtimeout >/dev/null 2>&1; then
        gtimeout "$seconds" "$@"
    else
        # macOS/BSD fallback: run command in background with watchdog
        "$@" &
        local pid=$!
        ( sleep "$seconds" && kill "$pid" 2>/dev/null ) &
        local watcher=$!
        wait "$pid" 2>/dev/null
        local ret=$?
        kill "$watcher" 2>/dev/null
        wait "$watcher" 2>/dev/null 2>&1
        # Killed by signal means timeout occurred
        if [ $ret -ge 128 ]; then
            return 124
        fi
        return $ret
    fi
}

# Function to execute custom commands with proper error handling
execute_custom_command() {
    local command="$1"
    local start_time=$(date +%s)
    
    echo "⚠️  WARNING: About to execute custom command: '$command'"
    echo "⚠️  This command will be executed with full shell privileges."
    echo "⚠️  Press Ctrl+C within 5 seconds to cancel..."
    
    # 5-second countdown for user to cancel
    for i in 5 4 3 2 1; do
        printf "\rExecuting in %d seconds... " $i
        sleep 1
    done
    printf "\rExecuting custom command...                    \n"
    
    echo "Executing: $command"
    echo "===================="
    
    # Execute the command with proper error handling
    # Use eval to support complex commands with pipes and redirections
    eval "$command"
    local exit_code=$?
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo "===================="
    echo "Command completed with exit code: $exit_code"
    echo "Execution time: ${duration} seconds"
    
    if [ $exit_code -eq 0 ]; then
        echo "✓ Custom command executed successfully."
    else
        echo "✗ Custom command failed with exit code: $exit_code"
        echo "[HINT] Check the command syntax and permissions."
        echo "[DEBUG] Command: $command"
    fi
    
    return $exit_code
}

# Function to extract timestamp from old format: Claude AI usage limit reached|<timestamp>
extract_old_format_timestamp() {
    local claude_output="$1"
    local resume_timestamp
    
    resume_timestamp=$(echo "$claude_output" | awk -F'|' '{print $2}')
    if ! [[ "$resume_timestamp" =~ ^[0-9]+$ ]] || [ "$resume_timestamp" -le 0 ]; then
        echo "[ERROR] Failed to extract a valid resume timestamp from Claude output."
        echo "[HINT] Expected format: 'Claude AI usage limit reached|<timestamp>'"
        echo "[SUGGESTION] Check if Claude CLI output format has changed."
        echo "[DEBUG] Raw output: $claude_output"
        echo "[DEBUG] Extracted timestamp: '$resume_timestamp'"
        exit 2
    fi
    
    echo "$resume_timestamp"
}

# Function to extract timestamp from new format: X-hour limit reached ∙ resets Xam/pm
# Also handles newest format: You've hit your limit · resets 2am (Europe/Paris)
extract_new_format_timestamp() {
    local claude_output="$1"
    local reset_time reset_hour reset_period reset_hour_24
    local now_timestamp today_reset resume_timestamp
    local output_tz=""

    # Extract the reset time (e.g., "3am")
    reset_time=$(echo "$claude_output" | grep -o "resets [0-9]*[ap]m" | awk '{print $2}')
    if [ -z "$reset_time" ]; then
        echo "[ERROR] Failed to extract reset time from new Claude output format."
        echo "[HINT] Expected format: 'X-hour limit reached ∙ resets Xam/pm'"
        echo "[SUGGESTION] Check if Claude CLI output format has changed."
        echo "[DEBUG] Raw output: $claude_output"
        exit 2
    fi

    # Extract timezone if present, e.g., "(Europe/Paris)" -> "Europe/Paris"
    output_tz=$(echo "$claude_output" | grep -o "resets [0-9]*[ap]m ([^)]*)" | grep -o '([^)]*)' | tr -d '()')

    # Convert reset time to timestamp
    # Extract hour and am/pm
    reset_hour=$(echo "$reset_time" | sed 's/[ap]m//')
    reset_period=$(echo "$reset_time" | grep -o '[ap]m')

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
    # If a timezone was specified in the output, use it for date calculations
    now_timestamp=$(date +%s)

    # Get today's reset time (in the correct timezone if specified)
    if date --version >/dev/null 2>&1; then
        # GNU date (Linux)
        if [ -n "$output_tz" ]; then
            today_reset=$(TZ="$output_tz" date -d "today ${reset_hour_24}:00:00" +%s)
        else
            today_reset=$(date -d "today ${reset_hour_24}:00:00" +%s)
        fi
    else
        # BSD date (macOS)
        if [ -n "$output_tz" ]; then
            today_reset=$(TZ="$output_tz" date -j -f "%Y-%m-%d %H:%M:%S" "$(TZ="$output_tz" date +%Y-%m-%d) ${reset_hour_24}:00:00" +%s)
        else
            today_reset=$(date -j -f "%Y-%m-%d %H:%M:%S" "$(date +%Y-%m-%d) ${reset_hour_24}:00:00" +%s)
        fi
    fi

    # If reset time has passed today, use tomorrow's reset time
    if [ $now_timestamp -gt $today_reset ]; then
        if date --version >/dev/null 2>&1; then
            # GNU date (Linux)
            if [ -n "$output_tz" ]; then
                resume_timestamp=$(TZ="$output_tz" date -d "tomorrow ${reset_hour_24}:00:00" +%s)
            else
                resume_timestamp=$(date -d "tomorrow ${reset_hour_24}:00:00" +%s)
            fi
        else
            # BSD date (macOS)
            if [ -n "$output_tz" ]; then
                local tomorrow=$(TZ="$output_tz" date -j -v+1d +%Y-%m-%d)
                resume_timestamp=$(TZ="$output_tz" date -j -f "%Y-%m-%d %H:%M:%S" "${tomorrow} ${reset_hour_24}:00:00" +%s)
            else
                local tomorrow=$(date -j -v+1d +%Y-%m-%d)
                resume_timestamp=$(date -j -f "%Y-%m-%d %H:%M:%S" "${tomorrow} ${reset_hour_24}:00:00" +%s)
            fi
        fi
    else
        resume_timestamp=$today_reset
    fi

    echo "$resume_timestamp"
}

# Function to check network connectivity
check_network_connectivity() {
    # Try multiple connectivity checks for better reliability
    local connectivity_failed=true
    
    # Method 1: Ping Google DNS (most reliable for basic connectivity)
    if ping -c 1 -W 3 8.8.8.8 >/dev/null 2>&1; then
        connectivity_failed=false
    # Method 2: Try alternative DNS server
    elif ping -c 1 -W 3 1.1.1.1 >/dev/null 2>&1; then
        connectivity_failed=false
    # Method 3: Try reaching a major website if ping is blocked
    elif command -v curl >/dev/null 2>&1 && curl -s --max-time 5 --connect-timeout 3 https://www.google.com >/dev/null 2>&1; then
        connectivity_failed=false
    # Method 4: Try wget as fallback if curl unavailable
    elif command -v wget >/dev/null 2>&1 && wget -q --timeout=5 --tries=1 -O /dev/null https://www.google.com 2>/dev/null; then
        connectivity_failed=false
    fi
    
    if [ "$connectivity_failed" = true ]; then
        echo "[ERROR] Network connectivity check failed."
        echo "[HINT] Claude CLI requires internet connection to function properly."
        echo "[SUGGESTION] Please check your internet connection and try again."
        echo "[DEBUG] Tested: ping 8.8.8.8, ping 1.1.1.1, and HTTPS connectivity"
        return 3
    fi
    
    return 0
}

# Function to validate Claude CLI environment
validate_claude_cli() {
    # Check if Claude CLI is installed and accessible
    if ! command -v claude &> /dev/null; then
        echo "[ERROR] Claude CLI not found. Please install Claude CLI first."
        echo "[SUGGESTION] Visit https://claude.ai/code for installation instructions."
        echo "[DEBUG] Searched PATH for 'claude' command"
        exit 1
    fi
    
    # Check if --dangerously-skip-permissions flag is supported
    if ! claude --help | grep -q "dangerously-skip-permissions"; then
        echo "[WARNING] Your Claude CLI version may not support --dangerously-skip-permissions flag."
        echo "[SUGGESTION] This script requires a recent version of Claude CLI. Please consider updating."
        echo "[DEBUG] Run 'claude --help' to see available options"
        echo "The script will continue but may fail during execution."
    fi
}

# Function to show help
show_help() {
    cat << EOF
Usage: claude-auto-resume [OPTIONS] [PROMPT]

Automatically resume Claude CLI tasks after usage limits are lifted.

OPTIONS:
    -p, --prompt PROMPT    Custom prompt (default: "continue")
    -c, --continue        Continue previous conversation
    -e, --execute COMMAND  Execute custom command after usage limit wait period
    --cmd COMMAND         Execute custom command after usage limit wait period (alias for -e)
    -h, --help           Show this help
    -v, --version        Show version information
    --check              Show system check information
    --test-mode SECONDS   [DEV] Simulate usage limit with specified wait time in seconds

EXAMPLES:
    claude-auto-resume "implement feature"
    claude-auto-resume -c "continue task"
    claude-auto-resume -p "write tests"
    claude-auto-resume -e "npm run dev"     # Executes after usage limit wait
    claude-auto-resume --cmd "python app.py"  # Executes after usage limit wait
    claude-auto-resume --test-mode 10 -e "echo test"  # [DEV] Test with 10s wait

⚠️  Uses --dangerously-skip-permissions. Use only in trusted environments.
⚠️  Custom command execution allows arbitrary shell commands. Use with caution.

EOF
}

# Parse command line arguments
CUSTOM_PROMPT="$DEFAULT_PROMPT"

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--prompt)
            if [ -z "$2" ]; then
                echo "[ERROR] Option $1 requires a prompt argument."
                echo "[HINT] Provide a prompt after $1 flag."
                echo "[SUGGESTION] Example: claude-auto-resume $1 'continue with task'"
                exit 1
            fi
            CUSTOM_PROMPT="$2"
            shift 2
            ;;
        -c|--continue)
            USE_CONTINUE_FLAG=true
            shift
            ;;
        -e|--execute|--cmd)
            if [ -z "$2" ]; then
                echo "[ERROR] Option $1 requires a command argument."
                echo "[HINT] Provide a command to execute after $1 flag."
                echo "[SUGGESTION] Example: claude-auto-resume $1 'npm run dev'"
                exit 1
            fi
            EXECUTE_MODE=true
            CUSTOM_COMMAND="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--version)
            echo "claude-auto-resume v${VERSION}"
            exit 0
            ;;
        --test-mode)
            if [ -z "$2" ] || ! [[ "$2" =~ ^[0-9]+$ ]]; then
                echo "[ERROR] Option $1 requires a valid number of seconds."
                echo "[HINT] Provide number of seconds to simulate wait period."
                echo "[SUGGESTION] Example: claude-auto-resume --test-mode 10 -e 'echo test'"
                exit 1
            fi
            TEST_MODE=true
            TEST_WAIT_SECONDS="$2"
            shift 2
            ;;
        --check)
            # Display comprehensive system check information
            echo "claude-auto-resume v${VERSION} - System Check"
            echo "================================================"
            echo ""
            
            # Script version
            echo "Script Information:"
            echo "  Version: ${VERSION}"
            echo "  Location: $(realpath "$0")"
            echo ""
            
            # Claude CLI check
            echo "Claude CLI Information:"
            if command -v claude &> /dev/null; then
                echo "  Status: Available"
                echo "  Location: $(which claude)"
                
                # Try to get Claude CLI version
                CLAUDE_VERSION=$(claude --version 2>/dev/null || echo "Unknown")
                echo "  Version: ${CLAUDE_VERSION}"
                
                # Check for dangerously-skip-permissions support
                if claude --help | grep -q "dangerously-skip-permissions"; then
                    echo "  --dangerously-skip-permissions: Supported"
                else
                    echo "  --dangerously-skip-permissions: Not supported"
                fi
            else
                echo "  Status: Not found"
                echo "  [ERROR] Claude CLI not found in PATH"
            fi
            echo ""
            
            # System compatibility
            echo "System Compatibility:"
            echo "  OS: $(uname -s)"
            echo "  Architecture: $(uname -m)"
            echo "  Shell: $SHELL"
            echo ""
            
            # Network utilities check
            echo "Network Utilities:"
            echo "  ping: $(command -v ping &> /dev/null && echo "Available" || echo "Not found")"
            echo "  curl: $(command -v curl &> /dev/null && echo "Available" || echo "Not found")"
            echo "  wget: $(command -v wget &> /dev/null && echo "Available" || echo "Not found")"
            echo ""
            
            # Environment validation
            echo "Environment Validation:"
            if command -v claude &> /dev/null; then
                echo "  Claude CLI: ✓ Available"
            else
                echo "  Claude CLI: ✗ Not found"
            fi
            
            # Network connectivity check
            echo -n "  Network connectivity: "
            if check_network_connectivity &> /dev/null; then
                echo "✓ Connected"
            else
                echo "✗ Failed"
            fi
            
            exit 0
            ;;
        -*)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
        *)
            # If no flag specified, treat as prompt argument
            CUSTOM_PROMPT="$1"
            shift
            ;;
    esac
done

# Validate command-line arguments
if [ "$EXECUTE_MODE" = true ] && [ "$USE_CONTINUE_FLAG" = true ]; then
    echo "[ERROR] Cannot use both custom command execution (-e/--execute/--cmd) and continue flag (-c/--continue)."
    echo "[HINT] Choose either Claude conversation continuation or custom command execution."
    echo "[SUGGESTION] Use 'claude-auto-resume --help' to see usage examples."
    exit 1
fi

if [ "$EXECUTE_MODE" = true ] && [ -z "$CUSTOM_COMMAND" ]; then
    echo "[ERROR] Custom command cannot be empty when using execute mode."
    echo "[HINT] Provide a command to execute after -e/--execute/--cmd flag."
    echo "[SUGGESTION] Example: claude-auto-resume -e 'npm run dev'"
    exit 1
fi

# Validate Claude CLI environment before proceeding (skip if in execute mode)
if [ "$EXECUTE_MODE" = false ]; then
    validate_claude_cli
fi

# Check network connectivity before proceeding
echo "Checking network connectivity..."
if ! check_network_connectivity; then
    exit 3
fi
echo "Network connectivity confirmed."

# 1. Run the claude CLI command with timeout protection (unless in execute mode)
if [ "$EXECUTE_MODE" = true ]; then
    echo "Execute mode detected. Checking for usage limits..."
    echo "[INFO] This check may take 1-2 minutes depending on network conditions..."
    # In execute mode, we still need to check Claude usage limits
    # but skip if Claude CLI is not available
    if command -v claude &> /dev/null; then
        CLAUDE_PID=""
        CLAUDE_OUTPUT=$(portable_timeout 300 claude -p 'check' 2>&1)
        RET_CODE=$?
        CLAUDE_PID=""
    else
        echo "[WARNING] Claude CLI not found. Skipping usage limit check in execute mode."
        CLAUDE_OUTPUT=""
        RET_CODE=0
    fi
else
    echo "Executing Claude CLI command..."
    echo "[INFO] This check may take 1-2 minutes depending on network conditions..."
    CLAUDE_PID=""
    CLAUDE_OUTPUT=$(portable_timeout 300 claude -p 'check' 2>&1)
    RET_CODE=$?
    CLAUDE_PID=""
fi

# Check for timeout scenario (exit code 124 from timeout command)
if [ $RET_CODE -eq 124 ]; then
    if [ "$EXECUTE_MODE" = true ]; then
        echo "[WARNING] Claude CLI operation timed out after 300 seconds in execute mode."
        echo "[HINT] Will proceed with custom command execution without usage limit detection."
    else
        echo "[ERROR] Claude CLI operation timed out after 300 seconds."
        echo "[HINT] This may indicate network issues or Claude service problems."
        echo "[SUGGESTION] Try again in a few minutes, or check Claude service status."
        echo "[DEBUG] Command executed: timeout 300s claude -p 'check'"
        exit 3
    fi
fi

# Check for empty or malformed output
if [ -z "$CLAUDE_OUTPUT" ] && [ $RET_CODE -eq 0 ] && [ "$EXECUTE_MODE" = false ]; then
    echo "[ERROR] Claude CLI returned empty output unexpectedly."
    echo "[HINT] This may indicate Claude CLI installation or configuration issues."
    echo "[SUGGESTION] Try running 'claude --help' to verify CLI is working properly."
    echo "[DEBUG] Command succeeded but returned no output"
    exit 5
fi

# 2. Check if usage limit is reached (support both old and new formats)
# Old format: Claude AI usage limit reached|<timestamp>
# New format: 5-hour limit reached ∙ resets 3am
# Newest format: You've hit your limit · resets 2am (Europe/Paris)
LIMIT_MSG=$(echo "$CLAUDE_OUTPUT" | grep -E "(Claude AI usage limit reached|limit reached.*resets|hit your limit.*resets)")

# Test mode: simulate usage limit
if [ "$TEST_MODE" = true ]; then
  echo "[TEST MODE] Simulating usage limit with ${TEST_WAIT_SECONDS} seconds wait time..."
  LIMIT_MSG="Claude AI usage limit reached|simulated"
fi

if [ -n "$LIMIT_MSG" ]; then
  # Enter usage limit handling logic
  if [ "$TEST_MODE" = true ]; then
    # Test mode: use custom wait time
    NOW_TIMESTAMP=$(date +%s)
    RESUME_TIMESTAMP=$((NOW_TIMESTAMP + TEST_WAIT_SECONDS))
    WAIT_SECONDS=$TEST_WAIT_SECONDS
  else
    # Normal mode: extract timestamp from Claude output
    # Check if it's the old format with timestamp
    if echo "$CLAUDE_OUTPUT" | grep -q "Claude AI usage limit reached|"; then
      # Old format: Claude AI usage limit reached|<timestamp>
      RESUME_TIMESTAMP=$(extract_old_format_timestamp "$CLAUDE_OUTPUT")
    else
      # New format: X-hour limit reached ∙ resets Xam/pm
      RESUME_TIMESTAMP=$(extract_new_format_timestamp "$CLAUDE_OUTPUT")
    fi
    
    NOW_TIMESTAMP=$(date +%s)
    WAIT_SECONDS=$((RESUME_TIMESTAMP - NOW_TIMESTAMP))
  fi
  if [ $WAIT_SECONDS -le 0 ]; then
    echo "Resume time has arrived. Retrying now."
  else
    # Only format time if WAIT_SECONDS is positive
    if [ $WAIT_SECONDS -gt 0 ]; then
      # Format time compatible with Linux and macOS
      if date --version >/dev/null 2>&1; then
        # GNU date (Linux)
        RESUME_TIME_FMT=$(date -d "@$RESUME_TIMESTAMP" "+%Y-%m-%d %H:%M:%S")
      else
        # BSD date (macOS)
        RESUME_TIME_FMT=$(date -r $RESUME_TIMESTAMP "+%Y-%m-%d %H:%M:%S")
      fi
      if [ -z "$RESUME_TIME_FMT" ] || [[ "$RESUME_TIME_FMT" == *"?"* ]]; then
        echo "Claude usage limit detected. Waiting for $WAIT_SECONDS seconds (failed to format resume time, raw timestamp: $RESUME_TIMESTAMP)..."
      else
        echo "Claude usage limit detected. Waiting until $RESUME_TIME_FMT..."
      fi
      # Live countdown (interruptible with Ctrl+C)
      while [ $WAIT_SECONDS -gt 0 ]; do
        printf "\rResuming in %02d:%02d:%02d..." $((WAIT_SECONDS/3600)) $(( (WAIT_SECONDS%3600)/60 )) $((WAIT_SECONDS%60))
        # Sleep is interruptible by signal handlers
        sleep 1
        NOW_TIMESTAMP=$(date +%s)
        WAIT_SECONDS=$((RESUME_TIMESTAMP - NOW_TIMESTAMP))
      done
      printf "\rResume time has arrived. Retrying now.           \n"
    else
      echo "Claude usage limit detected. Waiting (failed to format resume time, raw timestamp: $RESUME_TIMESTAMP)..."
      # Sleep is interruptible by signal handlers
      sleep $WAIT_SECONDS
    fi
  fi

  # Brief pause before resuming (interruptible)
  sleep 10
  
  # Re-check network connectivity before resuming (skip in execute mode)
  if [ "$EXECUTE_MODE" = false ]; then
    echo "Re-checking network connectivity before resuming..."
    if ! check_network_connectivity; then
      echo "[ERROR] Network connectivity lost during wait period."
      echo "[SUGGESTION] Please check your internet connection and run the script again."
      exit 3
    fi
  fi
  
  # Execute the appropriate command based on mode
  if [ "$EXECUTE_MODE" = true ]; then
    echo "Executing custom command after wait period..."
    execute_custom_command "$CUSTOM_COMMAND"
    RET_CODE2=$?
    
    if [ $RET_CODE2 -ne 0 ]; then
      echo "[ERROR] Custom command failed with exit code: $RET_CODE2"
      echo "[HINT] Check the command syntax and permissions."
      echo "[DEBUG] Command: $CUSTOM_COMMAND"
      exit 4
    fi
    echo "Custom command has been executed successfully."
  else
    if [ "$USE_CONTINUE_FLAG" = true ]; then
      echo "Automatically continuing previous Claude conversation with prompt: '$CUSTOM_PROMPT'"
      CLAUDE_PID=""
      CLAUDE_OUTPUT2=$(claude -c --dangerously-skip-permissions -p "$CUSTOM_PROMPT" 2>&1)
      RET_CODE2=$?
      CLAUDE_PID=""
    else
      echo "Automatically starting new Claude session with prompt: '$CUSTOM_PROMPT'"
      CLAUDE_PID=""
      CLAUDE_OUTPUT2=$(claude --dangerously-skip-permissions -p "$CUSTOM_PROMPT" 2>&1)
      RET_CODE2=$?
      CLAUDE_PID=""
    fi
    
    if [ $RET_CODE2 -ne 0 ]; then
      echo "[ERROR] Claude CLI failed after resume."
      echo "[HINT] This may indicate authentication issues or service problems."
      echo "[SUGGESTION] Try running 'claude --help' to verify CLI is working properly."
      echo "[DEBUG] Exit code: $RET_CODE2"
      echo "[DEBUG] Output: $CLAUDE_OUTPUT2"
      exit 4
    fi
    echo "Task has been automatically resumed and completed."
    printf "CLAUDE_OUTPUT: \n"
    echo "$CLAUDE_OUTPUT2"
  fi
  exit 0
fi

# 3. If not usage limit, but CLI failed, show error
if [ $RET_CODE -ne 0 ] && [ "$EXECUTE_MODE" = false ]; then
  echo "[ERROR] Claude CLI execution failed."
  echo "[HINT] This may indicate authentication, network, or service issues."
  echo "[SUGGESTION] Check your Claude CLI authentication and try again."
  echo "[DEBUG] Exit code: $RET_CODE"
  echo "[DEBUG] Command executed: claude -p 'check'"
  echo "[DEBUG] Output: $CLAUDE_OUTPUT"
  exit 1
fi

# 4. Handle execute mode when no usage limit is detected
if [ "$EXECUTE_MODE" = true ]; then
  echo "No usage limit detected. Custom command will only execute after a usage limit wait period."
  echo "Since there is no usage limit, the custom command will not be executed."
  echo "Use claude-auto-resume in execute mode only when you expect usage limits."
  exit 0
fi

echo "No waiting required. Task completed."
exit 0
