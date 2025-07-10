#!/bin/bash

# 模拟测试脚本 - 测试 claude-auto-resume 的使用限制功能
# 使用方法：./test-simulate-limit.sh

echo "=== Claude Auto-Resume 使用限制模拟测试 ==="
echo ""

# 创建一个临时的 claude 命令模拟器
TEMP_CLAUDE_PATH="/tmp/claude_simulator"
ORIGINAL_PATH="$PATH"

# 创建模拟的 claude 命令
create_mock_claude() {
    local scenario="$1"
    
    cat > "$TEMP_CLAUDE_PATH" << 'EOF'
#!/bin/bash

# 模拟 claude 命令的行为
if [[ "$*" == *"--help"* ]]; then
    echo "Usage: claude [options]"
    echo "Options:"
    echo "  --dangerously-skip-permissions  Skip permission prompts"
    echo "  -p, --prompt                    Set prompt"
    echo "  -c, --continue                  Continue conversation"
    exit 0
fi

if [[ "$*" == *"--version"* ]]; then
    echo "1.0.45 (Claude Code)"
    exit 0
fi

if [[ "$*" == *"-p 'check'"* ]] || [[ "$*" == *'-p "check"'* ]]; then
    # 模拟使用限制情况
    # 生成一个未来30秒的时间戳
    FUTURE_TIME=$(($(date +%s) + 30))
    echo "Claude AI usage limit reached|$FUTURE_TIME"
    exit 0
fi

# 模拟其他 claude 命令
echo "Mock Claude CLI response for: $*"
exit 0
EOF
    
    chmod +x "$TEMP_CLAUDE_PATH"
}

# 创建带有使用限制的模拟 claude
create_mock_claude_with_limit() {
    # 创建模拟的 claude 命令
    create_mock_claude
    
    # 临时修改 PATH 让系统找到我们的模拟命令
    export PATH="/tmp:$PATH"
    
    echo "✅ 已创建模拟 claude 命令，将返回使用限制"
    echo "📍 模拟的等待时间：30秒"
    echo ""
}

# 恢复原始环境
restore_environment() {
    export PATH="$ORIGINAL_PATH"
    rm -f "$TEMP_CLAUDE_PATH"
    echo "✅ 已恢复原始环境"
}

# 测试函数
test_custom_command_execution() {
    echo "🚀 开始测试自定义命令执行..."
    echo "命令：claude-auto-resume -e 'echo \"测试成功！当前时间：\$(date)\"'"
    echo ""
    
    # 执行测试
    ./claude-auto-resume.sh -e 'echo "测试成功！当前时间：$(date)"'
    
    echo ""
    echo "📊 测试完成"
}

# 主测试流程
main() {
    echo "选择测试选项："
    echo "1. 模拟使用限制并测试自定义命令执行"
    echo "2. 恢复原始环境"
    echo "3. 退出"
    echo ""
    
    read -p "请输入选项 (1-3): " choice
    
    case $choice in
        1)
            echo ""
            echo "🔧 正在设置模拟环境..."
            create_mock_claude_with_limit
            test_custom_command_execution
            ;;
        2)
            echo ""
            restore_environment
            ;;
        3)
            echo ""
            echo "👋 退出测试"
            exit 0
            ;;
        *)
            echo "❌ 无效选项"
            exit 1
            ;;
    esac
}

# 检查脚本存在
if [ ! -f "./claude-auto-resume.sh" ]; then
    echo "❌ 错误：找不到 claude-auto-resume.sh 脚本"
    echo "请在 claude-auto-resume.sh 所在目录运行此测试脚本"
    exit 1
fi

# 运行主程序
main

# 清理
trap restore_environment EXIT