PREFIX ?= /usr/local
BINDIR = $(PREFIX)/bin
SCRIPT_NAME = claude-auto-resume

.PHONY: install uninstall test

install:
	@echo "Installing $(SCRIPT_NAME) to $(BINDIR)..."
	@mkdir -p $(BINDIR)
	@cp claude-auto-resume.sh $(BINDIR)/$(SCRIPT_NAME)
	@chmod +x $(BINDIR)/$(SCRIPT_NAME)
	@echo "Installation complete. You can now run '$(SCRIPT_NAME)' from anywhere."

uninstall:
	@echo "Uninstalling $(SCRIPT_NAME)..."
	@rm -f $(BINDIR)/$(SCRIPT_NAME)
	@echo "Uninstallation complete."

test:
	@echo "Testing script syntax..."
	@bash -n claude-auto-resume.sh
	@echo "Syntax check passed."

help:
	@echo "Available targets:"
	@echo "  install   - Install the script globally to $(BINDIR)"
	@echo "  uninstall - Remove the script from $(BINDIR)"
	@echo "  test      - Test script syntax"
	@echo "  help      - Show this help message"
	@echo ""
	@echo "Environment variables:"
	@echo "  PREFIX    - Installation prefix (default: /usr/local)"