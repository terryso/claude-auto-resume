# Story 1.3: Enhanced Error Handling - 手工验证指南

## 概述

本文档提供Story 1.3增强错误处理功能的完整手工验证步骤。该功能包括网络连接检测、超时保护、详细错误消息和恢复建议等关键改进。

## 验证前准备

1. 确保您有`claude-auto-resume.sh`脚本的最新版本
2. 确保脚本有执行权限：`chmod +x claude-auto-resume.sh`
3. 备份您的原始Claude CLI环境（如果需要）

## 跨平台兼容性说明

本文档中的测试脚本使用了跨平台兼容的时间戳生成方法：
- **兼容方法**：`FUTURE_TIME=$(($(date +%s) + 秒数))`
- **避免使用**：
  - GNU date语法：`date -d '+1 second'` (Linux)
  - BSD date语法：`date -v+1S` (macOS)
- **原因**：确保测试脚本在Linux、macOS等不同系统上都能正常工作

## 验证场景

### 1. 网络连接检测验证

#### 场景1.1：正常网络连接
```bash
# 确保您有正常的网络连接
./claude-auto-resume.sh "test prompt"

# 期望输出：
# Checking network connectivity...
# Network connectivity confirmed.
# Executing Claude CLI command...
# [后续Claude CLI的正常输出]
```

#### 场景1.2：模拟网络断开
```bash
# 方法1：断开WiFi或以太网连接，然后运行
./claude-auto-resume.sh "test prompt"

# 方法2：使用iptables阻止外出连接（需要root权限）
sudo iptables -A OUTPUT -j DROP
./claude-auto-resume.sh "test prompt"
sudo iptables -D OUTPUT -j DROP  # 恢复

# 期望输出：
# Checking network connectivity...
# [ERROR] Network connectivity check failed.
# [HINT] Claude CLI requires internet connection to function properly.
# [SUGGESTION] Please check your internet connection and try again.
# [DEBUG] Tested: ping 8.8.8.8, ping 1.1.1.1, and HTTPS connectivity
# [INFO] Script terminated (exit code: 3)
# [HINT] Use --help to see usage examples
```

#### 验证标准：
- [ ] ✅ 正常连接时显示确认消息
- [ ] ✅ 断网时显示详细错误信息
- [ ] ✅ 错误消息包含[ERROR]、[HINT]、[SUGGESTION]、[DEBUG]标签
- [ ] ✅ 退出代码为3

### 2. 超时保护验证

#### 场景2.1：模拟Claude CLI超时
```bash
# 创建测试环境
mkdir -p /tmp/claude-test
cd /tmp/claude-test

# 创建模拟的claude命令（会hang住）
cat > claude << 'EOF'
#!/bin/bash
echo "Simulating slow Claude CLI..."
sleep 45  # 超过30秒超时限制
echo "This should not appear"
EOF

chmod +x claude
export PATH="/tmp/claude-test:$PATH"

# 运行测试
./claude-auto-resume.sh "test prompt"

# 期望输出（30秒后）：
# Checking network connectivity...
# Network connectivity confirmed.
# Executing Claude CLI command...
# Simulating slow Claude CLI...
# [ERROR] Claude CLI operation timed out after 30 seconds.
# [HINT] This may indicate network issues or Claude service problems.
# [SUGGESTION] Try again in a few minutes, or check Claude service status.
# [DEBUG] Command executed: timeout 30s claude -p 'check'
# [INFO] Script terminated (exit code: 3)
# [HINT] Use --help to see usage examples

# 清理
rm -rf /tmp/claude-test
unset PATH  # 或者重新设置PATH
```

#### 场景2.2：恢复操作正常执行
```bash
# 注意：恢复操作不再有超时限制
# 原因：用户通常不在电脑前，任务可能需要很长时间执行
# 如果有问题，用户回来后自己处理即可

# 创建测试环境
mkdir -p /tmp/claude-test
cd /tmp/claude-test

# 创建模拟的claude命令（返回limit信息然后正常执行）
cat > claude << 'EOF'
#!/bin/bash
if [[ "$*" == *"check"* ]]; then
    # 返回usage limit reached信息，1秒后恢复
    # 跨平台兼容的时间戳生成
    FUTURE_TIME=$(($(date +%s) + 1))
    echo "Claude AI usage limit reached|$FUTURE_TIME"
    exit 0
elif [[ "$*" == *"dangerously-skip-permissions"* ]]; then
    # 模拟恢复命令正常执行
    echo "Simulating resume operation..."
    sleep 2  # 短暂延时模拟处理
    echo "Task completed successfully!"
    exit 0
else
    sleep 45
    exit 0
fi
EOF

chmod +x claude
export PATH="/tmp/claude-test:$PATH"

# 运行测试 - 会等待1秒然后尝试恢复
./claude-auto-resume.sh "test prompt"

# 期望输出：
# Checking network connectivity...
# Network connectivity confirmed.
# Executing Claude CLI command...
# Claude usage limit detected. Waiting until [time]...
# Resuming in 00:00:01...
# Resume time has arrived. Retrying now.
# Re-checking network connectivity before resuming...
# Network connectivity confirmed.
# Automatically starting new Claude session with prompt: 'test prompt'
# Simulating resume operation...
# Task has been automatically resumed and completed.
# CLAUDE_OUTPUT:
# Task completed successfully!

# 清理
rm -rf /tmp/claude-test
```

#### 验证标准：
- [ ] ✅ 初始命令30秒超时检测
- [ ] ✅ 恢复命令正常执行（无超时限制）
- [ ] ✅ 超时错误消息包含所有必要标签
- [ ] ✅ 正确的退出代码（初始超时=3）

### 3. 错误消息和恢复建议验证

#### 场景3.1：Claude CLI不存在
```bash
# 临时重命名claude命令来测试
CLAUDE_PATH=$(which claude 2>/dev/null || echo "not_found")
if [ "$CLAUDE_PATH" != "not_found" ]; then
    sudo mv "$CLAUDE_PATH" "$CLAUDE_PATH.backup"
fi

# 运行测试
./claude-auto-resume.sh "test prompt"

# 期望输出：
# [ERROR] Claude CLI not found. Please install Claude CLI first.
# [SUGGESTION] Visit https://claude.ai/code for installation instructions.
# [DEBUG] Searched PATH for 'claude' command
# [INFO] Script terminated (exit code: 1)
# [HINT] Use --help to see usage examples

# 恢复claude命令
if [ "$CLAUDE_PATH" != "not_found" ]; then
    sudo mv "$CLAUDE_PATH.backup" "$CLAUDE_PATH"
fi
```

#### 场景3.2：Claude CLI执行失败
```bash
# 创建测试环境
mkdir -p /tmp/claude-test
cd /tmp/claude-test

cat > claude << 'EOF'
#!/bin/bash
echo "Authentication failed" >&2
exit 1
EOF

chmod +x claude
export PATH="/tmp/claude-test:$PATH"

# 运行测试
./claude-auto-resume.sh "test prompt"

# 期望输出：
# Checking network connectivity...
# Network connectivity confirmed.
# Executing Claude CLI command...
# [ERROR] Claude CLI execution failed.
# [HINT] This may indicate authentication, network, or service issues.
# [SUGGESTION] Check your Claude CLI authentication and try again.
# [DEBUG] Exit code: 1
# [DEBUG] Command executed: claude -p 'check'
# [DEBUG] Output: Authentication failed
# [INFO] Script terminated (exit code: 1)
# [HINT] Use --help to see usage examples

# 清理
rm -rf /tmp/claude-test
```

#### 验证标准：
- [ ] ✅ 所有错误都包含[ERROR]、[HINT]、[SUGGESTION]、[DEBUG]标签
- [ ] ✅ 每个错误场景都有具体的恢复建议
- [ ] ✅ 调试信息包含执行的命令和输出
- [ ] ✅ 正确的退出代码

### 4. 恶意输出检测验证

#### 场景4.1：空输出检测
```bash
# 创建测试环境
mkdir -p /tmp/claude-test
cd /tmp/claude-test

cat > claude << 'EOF'
#!/bin/bash
# 返回空输出但exit code为0
exit 0
EOF

chmod +x claude
export PATH="/tmp/claude-test:$PATH"

# 运行测试
./claude-auto-resume.sh "test prompt"

# 期望输出：
# Checking network connectivity...
# Network connectivity confirmed.
# Executing Claude CLI command...
# [ERROR] Claude CLI returned empty output unexpectedly.
# [HINT] This may indicate Claude CLI installation or configuration issues.
# [SUGGESTION] Try running 'claude --help' to verify CLI is working properly.
# [DEBUG] Command succeeded but returned no output
# [INFO] Script terminated (exit code: 5)
# [HINT] Use --help to see usage examples

# 清理
rm -rf /tmp/claude-test
```

#### 场景4.2：恶意格式的时间戳
```bash
# 创建测试环境
mkdir -p /tmp/claude-test
cd /tmp/claude-test

cat > claude << 'EOF'
#!/bin/bash
if [[ "$*" == *"check"* ]]; then
    # 返回恶意的时间戳格式
    echo "Claude AI usage limit reached|invalid_timestamp"
    exit 0
else
    echo "Normal operation"
    exit 0
fi
EOF

chmod +x claude
export PATH="/tmp/claude-test:$PATH"

# 运行测试
./claude-auto-resume.sh "test prompt"

# 期望输出：
# Checking network connectivity...
# Network connectivity confirmed.
# Executing Claude CLI command...
# [ERROR] Failed to extract a valid resume timestamp from Claude output.
# [HINT] Expected format: 'Claude AI usage limit reached|<timestamp>'
# [SUGGESTION] Check if Claude CLI output format has changed.
# [DEBUG] Raw output: Claude AI usage limit reached|invalid_timestamp
# [DEBUG] Extracted timestamp: 'invalid_timestamp'
# [INFO] Script terminated (exit code: 2)
# [HINT] Use --help to see usage examples

# 清理
rm -rf /tmp/claude-test
```

#### 验证标准：
- [ ] ✅ 空输出检测工作正常
- [ ] ✅ 无效时间戳检测工作正常
- [ ] ✅ 错误消息包含原始输出调试信息
- [ ] ✅ 正确的退出代码（空输出=5，无效时间戳=2）

### 5. 信号处理和清理验证

#### 场景5.1：中断信号处理
```bash
# 创建测试环境
mkdir -p /tmp/claude-test
cd /tmp/claude-test

cat > claude << 'EOF'
#!/bin/bash
if [[ "$*" == *"check"* ]]; then
    # 返回usage limit，等待30秒
    # 跨平台兼容的时间戳生成
    FUTURE_TIME=$(($(date +%s) + 30))
    echo "Claude AI usage limit reached|$FUTURE_TIME"
    exit 0
else
    echo "Normal operation"
    exit 0
fi
EOF

chmod +x claude
export PATH="/tmp/claude-test:$PATH"

# 运行测试并在倒计时期间按Ctrl+C
./claude-auto-resume.sh "test prompt"
# 在倒计时期间按 Ctrl+C

# 期望输出：
# Checking network connectivity...
# Network connectivity confirmed.
# Executing Claude CLI command...
# Claude usage limit detected. Waiting until [time]...
# Resuming in 00:00:29...
# [按Ctrl+C]
# 
# [INFO] Script interrupted by user
# [INFO] Script terminated (exit code: 130)
# [HINT] Use --help to see usage examples

# 清理
rm -rf /tmp/claude-test
```

#### 场景5.2：正常退出清理
```bash
# 测试帮助命令（不应该执行网络检查）
./claude-auto-resume.sh --help
# 应该直接显示帮助信息，无网络检查消息

# 测试错误参数
./claude-auto-resume.sh --invalid-option
# 期望输出：
# Unknown option: --invalid-option
# [然后显示帮助信息]
# [INFO] Script terminated (exit code: 1)
# [HINT] Use --help to see usage examples
```

#### 验证标准：
- [ ] ✅ Ctrl+C中断处理正常
- [ ] ✅ 错误退出时显示帮助提示
- [ ] ✅ 正确的退出代码（中断=130）
- [ ] ✅ 帮助命令不执行网络检查

### 6. 端到端验证测试

#### 场景6.1：完整的重试流程
```bash
# 创建测试环境
mkdir -p /tmp/claude-test
cd /tmp/claude-test

cat > claude << 'EOF'
#!/bin/bash
if [[ "$*" == *"check"* ]]; then
    # 第一次返回usage limit，等待5秒
    # 跨平台兼容的时间戳生成
    FUTURE_TIME=$(($(date +%s) + 5))
    echo "Claude AI usage limit reached|$FUTURE_TIME"
    exit 0
elif [[ "$*" == *"dangerously-skip-permissions"* ]]; then
    # 恢复时返回成功
    echo "Task completed successfully!"
    echo "This is the resumed Claude output."
    exit 0
else
    echo "Normal operation"
    exit 0
fi
EOF

chmod +x claude
export PATH="/tmp/claude-test:$PATH"

# 运行完整测试
./claude-auto-resume.sh "implement user authentication"

# 期望输出：
# Checking network connectivity...
# Network connectivity confirmed.
# Executing Claude CLI command...
# Claude usage limit detected. Waiting until [time]...
# Resuming in 00:00:05...
# Resuming in 00:00:04...
# Resuming in 00:00:03...
# Resuming in 00:00:02...
# Resuming in 00:00:01...
# Resume time has arrived. Retrying now.
# Re-checking network connectivity before resuming...
# Network connectivity confirmed.
# Automatically starting new Claude session with prompt: 'implement user authentication'
# Task has been automatically resumed and completed.
# CLAUDE_OUTPUT:
# Task completed successfully!
# This is the resumed Claude output.

# 清理
rm -rf /tmp/claude-test
```

#### 场景6.2：Continue标志测试
```bash
# 使用相同的测试环境
mkdir -p /tmp/claude-test
cd /tmp/claude-test

cat > claude << 'EOF'
#!/bin/bash
if [[ "$*" == *"check"* ]]; then
    # 跨平台兼容的时间戳生成
    FUTURE_TIME=$(($(date +%s) + 2))
    echo "Claude AI usage limit reached|$FUTURE_TIME"
    exit 0
elif [[ "$*" == *"dangerously-skip-permissions"* ]]; then
    if [[ "$*" == *" -c "* ]]; then
        echo "Continuing previous conversation..."
    else
        echo "Starting new conversation..."
    fi
    echo "Task output here"
    exit 0
fi
EOF

chmod +x claude
export PATH="/tmp/claude-test:$PATH"

# 测试continue标志
./claude-auto-resume.sh -c "continue the task"

# 期望输出应该包含：
# Automatically continuing previous Claude conversation with prompt: 'continue the task'
# Continuing previous conversation...

# 清理
rm -rf /tmp/claude-test
```

#### 验证标准：
- [ ] ✅ 完整的等待和恢复流程正常
- [ ] ✅ 倒计时显示正确
- [ ] ✅ 恢复前重新检查网络连接
- [ ] ✅ Continue标志正确传递给Claude CLI
- [ ] ✅ 输出格式正确

## 验证完成检查清单

完成所有验证后，使用以下检查清单确保功能正常：

### 网络连接功能
- [ ] ✅ 正常连接时显示确认消息
- [ ] ✅ 断网时显示详细错误信息
- [ ] ✅ 多种连接检测方法（ping、curl、wget）

### 超时保护功能
- [ ] ✅ 初始命令30秒超时检测
- [ ] ✅ 恢复命令正常执行（无超时限制，符合使用场景）
- [ ] ✅ 超时错误消息清晰明确

### 错误消息系统
- [ ] ✅ 所有错误都包含[ERROR]、[HINT]、[SUGGESTION]、[DEBUG]标签
- [ ] ✅ 每个错误场景都有具体的恢复建议
- [ ] ✅ 调试信息包含必要的技术细节

### 输出验证功能
- [ ] ✅ 空输出检测
- [ ] ✅ 无效时间戳检测
- [ ] ✅ 恶意格式处理

### 信号处理功能
- [ ] ✅ Ctrl+C中断处理
- [ ] ✅ 清理机制正常工作
- [ ] ✅ 错误退出时显示帮助提示

### 端到端功能
- [ ] ✅ 完整的等待和恢复流程
- [ ] ✅ Continue标志正确处理
- [ ] ✅ 输出格式符合预期

### 退出代码验证
- [ ] ✅ 退出代码1：Claude CLI执行失败
- [ ] ✅ 退出代码2：无效时间戳
- [ ] ✅ 退出代码3：网络/超时问题（仅限初始检查）
- [ ] ✅ 退出代码4：恢复命令失败（非超时原因）
- [ ] ✅ 退出代码5：恶意输出检测
- [ ] ✅ 退出代码130：用户中断

## 故障排除

### 常见问题
1. **PATH环境变量问题**：测试后记得恢复原始PATH
2. **权限问题**：确保测试脚本有执行权限
3. **网络环境**：某些网络环境可能阻止ping命令
4. **时间戳格式**：不同系统的date命令格式可能不同

### 清理脚本
```bash
# 用于清理测试环境的脚本
rm -rf /tmp/claude-test
# 恢复PATH环境变量
export PATH="/usr/local/bin:/usr/bin:/bin"
# 或者重新启动终端
```

## 验证报告

完成验证后，记录以下信息：
- 验证日期：
- 验证人员：
- 系统环境：
- 通过的测试场景：
- 失败的测试场景：
- 发现的问题：
- 建议的改进：

---

**注意**：本文档中的所有测试场景都应该在非生产环境中进行。某些测试可能需要管理员权限或会暂时影响网络连接。