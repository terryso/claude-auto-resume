#!/bin/bash

# Auto-resume script for Claude CLI tasks
# Depends only on standard shell commands and claude CLI

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
  echo "Automatically resuming Claude task..."
  CLAUDE_OUTPUT2=$(claude -c --dangerously-skip-permissions -p 'continue' 2>&1)
  RET_CODE2=$?
  if [ $RET_CODE2 -ne 0 ]; then
    echo "[ERROR] Claude CLI failed after resume. Output:"
    echo "$CLAUDE_OUTPUT2"
    exit 4
  fi
  echo "Task has been automatically resumed and completed."
  echo "CLAUDE_OUTPUT: \n $CLAUDE_OUTPUT2"
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
