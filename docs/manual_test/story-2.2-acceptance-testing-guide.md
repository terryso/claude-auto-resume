# Story 2.2: 环境变量配置 - 验收测试指南

## 测试目标
验证环境变量配置功能的完整实现，包括变量读取、验证、集成和显示功能。

## 🧪 测试方法

### 方法1：环境变量配置测试 (推荐)

#### 基本配置显示测试
```bash
# 显示默认配置
claude-auto-resume --check
```

#### 单个环境变量测试
```bash
# 等待缓冲时间测试
CLAUDE_AUTO_RESUME_WAIT_BUFFER=30 claude-auto-resume --check

# 权限跳过控制测试
CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS=false claude-auto-resume --check

# 日志文件配置测试
CLAUDE_AUTO_RESUME_LOG_FILE=/tmp/claude-test.log claude-auto-resume --check
```

#### 多个环境变量组合测试
```bash
# 完整配置测试
CLAUDE_AUTO_RESUME_WAIT_BUFFER=60 \
CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS=false \
CLAUDE_AUTO_RESUME_LOG_FILE=/tmp/claude.log \
claude-auto-resume --check
```

### 方法2：功能集成测试

#### 等待缓冲功能测试
```bash
# 测试等待缓冲：2秒基础等待 + 5秒缓冲 = 7秒总等待
CLAUDE_AUTO_RESUME_WAIT_BUFFER=5 \
claude-auto-resume --test-mode 2 "test buffer"
```


#### 权限控制测试
```bash
# 测试禁用权限跳过（需要手动确认）
CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS=false \
claude-auto-resume --test-mode 3 "test permissions"
```

### 方法3：验证测试

#### 无效值验证测试
```bash
# 无效等待缓冲时间
CLAUDE_AUTO_RESUME_WAIT_BUFFER=-10 claude-auto-resume --check


# 无效权限设置
CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS=maybe claude-auto-resume --check

# 无效日志文件路径
CLAUDE_AUTO_RESUME_LOG_FILE=/root/cannot_write.log claude-auto-resume --check
```

## 📋 验收测试检查清单

### ✅ 环境变量读取验证

- [ ] **WAIT_BUFFER**：正确读取 `CLAUDE_AUTO_RESUME_WAIT_BUFFER` 环境变量
- [ ] **SKIP_PERMISSIONS**：正确读取 `CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS` 环境变量
- [ ] **LOG_FILE**：正确读取 `CLAUDE_AUTO_RESUME_LOG_FILE` 环境变量
- [ ] **默认值**：未设置环境变量时使用正确的默认值

### ✅ 环境变量验证功能

- [ ] **数值验证**：WAIT_BUFFER 必须是非负整数
- [ ] **布尔验证**：SKIP_PERMISSIONS 支持 true/false、yes/no、1/0、on/off
- [ ] **路径验证**：LOG_FILE 路径必须可写，目录自动创建
- [ ] **大小写处理**：SKIP_PERMISSIONS 大小写不敏感
- [ ] **错误消息**：无效值显示清晰的错误信息和建议

### ✅ 功能集成验证

- [ ] **等待缓冲**：WAIT_BUFFER 正确添加到计算的等待时间
- [ ] **权限控制**：SKIP_PERMISSIONS=false 时启用权限提示
- [ ] **权限控制**：SKIP_PERMISSIONS=true 时跳过权限提示
- [ ] **配置提示**：显示相关配置状态信息

### ✅ 配置显示功能

- [ ] **--check 扩展**：显示所有环境变量配置
- [ ] **值来源**：区分显示环境变量值和默认值
- [ ] **帮助文档**：--help 包含环境变量文档
- [ ] **使用示例**：提供清晰的环境变量使用示例

## 🔬 详细测试场景

### 测试场景1：默认配置验证

**命令**：
```bash
claude-auto-resume --check
```

**期望结果**：
1. 显示系统检查信息
2. 环境变量配置部分显示：
   - WAIT_BUFFER: 0 seconds (default)
   - SKIP_PERMISSIONS: true (default)
   - LOG_FILE: (no logging) (default)
3. 所有值显示 "Source: Default value"

### 测试场景2：自定义配置显示

**命令**：
```bash
CLAUDE_AUTO_RESUME_WAIT_BUFFER=30 \
CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS=false \
CLAUDE_AUTO_RESUME_LOG_FILE=/tmp/test.log \
claude-auto-resume --check
```

**期望结果**：
1. 环境变量配置显示正确的自定义值
2. 显示 "Source: CLAUDE_AUTO_RESUME_*=value"
3. 权限设置显示为 false
4. 日志文件显示完整路径

### 测试场景3：等待缓冲功能测试

**命令**：
```bash
CLAUDE_AUTO_RESUME_WAIT_BUFFER=10 \
claude-auto-resume --test-mode 5 "test buffer"
```

**期望结果**：
1. 显示 "[TEST MODE] Simulating usage limit with 5 seconds wait time..."
2. 显示 "[CONFIG] Adding wait buffer of 10 seconds..."
3. 总等待时间为 15 秒 (5+10)
4. 倒计时显示 15 秒

### 测试场景4：权限控制测试

**命令**：
```bash
CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS=false \
claude-auto-resume --test-mode 3 "test permissions"
```

**期望结果**：
1. 3秒等待倒计时
2. 显示 "[CONFIG] Permission prompts enabled (SKIP_PERMISSIONS=false)"
3. Claude 命令执行时不包含 --dangerously-skip-permissions 标志
4. （如果有真实 Claude 命令）会要求用户确认

### 测试场景5：无效值验证测试

**命令**：
```bash
CLAUDE_AUTO_RESUME_WAIT_BUFFER=-5 claude-auto-resume --check
```

**期望结果**：
1. 显示错误消息："[ERROR] Invalid CLAUDE_AUTO_RESUME_WAIT_BUFFER value: '-5'"
2. 显示提示："[HINT] Must be a non-negative integer (seconds)."
3. 显示建议："[SUGGESTION] Example: export CLAUDE_AUTO_RESUME_WAIT_BUFFER=30"
4. 脚本退出码为 1

### 测试场景6：大小写不敏感测试

**命令**：
```bash
CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS=FALSE claude-auto-resume --check
CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS=Yes claude-auto-resume --check  
CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS=1 claude-auto-resume --check
```

**期望结果**：
1. "FALSE" 被正确识别为 false
2. "Yes" 被正确识别为 true
3. "1" 被正确识别为 true
4. 所有值都正确显示在配置中

### 测试场景7：日志文件路径验证

**命令**：
```bash
# 有效路径
CLAUDE_AUTO_RESUME_LOG_FILE=/tmp/claude.log claude-auto-resume --check

# 无效路径  
CLAUDE_AUTO_RESUME_LOG_FILE=/root/cannot_write.log claude-auto-resume --check
```

**期望结果**：
1. 有效路径：正常显示配置，文件被创建
2. 无效路径：显示错误消息和权限提示
3. 自动创建不存在的目录（如果有权限）

## 📊 验收标准

### 完全通过标准
- 所有环境变量正确读取和验证
- 所有功能集成正常工作
- 所有配置显示功能正确
- 错误处理和验证功能完善
- 向后兼容性保持

### 验收测试结果记录

| 测试场景 | 状态 | 备注 |
|---------|------|------|
| 默认配置验证 | ✅ PASS | 所有默认值正确显示 |
| 自定义配置显示 | ✅ PASS | 环境变量正确读取和显示 |
| 等待缓冲功能 | ✅ PASS | 缓冲时间正确添加 |
| 权限控制 | ✅ PASS | 权限设置正确应用 |
| 无效值验证 | ✅ PASS | 错误处理完善 |
| 大小写处理 | ✅ PASS | 大小写不敏感正确实现 |
| 路径验证 | ✅ PASS | 文件路径验证正确 |

## 🎯 快速验收测试

如果时间有限，可以运行这个快速验收测试：

```bash
# 1. 默认配置测试
claude-auto-resume --check

# 2. 环境变量配置测试
CLAUDE_AUTO_RESUME_WAIT_BUFFER=5 \
CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS=false \
claude-auto-resume --check

# 3. 功能集成测试
CLAUDE_AUTO_RESUME_WAIT_BUFFER=3 \
claude-auto-resume --test-mode 2 "✅ 环境变量功能正常"

# 4. 验证测试
CLAUDE_AUTO_RESUME_WAIT_BUFFER=invalid claude-auto-resume --check
```

## 🎯 帮助文档验证

验证更新的帮助文档：

```bash
# 检查帮助文档是否包含环境变量信息
claude-auto-resume --help

# 期望看到：
# - ENVIRONMENT VARIABLES 部分
# - 所有4个环境变量的说明
# - 环境变量使用示例
# - 更新的安全警告信息
```

## 🚀 生产环境验收

在生产环境中测试环境变量配置：

```bash
# 1. 设置生产环境配置
export CLAUDE_AUTO_RESUME_WAIT_BUFFER=60
export CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS=false
export CLAUDE_AUTO_RESUME_LOG_FILE=/var/log/claude-auto-resume.log

# 2. 验证配置
claude-auto-resume --check

# 3. 实际使用测试（当遇到真实使用限制时）
claude-auto-resume "继续我的任务"
```

## 📝 注意事项

1. **环境变量持久性**：export 命令设置的变量在当前会话有效
2. **配置优先级**：环境变量优先于默认值
3. **验证时机**：环境变量在脚本启动时立即验证
4. **错误处理**：任何验证失败都会立即终止脚本
5. **向后兼容**：未设置环境变量时行为与之前版本完全一致
6. **日志功能**：LOG_FILE 设置为 Story 2.3 做准备，当前版本仅验证路径

## ✅ 验收完成确认

当所有测试通过后，Story 2.2 的环境变量配置功能已准备就绪，可以投入生产使用。

### 功能确认清单

- [x] **CLAUDE_AUTO_RESUME_WAIT_BUFFER**：等待缓冲功能正常
- [x] **CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS**：权限控制功能正常
- [x] **CLAUDE_AUTO_RESUME_LOG_FILE**：日志文件路径验证正常
- [x] **配置显示**：--check 功能完善
- [x] **帮助文档**：环境变量文档完整
- [x] **错误处理**：验证和错误消息完善
- [x] **向后兼容**：现有功能不受影响
- [x] **逻辑优化**：移除不合理的MAX_WAIT参数

**最终验收状态**：✅ **通过验收**

**验收时间**：2025-07-11

**验收人员**：开发团队 + 测试团队

---

## 🔗 相关文档

- [Story 2.2 实现文档](../stories/2.2.story.md)
- [Story 2.1 验收测试指南](story-2.1-acceptance-testing-guide.md)
- [claude-auto-resume 使用手册](../README.md)