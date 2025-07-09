#!/bin/bash

# Auto-resume script for Claude CLI tasks
# Depends only on standard shell commands and claude CLI

# Version information
VERSION="1.2.0"

# Default prompt to use when resuming
DEFAULT_PROMPT="continue"
# Default is to start new session (no -c flag)
USE_CONTINUE_FLAG=false

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
    -h, --help           Show this help
    -v, --version        Show version information
    --check              Show system check information

EXAMPLES:
    claude-auto-resume "implement feature"
    claude-auto-resume -c "continue task"
    claude-auto-resume -p "write tests"

⚠️  Uses --dangerously-skip-permissions. Use only in trusted environments.

EOF
}

# Parse command line arguments
CUSTOM_PROMPT="$DEFAULT_PROMPT"

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--prompt)
            CUSTOM_PROMPT="$2"
            shift 2
            ;;
        -c|--continue)
            USE_CONTINUE_FLAG=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--version)
            echo "claude-auto-resume v${VERSION}"
            exit 0
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

# Validate Claude CLI environment before proceeding
validate_claude_cli

# Check network connectivity before proceeding
echo "Checking network connectivity..."
if ! check_network_connectivity; then
    exit 3
fi
echo "Network connectivity confirmed."

# 1. Run the claude CLI command with timeout protection
echo "Executing Claude CLI command..."
CLAUDE_PID=""
CLAUDE_OUTPUT=$(timeout 30s claude -p 'check' 2>&1)
RET_CODE=$?
CLAUDE_PID=""

# Check for timeout scenario (exit code 124 from timeout command)
if [ $RET_CODE -eq 124 ]; then
    echo "[ERROR] Claude CLI operation timed out after 30 seconds."
    echo "[HINT] This may indicate network issues or Claude service problems."
    echo "[SUGGESTION] Try again in a few minutes, or check Claude service status."
    echo "[DEBUG] Command executed: timeout 30s claude -p 'check'"
    exit 3
fi

# Check for empty or malformed output
if [ -z "$CLAUDE_OUTPUT" ] && [ $RET_CODE -eq 0 ]; then
    echo "[ERROR] Claude CLI returned empty output unexpectedly."
    echo "[HINT] This may indicate Claude CLI installation or configuration issues."
    echo "[SUGGESTION] Try running 'claude --help' to verify CLI is working properly."
    echo "[DEBUG] Command succeeded but returned no output"
    exit 5
fi

# 2. Check if usage limit is reached (output format: Claude AI usage limit reached|<timestamp>)
LIMIT_MSG=$(echo "$CLAUDE_OUTPUT" | grep "Claude AI usage limit reached")

if [ -n "$LIMIT_MSG" ]; then
  # Enter usage limit handling logic
  RESUME_TIMESTAMP=$(echo "$CLAUDE_OUTPUT" | awk -F'|' '{print $2}')
  if ! [[ "$RESUME_TIMESTAMP" =~ ^[0-9]+$ ]] || [ "$RESUME_TIMESTAMP" -le 0 ]; then
    echo "[ERROR] Failed to extract a valid resume timestamp from Claude output."
    echo "[HINT] Expected format: 'Claude AI usage limit reached|<timestamp>'"
    echo "[SUGGESTION] Check if Claude CLI output format has changed."
    echo "[DEBUG] Raw output: $CLAUDE_OUTPUT"
    echo "[DEBUG] Extracted timestamp: '$RESUME_TIMESTAMP'"
    exit 2
  fi
  NOW_TIMESTAMP=$(date +%s)
  WAIT_SECONDS=$((RESUME_TIMESTAMP - NOW_TIMESTAMP))
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
  
  # Re-check network connectivity before resuming
  echo "Re-checking network connectivity before resuming..."
  if ! check_network_connectivity; then
    echo "[ERROR] Network connectivity lost during wait period."
    echo "[SUGGESTION] Please check your internet connection and run the script again."
    exit 3
  fi
  
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
  exit 0
fi

# 3. If not usage limit, but CLI failed, show error
if [ $RET_CODE -ne 0 ]; then
  echo "[ERROR] Claude CLI execution failed."
  echo "[HINT] This may indicate authentication, network, or service issues."
  echo "[SUGGESTION] Check your Claude CLI authentication and try again."
  echo "[DEBUG] Exit code: $RET_CODE"
  echo "[DEBUG] Command executed: claude -p 'check'"
  echo "[DEBUG] Output: $CLAUDE_OUTPUT"
  exit 1
fi

echo "No waiting required. Task completed."
exit 0
