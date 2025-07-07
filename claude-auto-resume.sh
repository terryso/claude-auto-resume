#!/bin/bash

# Auto-resume script for Claude CLI tasks
# Depends only on standard shell commands and claude CLI

# Default prompt to use when resuming
DEFAULT_PROMPT="continue"
# Default is to start new session (no -c flag)
USE_CONTINUE_FLAG=false

# Function to show help
show_help() {
    cat << EOF
Usage: claude-auto-resume [OPTIONS] [PROMPT]

Automatically resume Claude CLI tasks after usage limits are lifted.

OPTIONS:
    -p, --prompt PROMPT    Custom prompt to use when resuming (default: "continue")
    -c, --continue        Continue previous conversation (add -c flag to claude command)
    -h, --help           Show this help message

ARGUMENTS:
    PROMPT               Custom prompt to use when resuming (alternative to -p)

EXAMPLES:
    claude-auto-resume                                    # Start new session with "continue"
    claude-auto-resume "implement user authentication"    # Start new session with custom prompt
    claude-auto-resume -p "write unit tests"             # Start new session with -p flag
    claude-auto-resume -c "please continue the task"     # Continue previous conversation
    claude-auto-resume -c -p "resume where we left off"  # Continue previous conversation with -p flag

SECURITY WARNING:
    ⚠️  This script uses --dangerously-skip-permissions which bypasses all safety prompts.
    ⚠️  Claude will execute commands automatically without asking for permission.
    ⚠️  Use only in trusted environments with carefully crafted prompts.

NOTES:
    - By default, starts a new session (uses claude without -c)
    - Use -c/--continue to continue the previous conversation
    - This matches the natural expectation: new session by default, explicit flag to continue

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

# 1. Run the claude CLI command (replace with actual command as needed)
CLAUDE_OUTPUT=$(claude -p 'check' 2>&1)
RET_CODE=$?

# 2. Check if usage limit is reached (output format: Claude AI usage limit reached|<timestamp>)
LIMIT_MSG=$(echo "$CLAUDE_OUTPUT" | grep "Claude AI usage limit reached")

if [ -n "$LIMIT_MSG" ]; then
  # Enter usage limit handling logic
  RESUME_TIMESTAMP=$(echo "$CLAUDE_OUTPUT" | awk -F'|' '{print $2}')
  if ! [[ "$RESUME_TIMESTAMP" =~ ^[0-9]+$ ]] || [ "$RESUME_TIMESTAMP" -le 0 ]; then
    echo "[ERROR] Failed to extract a valid resume timestamp from CLI output. Please check the output format."
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
      # Live countdown
      while [ $WAIT_SECONDS -gt 0 ]; do
        printf "\rResuming in %02d:%02d:%02d..." $((WAIT_SECONDS/3600)) $(( (WAIT_SECONDS%3600)/60 )) $((WAIT_SECONDS%60))
        sleep 1
        NOW_TIMESTAMP=$(date +%s)
        WAIT_SECONDS=$((RESUME_TIMESTAMP - NOW_TIMESTAMP))
      done
      printf "\rResume time has arrived. Retrying now.           \n"
    else
      echo "Claude usage limit detected. Waiting (failed to format resume time, raw timestamp: $RESUME_TIMESTAMP)..."
      sleep $WAIT_SECONDS
    fi
  fi

  sleep 10
  if [ "$USE_CONTINUE_FLAG" = true ]; then
    echo "Automatically continuing previous Claude conversation with prompt: '$CUSTOM_PROMPT'"
    CLAUDE_OUTPUT2=$(claude -c --dangerously-skip-permissions -p "$CUSTOM_PROMPT" 2>&1)
  else
    echo "Automatically starting new Claude session with prompt: '$CUSTOM_PROMPT'"
    CLAUDE_OUTPUT2=$(claude --dangerously-skip-permissions -p "$CUSTOM_PROMPT" 2>&1)
  fi
  RET_CODE2=$?
  if [ $RET_CODE2 -ne 0 ]; then
    echo "[ERROR] Claude CLI failed after resume. Output:"
    echo "$CLAUDE_OUTPUT2"
    exit 4
  fi
  echo "Task has been automatically resumed and completed."
  printf "CLAUDE_OUTPUT: \n"
  echo "$CLAUDE_OUTPUT2"
  exit 0
fi

# 3. If not usage limit, but CLI failed, show error
if [ $RET_CODE -ne 0 ]; then
  echo "[ERROR] Claude CLI execution failed. Output:"
  echo "$CLAUDE_OUTPUT"
  exit 1
fi

echo "No waiting required. Task completed."
exit 0
