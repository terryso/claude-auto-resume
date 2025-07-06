# Makefile for claude-auto-resume installation
# Version: 2.0.0

PREFIX ?= /usr/local
INSTALL_DIR = $(PREFIX)/bin
CONFIG_DIR = $(HOME)/.config/claude-auto-resume
DATA_DIR = $(HOME)/.local/share/claude-auto-resume
SCRIPT_NAME = claude-auto-resume

# Version info
VERSION = 2.0.0
RELEASE_DATE = $(shell date +%Y-%m-%d)

# Colors
GREEN = \033[0;32m
YELLOW = \033[0;33m
CYAN = \033[0;36m
RED = \033[0;31m
NC = \033[0m

.PHONY: all install uninstall test test-full check-deps config clean help version dev-install release

all: help

help:
	@echo "$(CYAN)Claude Auto-Resume Makefile v$(VERSION)$(NC)"
	@echo "$(CYAN)=====================================$(NC)"
	@echo ""
	@echo "$(GREEN)Installation targets:$(NC)"
	@echo "  install        - Install claude-auto-resume to $(INSTALL_DIR)"
	@echo "  dev-install    - Install with symlinks for development"
	@echo "  config         - Install default configuration files"
	@echo "  uninstall      - Remove claude-auto-resume completely"
	@echo ""
	@echo "$(GREEN)Testing targets:$(NC)"
	@echo "  test           - Run basic syntax tests"
	@echo "  test-full      - Run complete test suite"
	@echo "  check-deps     - Check for required dependencies"
	@echo ""
	@echo "$(GREEN)Other targets:$(NC)"
	@echo "  clean          - Remove temporary files"
	@echo "  version        - Show version information"
	@echo "  release        - Prepare for release"
	@echo ""
	@echo "$(YELLOW)Options:$(NC)"
	@echo "  PREFIX=/path   - Set custom install prefix (default: /usr/local)"
	@echo ""
	@echo "$(YELLOW)Examples:$(NC)"
	@echo "  make install"
	@echo "  make install PREFIX=$$HOME/.local"
	@echo "  sudo make install config"

install: check-deps
	@echo "$(CYAN)Installing $(SCRIPT_NAME) v$(VERSION) to $(INSTALL_DIR)...$(NC)"
	@mkdir -p $(INSTALL_DIR)
	@cp claude-auto-resume.sh $(INSTALL_DIR)/$(SCRIPT_NAME)
	@chmod +x $(INSTALL_DIR)/$(SCRIPT_NAME)
	@echo "$(GREEN)✓ Script installed$(NC)"
	@echo ""
	@echo "$(CYAN)Next steps:$(NC)"
	@echo "1. Ensure $(INSTALL_DIR) is in your PATH"
	@echo "2. Run 'make config' to install configuration files"
	@echo "3. Run '$(SCRIPT_NAME) --help' to see usage"

dev-install: check-deps
	@echo "$(CYAN)Installing $(SCRIPT_NAME) for development...$(NC)"
	@mkdir -p $(INSTALL_DIR)
	@ln -sf $(PWD)/claude-auto-resume.sh $(INSTALL_DIR)/$(SCRIPT_NAME)
	@chmod +x claude-auto-resume.sh
	@echo "$(GREEN)✓ Development installation complete$(NC)"
	@echo "$(YELLOW)Note: Changes to claude-auto-resume.sh will be reflected immediately$(NC)"

config:
	@echo "$(CYAN)Installing configuration files...$(NC)"
	@mkdir -p $(CONFIG_DIR)
	@if [ -f $(CONFIG_DIR)/config.json ]; then \
		echo "$(YELLOW)→ Backing up existing config.json$(NC)"; \
		cp $(CONFIG_DIR)/config.json $(CONFIG_DIR)/config.json.backup.$$(date +%Y%m%d_%H%M%S); \
	fi
	@cp claude-resume-config.json $(CONFIG_DIR)/config.json
	@echo "$(GREEN)✓ Installed config.json$(NC)"
	@if [ -f $(CONFIG_DIR)/hooks.json ]; then \
		echo "$(YELLOW)→ Backing up existing hooks.json$(NC)"; \
		cp $(CONFIG_DIR)/hooks.json $(CONFIG_DIR)/hooks.json.backup.$$(date +%Y%m%d_%H%M%S); \
	fi
	@cp claude-resume-hooks.json $(CONFIG_DIR)/hooks.json
	@echo "$(GREEN)✓ Installed hooks.json$(NC)"
	@echo ""
	@echo "$(CYAN)Configuration files installed to: $(CONFIG_DIR)$(NC)"

uninstall:
	@echo "$(CYAN)Uninstalling $(SCRIPT_NAME)...$(NC)"
	@rm -f $(INSTALL_DIR)/$(SCRIPT_NAME)
	@echo "$(GREEN)✓ Script removed$(NC)"
	@echo ""
	@read -p "Remove configuration files? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		rm -rf $(CONFIG_DIR); \
		rm -rf $(DATA_DIR); \
		echo "$(GREEN)✓ Configuration and data removed$(NC)"; \
	else \
		echo "$(YELLOW)→ Configuration and data preserved$(NC)"; \
	fi

test:
	@echo "$(CYAN)Running syntax tests...$(NC)"
	@bash -n claude-auto-resume.sh
	@echo "$(GREEN)✓ Main script syntax OK$(NC)"
	@bash -n install.sh
	@echo "$(GREEN)✓ Install script syntax OK$(NC)"
	@if [ -f test-suite.sh ]; then \
		bash -n test-suite.sh; \
		echo "$(GREEN)✓ Test suite syntax OK$(NC)"; \
	fi
	@echo ""
	@echo "$(GREEN)All syntax tests passed!$(NC)"

test-full: test
	@echo ""
	@echo "$(CYAN)Running full test suite...$(NC)"
	@if [ -f test-suite.sh ]; then \
		bash test-suite.sh; \
	else \
		echo "$(RED)✗ Test suite not found$(NC)"; \
		exit 1; \
	fi

check-deps:
	@echo "$(CYAN)Checking dependencies...$(NC)"
	@command -v bash >/dev/null 2>&1 || { echo "$(RED)✗ bash is required$(NC)"; exit 1; }
	@echo "$(GREEN)✓ bash found$(NC)"
	@if command -v claude >/dev/null 2>&1; then \
		echo "$(GREEN)✓ claude CLI found$(NC)"; \
	else \
		echo "$(YELLOW)⚠ claude CLI not found (required at runtime)$(NC)"; \
	fi
	@if command -v jq >/dev/null 2>&1; then \
		echo "$(GREEN)✓ jq found (recommended)$(NC)"; \
	else \
		echo "$(YELLOW)⚠ jq not found (optional but recommended)$(NC)"; \
	fi
	@echo ""

clean:
	@echo "$(CYAN)Cleaning temporary files...$(NC)"
	@rm -rf test-output/
	@rm -f *.log
	@rm -f *.tmp
	@echo "$(GREEN)✓ Clean complete$(NC)"

version:
	@echo "$(CYAN)Claude Auto-Resume$(NC)"
	@echo "Version: $(VERSION)"
	@echo "Release Date: $(RELEASE_DATE)"
	@echo "Install Prefix: $(PREFIX)"
	@echo "Install Directory: $(INSTALL_DIR)"
	@echo "Config Directory: $(CONFIG_DIR)"

release: test-full
	@echo "$(CYAN)Preparing release v$(VERSION)...$(NC)"
	@echo "$(VERSION)" > VERSION
	@echo "Release Date: $(RELEASE_DATE)" >> VERSION
	@tar -czf claude-auto-resume-$(VERSION).tar.gz \
		claude-auto-resume.sh \
		install.sh \
		Makefile \
		README.md \
		CLAUDE.md \
		CONFIGURATION.md \
		HOOKS.md \
		TROUBLESHOOTING.md \
		claude-resume-config.json \
		claude-resume-hooks.json \
		test-suite.sh
	@echo "$(GREEN)✓ Release archive created: claude-auto-resume-$(VERSION).tar.gz$(NC)"

# Development helpers
.PHONY: lint format docs

lint:
	@echo "$(CYAN)Running shellcheck...$(NC)"
	@if command -v shellcheck >/dev/null 2>&1; then \
		shellcheck claude-auto-resume.sh install.sh test-suite.sh; \
		echo "$(GREEN)✓ Lint passed$(NC)"; \
	else \
		echo "$(YELLOW)⚠ shellcheck not found$(NC)"; \
	fi

format:
	@echo "$(CYAN)Formatting shell scripts...$(NC)"
	@if command -v shfmt >/dev/null 2>&1; then \
		shfmt -w claude-auto-resume.sh install.sh test-suite.sh; \
		echo "$(GREEN)✓ Formatting complete$(NC)"; \
	else \
		echo "$(YELLOW)⚠ shfmt not found$(NC)"; \
	fi

docs:
	@echo "$(CYAN)Checking documentation...$(NC)"
	@for doc in README.md CONFIGURATION.md HOOKS.md TROUBLESHOOTING.md; do \
		if [ -f $$doc ]; then \
			echo "$(GREEN)✓ $$doc present$(NC)"; \
		else \
			echo "$(RED)✗ $$doc missing$(NC)"; \
		fi \
	done