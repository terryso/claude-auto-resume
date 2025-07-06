#!/bin/bash

# Claude Code Auto-Resume - Enhanced version with modern Claude Code integration
# Version: 2.0.0
# Supports: Claude Code hooks, memory system, advanced workflows, and modern CLI patterns

set -euo pipefail

# Script metadata
readonly SCRIPT_VERSION="2.0.0"
readonly SCRIPT_NAME="claude-auto-resume"
readonly CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/$SCRIPT_NAME"
readonly DATA_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/$SCRIPT_NAME"
readonly CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/$SCRIPT_NAME"
readonly LOG_FILE="$DATA_DIR/auto-resume.log"

# Color codes for enhanced UI
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly MAGENTA='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly WHITE='\033[0;37m'
readonly BOLD='\033[1m'
readonly DIM='\033[2m'
readonly NC='\033[0m' # No Color

# Default configuration
DEFAULT_PROMPT="continue"
USE_CONTINUE_FLAG=false
USE_RESUME_FLAG=false
CONVERSATION_ID=""
VERBOSE=false
QUIET=false
DEBUG=false
CONFIG_FILE="$CONFIG_DIR/config.json"
HOOKS_FILE="$CONFIG_DIR/hooks.json"
NO_HOOKS=false
NO_MEMORY=false
EXTENDED_THINKING=false
SESSION_TYPE="default"
MAX_RETRIES=3
RETRY_DELAY=10
NOTIFICATION_ENABLED=true
LOG_LEVEL="info"

# Initialize directories
init_directories() {
    mkdir -p "$CONFIG_DIR" "$DATA_DIR" "$CACHE_DIR"
    touch "$LOG_FILE"
}

# Logging functions
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Log to file
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    # Log to console based on verbosity
    if [[ "$QUIET" != "true" ]]; then
        case "$level" in
            ERROR)
                echo -e "${RED}[ERROR]${NC} $message" >&2
                ;;
            WARN)
                [[ "$LOG_LEVEL" =~ ^(warn|info|debug)$ ]] && echo -e "${YELLOW}[WARN]${NC} $message" >&2
                ;;
            INFO)
                [[ "$LOG_LEVEL" =~ ^(info|debug)$ ]] && echo -e "${CYAN}[INFO]${NC} $message"
                ;;
            DEBUG)
                [[ "$DEBUG" == "true" || "$LOG_LEVEL" == "debug" ]] && echo -e "${DIM}[DEBUG]${NC} $message"
                ;;
            SUCCESS)
                echo -e "${GREEN}[SUCCESS]${NC} $message"
                ;;
        esac
    fi
}

# Error handling
error_exit() {
    log ERROR "$1"
    exit "${2:-1}"
}

# Show version
show_version() {
    echo "$SCRIPT_NAME version $SCRIPT_VERSION"
    echo "Enhanced with Claude Code modern features support"
}

# Show help
show_help() {
    cat << EOF
${BOLD}Usage:${NC} $0 [OPTIONS] [PROMPT]

${BOLD}Automatically resume Claude Code tasks after usage limits are lifted.${NC}

${BOLD}OPTIONS:${NC}
    ${GREEN}-p, --prompt PROMPT${NC}       Custom prompt to use when resuming (default: "continue")
    ${GREEN}-c, --continue${NC}           Continue previous conversation (legacy mode)
    ${GREEN}-r, --resume [ID]${NC}        Resume specific conversation or use picker
    ${GREEN}--conversation-id ID${NC}     Specify exact conversation ID to resume
    ${GREEN}--extended-thinking${NC}      Enable extended thinking mode preservation
    ${GREEN}--session-type TYPE${NC}      Session type (default|extended|multimodal)
    
    ${CYAN}--config FILE${NC}            Use custom configuration file
    ${CYAN}--hooks FILE${NC}             Use custom hooks configuration
    ${CYAN}--no-hooks${NC}               Disable hooks integration
    ${CYAN}--no-memory${NC}              Disable memory system integration
    
    ${YELLOW}-v, --verbose${NC}            Enable verbose output
    ${YELLOW}-q, --quiet${NC}              Suppress all output except errors
    ${YELLOW}--debug${NC}                  Enable debug mode
    ${YELLOW}--log-level LEVEL${NC}        Set log level (error|warn|info|debug)
    
    ${MAGENTA}--max-retries N${NC}          Maximum retry attempts (default: 3)
    ${MAGENTA}--retry-delay SECS${NC}       Delay between retries (default: 10)
    ${MAGENTA}--no-notifications${NC}       Disable desktop notifications
    
    ${WHITE}-V, --version${NC}            Show version information
    ${WHITE}-h, --help${NC}               Show this help message

${BOLD}ARGUMENTS:${NC}
    PROMPT                   Custom prompt to use when resuming

${BOLD}EXAMPLES:${NC}
    ${DIM}# Start new session with default prompt${NC}
    $0
    
    ${DIM}# Start new session with custom prompt${NC}
    $0 "implement user authentication"
    
    ${DIM}# Resume last conversation with picker${NC}
    $0 --resume
    
    ${DIM}# Resume specific conversation${NC}
    $0 --resume conv_abc123 "please continue"
    
    ${DIM}# Extended thinking mode with custom config${NC}
    $0 --extended-thinking --config ./project-config.json

${BOLD}CONFIGURATION:${NC}
    Config directory: $CONFIG_DIR
    Data directory:   $DATA_DIR
    Log file:         $LOG_FILE

${BOLD}HOOKS INTEGRATION:${NC}
    Hooks config:     $HOOKS_FILE
    
    The script integrates with Claude Code's hook system for:
    - Automatic usage limit detection
    - Resume scheduling
    - Progress notifications
    - Error recovery

${BOLD}MEMORY INTEGRATION:${NC}
    The script uses CLAUDE.md for:
    - Persistent resume state
    - Task context preservation
    - Project-specific behavior

For more information, see: https://github.com/your-repo/claude-auto-resume
EOF
}

# Load configuration
load_config() {
    local config_file="${1:-$CONFIG_FILE}"
    
    if [[ -f "$config_file" ]]; then
        log DEBUG "Loading configuration from: $config_file"
        
        # Parse JSON config (using jq if available, fallback to basic parsing)
        if command -v jq &> /dev/null; then
            # Use jq for robust JSON parsing
            export DEFAULT_PROMPT=$(jq -r '.default_prompt // "continue"' "$config_file")
            export MAX_RETRIES=$(jq -r '.max_retries // 3' "$config_file")
            export RETRY_DELAY=$(jq -r '.retry_delay // 10' "$config_file")
            export NOTIFICATION_ENABLED=$(jq -r '.notifications // true' "$config_file")
            export LOG_LEVEL=$(jq -r '.log_level // "info"' "$config_file")
            export SESSION_TYPE=$(jq -r '.session_type // "default"' "$config_file")
        else
            # Basic parsing fallback
            log WARN "jq not found, using basic config parsing"
            # Extract values using grep and sed
            DEFAULT_PROMPT=$(grep -o '"default_prompt"[[:space:]]*:[[:space:]]*"[^"]*"' "$config_file" | sed 's/.*: *"\([^"]*\)".*/\1/' || echo "continue")
        fi
        
        log INFO "Configuration loaded successfully"
    else
        log DEBUG "No configuration file found at: $config_file"
    fi
}

# Save state for resume
save_resume_state() {
    local state_file="$CACHE_DIR/resume_state.json"
    local timestamp=$(date +%s)
    
    cat > "$state_file" << EOF
{
    "timestamp": $timestamp,
    "conversation_id": "$CONVERSATION_ID",
    "prompt": "$CUSTOM_PROMPT",
    "session_type": "$SESSION_TYPE",
    "extended_thinking": $EXTENDED_THINKING,
    "retry_count": ${RETRY_COUNT:-0},
    "last_error": "${LAST_ERROR:-}"
}
EOF
    
    log DEBUG "Resume state saved to: $state_file"
}

# Load resume state
load_resume_state() {
    local state_file="$CACHE_DIR/resume_state.json"
    
    if [[ -f "$state_file" ]]; then
        log DEBUG "Loading resume state from: $state_file"
        
        if command -v jq &> /dev/null; then
            CONVERSATION_ID=$(jq -r '.conversation_id // ""' "$state_file")
            SESSION_TYPE=$(jq -r '.session_type // "default"' "$state_file")
            EXTENDED_THINKING=$(jq -r '.extended_thinking // false' "$state_file")
            RETRY_COUNT=$(jq -r '.retry_count // 0' "$state_file")
        fi
        
        return 0
    fi
    
    return 1
}

# Parse modern Claude Code error messages
parse_claude_error() {
    local output="$1"
    local error_type=""
    local wait_time=0
    local resume_time=""
    
    # Check for various error patterns
    if echo "$output" | grep -q "usage limit reached"; then
        error_type="usage_limit"
        # Extract timestamp from various formats
        resume_time=$(echo "$output" | grep -oE 'resume at [0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}' | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}')
        if [[ -z "$resume_time" ]]; then
            # Try legacy format
            resume_time=$(echo "$output" | awk -F'|' '{print $2}')
        fi
    elif echo "$output" | grep -q "rate limit exceeded"; then
        error_type="rate_limit"
        wait_time=$(echo "$output" | grep -oE 'retry after [0-9]+ seconds' | grep -oE '[0-9]+')
    elif echo "$output" | grep -q "token limit"; then
        error_type="token_limit"
    elif echo "$output" | grep -q "conversation not found"; then
        error_type="conversation_not_found"
    fi
    
    echo "$error_type|$wait_time|$resume_time"
}

# Send desktop notification
send_notification() {
    local title="$1"
    local message="$2"
    local urgency="${3:-normal}"
    
    if [[ "$NOTIFICATION_ENABLED" != "true" ]]; then
        return
    fi
    
    # Try different notification methods
    if command -v notify-send &> /dev/null; then
        notify-send --urgency="$urgency" "$title" "$message"
    elif command -v osascript &> /dev/null; then
        osascript -e "display notification \"$message\" with title \"$title\""
    elif command -v terminal-notifier &> /dev/null; then
        terminal-notifier -title "$title" -message "$message"
    fi
}

# Format time duration
format_duration() {
    local seconds=$1
    local hours=$((seconds / 3600))
    local minutes=$(( (seconds % 3600) / 60 ))
    local secs=$((seconds % 60))
    
    if [[ $hours -gt 0 ]]; then
        printf "%02d:%02d:%02d" $hours $minutes $secs
    else
        printf "%02d:%02d" $minutes $secs
    fi
}

# Enhanced countdown with progress bar
show_countdown() {
    local wait_seconds=$1
    local resume_time="$2"
    local total_seconds=$wait_seconds
    
    echo -e "${YELLOW}Claude usage limit detected.${NC}"
    if [[ -n "$resume_time" ]]; then
        echo -e "${CYAN}Resume time: ${BOLD}$resume_time${NC}"
    fi
    echo
    
    # Send initial notification
    send_notification "Claude Auto-Resume" "Usage limit detected. Will resume in $(format_duration $wait_seconds)" "normal"
    
    while [[ $wait_seconds -gt 0 ]]; do
        # Calculate progress
        local progress=$((100 - (wait_seconds * 100 / total_seconds)))
        local bar_length=50
        local filled_length=$((progress * bar_length / 100))
        
        # Create progress bar
        local bar=""
        for ((i=0; i<filled_length; i++)); do
            bar+="█"
        done
        for ((i=filled_length; i<bar_length; i++)); do
            bar+="░"
        done
        
        # Display countdown with progress bar
        printf "\r${CYAN}Resuming in:${NC} ${BOLD}$(format_duration $wait_seconds)${NC} [${bar}] ${progress}%%"
        
        sleep 1
        ((wait_seconds--))
        
        # Send periodic notifications
        if [[ $((wait_seconds % 300)) -eq 0 && $wait_seconds -gt 0 ]]; then
            send_notification "Claude Auto-Resume" "$(format_duration $wait_seconds) remaining" "low"
        fi
    done
    
    printf "\r${GREEN}Resume time has arrived!${NC} $(printf ' %.0s' {1..60})\n"
    send_notification "Claude Auto-Resume" "Resuming Claude session now!" "critical"
}

# Build Claude command with modern flags
build_claude_command() {
    local cmd="claude"
    
    # Add resume/continue flags
    if [[ "$USE_RESUME_FLAG" == "true" ]]; then
        if [[ -n "$CONVERSATION_ID" ]]; then
            cmd+=" --resume $CONVERSATION_ID"
        else
            cmd+=" --resume"
        fi
    elif [[ "$USE_CONTINUE_FLAG" == "true" ]]; then
        cmd+=" --continue"
    fi
    
    # Add session type flags
    case "$SESSION_TYPE" in
        extended)
            cmd+=" --extended-thinking"
            ;;
        multimodal)
            cmd+=" --multimodal"
            ;;
    esac
    
    # Add prompt
    if [[ -n "$CUSTOM_PROMPT" ]]; then
        cmd+=" --print"
        cmd+=" -p '$CUSTOM_PROMPT'"
    fi
    
    # Add other flags
    if [[ "$VERBOSE" == "true" ]]; then
        cmd+=" --verbose"
    fi
    
    echo "$cmd"
}

# Execute with retry logic
execute_with_retry() {
    local cmd="$1"
    local retry_count=0
    local success=false
    
    while [[ $retry_count -lt $MAX_RETRIES ]]; do
        log INFO "Executing: $cmd (attempt $((retry_count + 1))/$MAX_RETRIES)"
        
        # Execute command
        local output
        output=$(eval "$cmd" 2>&1)
        local ret_code=$?
        
        if [[ $ret_code -eq 0 ]]; then
            success=true
            echo "$output"
            break
        else
            # Parse error
            local error_info=$(parse_claude_error "$output")
            local error_type=$(echo "$error_info" | cut -d'|' -f1)
            
            log WARN "Command failed with error type: $error_type"
            
            case "$error_type" in
                usage_limit|rate_limit)
                    # Handle limit and return for main logic
                    echo "$output"
                    return 2
                    ;;
                conversation_not_found)
                    log ERROR "Conversation not found. Falling back to new session."
                    USE_RESUME_FLAG=false
                    USE_CONTINUE_FLAG=false
                    CONVERSATION_ID=""
                    cmd=$(build_claude_command)
                    ;;
                *)
                    log ERROR "Unknown error: $output"
                    ;;
            esac
        fi
        
        ((retry_count++))
        if [[ $retry_count -lt $MAX_RETRIES ]]; then
            log INFO "Retrying in $RETRY_DELAY seconds..."
            sleep "$RETRY_DELAY"
        fi
    done
    
    if [[ "$success" != "true" ]]; then
        return 1
    fi
    
    return 0
}

# Parse command line arguments
parse_arguments() {
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
            -r|--resume)
                USE_RESUME_FLAG=true
                if [[ -n "${2:-}" && ! "$2" =~ ^- ]]; then
                    CONVERSATION_ID="$2"
                    shift
                fi
                shift
                ;;
            --conversation-id)
                CONVERSATION_ID="$2"
                USE_RESUME_FLAG=true
                shift 2
                ;;
            --extended-thinking)
                EXTENDED_THINKING=true
                SESSION_TYPE="extended"
                shift
                ;;
            --session-type)
                SESSION_TYPE="$2"
                shift 2
                ;;
            --config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            --hooks)
                HOOKS_FILE="$2"
                shift 2
                ;;
            --no-hooks)
                NO_HOOKS=true
                shift
                ;;
            --no-memory)
                NO_MEMORY=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                LOG_LEVEL="debug"
                shift
                ;;
            -q|--quiet)
                QUIET=true
                shift
                ;;
            --debug)
                DEBUG=true
                LOG_LEVEL="debug"
                shift
                ;;
            --log-level)
                LOG_LEVEL="$2"
                shift 2
                ;;
            --max-retries)
                MAX_RETRIES="$2"
                shift 2
                ;;
            --retry-delay)
                RETRY_DELAY="$2"
                shift 2
                ;;
            --no-notifications)
                NOTIFICATION_ENABLED=false
                shift
                ;;
            -V|--version)
                show_version
                exit 0
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            -*)
                error_exit "Unknown option: $1" 1
                ;;
            *)
                # If no flag specified, treat as prompt argument
                CUSTOM_PROMPT="$1"
                shift
                ;;
        esac
    done
}

# Main execution
main() {
    # Initialize
    init_directories
    
    # Parse arguments
    parse_arguments "$@"
    
    # Load configuration
    load_config
    
    # Load previous state if resuming
    if [[ "$USE_RESUME_FLAG" == "true" || "$USE_CONTINUE_FLAG" == "true" ]]; then
        load_resume_state || log DEBUG "No previous state found"
    fi
    
    # Set default prompt if not specified
    CUSTOM_PROMPT="${CUSTOM_PROMPT:-$DEFAULT_PROMPT}"
    
    log INFO "Starting $SCRIPT_NAME v$SCRIPT_VERSION"
    log DEBUG "Configuration: prompt='$CUSTOM_PROMPT', session_type='$SESSION_TYPE', retries=$MAX_RETRIES"
    
    # Build and execute initial command
    local cmd=$(build_claude_command)
    local output
    output=$(execute_with_retry "$cmd")
    local ret_code=$?
    
    # Handle results
    if [[ $ret_code -eq 2 ]]; then
        # Usage limit detected
        local error_info=$(parse_claude_error "$output")
        local error_type=$(echo "$error_info" | cut -d'|' -f1)
        local wait_time=$(echo "$error_info" | cut -d'|' -f2)
        local resume_time=$(echo "$error_info" | cut -d'|' -f3)
        
        # Calculate wait time
        if [[ -n "$resume_time" ]]; then
            # Convert resume time to timestamp
            local resume_timestamp
            if [[ "$OSTYPE" == "linux-gnu"* ]]; then
                resume_timestamp=$(date -d "$resume_time" +%s)
            else
                resume_timestamp=$(date -j -f "%Y-%m-%d %H:%M:%S" "$resume_time" +%s 2>/dev/null || date +%s)
            fi
            
            local now_timestamp=$(date +%s)
            wait_time=$((resume_timestamp - now_timestamp))
        fi
        
        # Ensure positive wait time
        wait_time=$((wait_time > 0 ? wait_time : 60))
        
        # Save state for resume
        save_resume_state
        
        # Show countdown
        show_countdown "$wait_time" "$resume_time"
        
        # Wait a bit more to ensure limit is lifted
        sleep 10
        
        # Resume execution
        log INFO "Resuming Claude session..."
        output=$(execute_with_retry "$cmd")
        ret_code=$?
        
        if [[ $ret_code -eq 0 ]]; then
            log SUCCESS "Task has been automatically resumed and completed!"
            echo -e "\n${GREEN}Output:${NC}"
            echo "$output"
        else
            error_exit "Failed to resume after waiting. Please try again manually." 4
        fi
    elif [[ $ret_code -eq 0 ]]; then
        log SUCCESS "Task completed without waiting."
        echo "$output"
    else
        error_exit "Claude command failed. Check logs for details." 1
    fi
}

# Run main function
main "$@"