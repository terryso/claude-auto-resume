#!/bin/bash

# Claude Auto-Resume Enhanced Installation Script
# Version: 2.0.0

set -euo pipefail

# Color codes
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# Installation defaults
INSTALL_PREFIX="${PREFIX:-/usr/local}"
INSTALL_DIR="$INSTALL_PREFIX/bin"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/claude-auto-resume"
DATA_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/claude-auto-resume"
SCRIPT_NAME="claude-auto-resume"
FORCE_INSTALL=false
SKIP_DEPS=false
SETUP_HOOKS=true
SETUP_CONFIG=true

# Show banner
show_banner() {
    echo -e "${CYAN}${BOLD}"
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║        Claude Auto-Resume Installer v2.0.0            ║"
    echo "║     Enhanced with Modern Claude Code Integration      ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Show help
show_help() {
    cat << EOF
${BOLD}Usage:${NC} $0 [OPTIONS]

${BOLD}Install Claude Auto-Resume with enhanced features.${NC}

${BOLD}OPTIONS:${NC}
    ${GREEN}--prefix DIR${NC}         Installation prefix (default: /usr/local)
    ${GREEN}--force${NC}              Force installation, overwrite existing files
    ${GREEN}--skip-deps${NC}          Skip dependency checks
    ${GREEN}--no-hooks${NC}           Don't install hooks configuration
    ${GREEN}--no-config${NC}          Don't install default configuration
    ${GREEN}--uninstall${NC}          Uninstall claude-auto-resume
    ${GREEN}-h, --help${NC}           Show this help message

${BOLD}EXAMPLES:${NC}
    ${CYAN}# Standard installation${NC}
    sudo $0
    
    ${CYAN}# Install to custom location${NC}
    $0 --prefix \$HOME/.local
    
    ${CYAN}# Force reinstall with all features${NC}
    sudo $0 --force
    
    ${CYAN}# Uninstall${NC}
    sudo $0 --uninstall

${BOLD}DIRECTORIES:${NC}
    Install dir: $INSTALL_DIR
    Config dir:  $CONFIG_DIR
    Data dir:    $DATA_DIR

EOF
}

# Print colored message
print_msg() {
    local color="$1"
    shift
    echo -e "${color}$*${NC}"
}

# Check if running with appropriate permissions
check_permissions() {
    if [[ "$INSTALL_PREFIX" == "/usr/local" || "$INSTALL_PREFIX" == "/usr" ]]; then
        if [[ $EUID -ne 0 ]]; then
            print_msg "$RED" "Error: Installation to $INSTALL_PREFIX requires root privileges."
            print_msg "$YELLOW" "Please run with sudo or choose a different prefix with --prefix"
            exit 1
        fi
    fi
}

# Check dependencies
check_dependencies() {
    print_msg "$CYAN" "Checking dependencies..."
    
    local missing_deps=()
    
    # Required dependencies
    if ! command -v claude &> /dev/null; then
        missing_deps+=("claude (Claude CLI)")
    fi
    
    # Optional but recommended
    local optional_deps=()
    if ! command -v jq &> /dev/null; then
        optional_deps+=("jq (JSON processor)")
    fi
    
    if ! command -v git &> /dev/null; then
        optional_deps+=("git (version control)")
    fi
    
    # Notification tools
    local has_notifier=false
    if command -v notify-send &> /dev/null || \
       command -v osascript &> /dev/null || \
       command -v terminal-notifier &> /dev/null; then
        has_notifier=true
    fi
    
    if [[ ! "$has_notifier" == true ]]; then
        optional_deps+=("notify-send/osascript/terminal-notifier (desktop notifications)")
    fi
    
    # Report findings
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        print_msg "$RED" "Missing required dependencies:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        
        if [[ "$SKIP_DEPS" != true ]]; then
            print_msg "$RED" "Please install missing dependencies or use --skip-deps to continue anyway."
            exit 1
        else
            print_msg "$YELLOW" "Warning: Continuing without required dependencies (--skip-deps used)"
        fi
    fi
    
    if [[ ${#optional_deps[@]} -gt 0 ]]; then
        print_msg "$YELLOW" "Missing optional dependencies:"
        for dep in "${optional_deps[@]}"; do
            echo "  - $dep"
        done
        print_msg "$YELLOW" "These are recommended but not required."
    fi
    
    print_msg "$GREEN" "✓ Dependency check complete"
}

# Create directories
create_directories() {
    print_msg "$CYAN" "Creating directories..."
    
    # Installation directory
    if [[ ! -d "$INSTALL_DIR" ]]; then
        mkdir -p "$INSTALL_DIR"
        print_msg "$GREEN" "✓ Created $INSTALL_DIR"
    fi
    
    # User directories (always create as user, not root)
    local user_dirs=("$CONFIG_DIR" "$DATA_DIR")
    for dir in "${user_dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            if [[ $EUID -eq 0 ]]; then
                # If running as root, create as the sudo user
                sudo -u "${SUDO_USER:-$USER}" mkdir -p "$dir"
            else
                mkdir -p "$dir"
            fi
            print_msg "$GREEN" "✓ Created $dir"
        fi
    done
}

# Install main script
install_script() {
    print_msg "$CYAN" "Installing claude-auto-resume script..."
    
    local source_file="claude-auto-resume.sh"
    local target_file="$INSTALL_DIR/$SCRIPT_NAME"
    
    if [[ ! -f "$source_file" ]]; then
        print_msg "$RED" "Error: $source_file not found in current directory"
        exit 1
    fi
    
    if [[ -f "$target_file" && "$FORCE_INSTALL" != true ]]; then
        print_msg "$YELLOW" "Warning: $target_file already exists"
        read -p "Overwrite? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_msg "$YELLOW" "Skipping script installation"
            return
        fi
    fi
    
    # Copy and set permissions
    cp "$source_file" "$target_file"
    chmod +x "$target_file"
    print_msg "$GREEN" "✓ Installed $target_file"
}

# Install configuration files
install_configs() {
    if [[ "$SETUP_CONFIG" != true ]]; then
        return
    fi
    
    print_msg "$CYAN" "Installing configuration files..."
    
    local config_files=(
        "claude-resume-config.json:$CONFIG_DIR/config.json"
        "claude-resume-hooks.json:$CONFIG_DIR/hooks.json"
    )
    
    for config_pair in "${config_files[@]}"; do
        local source="${config_pair%%:*}"
        local target="${config_pair##*:}"
        
        if [[ -f "$source" ]]; then
            if [[ -f "$target" && "$FORCE_INSTALL" != true ]]; then
                # Backup existing config
                local backup="${target}.backup.$(date +%Y%m%d_%H%M%S)"
                if [[ $EUID -eq 0 && -n "${SUDO_USER:-}" ]]; then
                    sudo -u "$SUDO_USER" cp "$target" "$backup"
                else
                    cp "$target" "$backup"
                fi
                print_msg "$YELLOW" "→ Backed up existing config to $backup"
            fi
            
            # Copy config file
            if [[ $EUID -eq 0 && -n "${SUDO_USER:-}" ]]; then
                sudo -u "$SUDO_USER" cp "$source" "$target"
            else
                cp "$source" "$target"
            fi
            print_msg "$GREEN" "✓ Installed $target"
        else
            print_msg "$YELLOW" "→ Skipping $source (not found)"
        fi
    done
}

# Setup shell integration
setup_shell_integration() {
    print_msg "$CYAN" "Setting up shell integration..."
    
    local shells=()
    local current_shell=$(basename "$SHELL")
    
    # Detect shell RC files
    if [[ -f "$HOME/.bashrc" ]]; then
        shells+=("$HOME/.bashrc")
    fi
    
    if [[ -f "$HOME/.zshrc" ]]; then
        shells+=("$HOME/.zshrc")
    fi
    
    if [[ ${#shells[@]} -eq 0 ]]; then
        print_msg "$YELLOW" "→ No shell RC files found, skipping integration"
        return
    fi
    
    # Add to PATH if needed
    if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
        print_msg "$YELLOW" "→ $INSTALL_DIR is not in PATH"
        
        for rc_file in "${shells[@]}"; do
            local shell_name=$(basename "$rc_file" | sed 's/^\.//;s/rc$//')
            read -p "Add to $shell_name PATH? (y/N) " -n 1 -r
            echo
            
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo "" >> "$rc_file"
                echo "# Added by claude-auto-resume installer" >> "$rc_file"
                echo "export PATH=\"\$PATH:$INSTALL_DIR\"" >> "$rc_file"
                print_msg "$GREEN" "✓ Added to $rc_file"
            fi
        done
    else
        print_msg "$GREEN" "✓ $INSTALL_DIR already in PATH"
    fi
}

# Uninstall
uninstall() {
    print_msg "$CYAN" "Uninstalling claude-auto-resume..."
    
    # Confirm
    read -p "This will remove claude-auto-resume. Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_msg "$YELLOW" "Uninstall cancelled"
        exit 0
    fi
    
    # Remove script
    local target_file="$INSTALL_DIR/$SCRIPT_NAME"
    if [[ -f "$target_file" ]]; then
        rm "$target_file"
        print_msg "$GREEN" "✓ Removed $target_file"
    fi
    
    # Ask about config/data
    read -p "Remove configuration and data files? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [[ -d "$CONFIG_DIR" ]]; then
            rm -rf "$CONFIG_DIR"
            print_msg "$GREEN" "✓ Removed $CONFIG_DIR"
        fi
        
        if [[ -d "$DATA_DIR" ]]; then
            rm -rf "$DATA_DIR"
            print_msg "$GREEN" "✓ Removed $DATA_DIR"
        fi
    else
        print_msg "$YELLOW" "→ Configuration and data files preserved"
    fi
    
    print_msg "$GREEN" "✓ Uninstall complete"
}

# Verify installation
verify_installation() {
    print_msg "$CYAN" "Verifying installation..."
    
    local errors=0
    
    # Check script
    if [[ -x "$INSTALL_DIR/$SCRIPT_NAME" ]]; then
        print_msg "$GREEN" "✓ Script installed and executable"
    else
        print_msg "$RED" "✗ Script not found or not executable"
        ((errors++))
    fi
    
    # Check config
    if [[ -f "$CONFIG_DIR/config.json" ]]; then
        print_msg "$GREEN" "✓ Configuration installed"
    else
        print_msg "$YELLOW" "→ Configuration not installed (optional)"
    fi
    
    # Check hooks
    if [[ -f "$CONFIG_DIR/hooks.json" ]]; then
        print_msg "$GREEN" "✓ Hooks configuration installed"
    else
        print_msg "$YELLOW" "→ Hooks configuration not installed (optional)"
    fi
    
    # Test execution
    if command -v "$SCRIPT_NAME" &> /dev/null; then
        print_msg "$GREEN" "✓ Command available in PATH"
    else
        print_msg "$YELLOW" "→ Command not in PATH (may need to reload shell)"
    fi
    
    if [[ $errors -gt 0 ]]; then
        print_msg "$RED" "Installation completed with errors"
        return 1
    else
        print_msg "$GREEN" "✓ Installation verified successfully"
        return 0
    fi
}

# Main installation
main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --prefix)
                INSTALL_PREFIX="$2"
                INSTALL_DIR="$INSTALL_PREFIX/bin"
                shift 2
                ;;
            --force)
                FORCE_INSTALL=true
                shift
                ;;
            --skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            --no-hooks)
                SETUP_HOOKS=false
                shift
                ;;
            --no-config)
                SETUP_CONFIG=false
                shift
                ;;
            --uninstall)
                check_permissions
                uninstall
                exit 0
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                print_msg "$RED" "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Show banner
    show_banner
    
    # Installation steps
    check_permissions
    check_dependencies
    create_directories
    install_script
    install_configs
    setup_shell_integration
    verify_installation
    
    # Success message
    echo
    print_msg "$GREEN" "═══════════════════════════════════════════════════════"
    print_msg "$GREEN" "Installation complete!"
    print_msg "$GREEN" "═══════════════════════════════════════════════════════"
    echo
    print_msg "$CYAN" "Next steps:"
    echo "  1. Reload your shell or run: source ~/.${SHELL##*/}rc"
    echo "  2. Test the installation: claude-auto-resume --help"
    echo "  3. Configure settings in: $CONFIG_DIR/config.json"
    echo "  4. Set up hooks in: $CONFIG_DIR/hooks.json"
    echo
    print_msg "$CYAN" "For more information, see the documentation."
}

# Run main
main "$@"