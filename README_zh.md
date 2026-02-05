# Claude Auto-Resume

一个 Shell 脚本工具，可在 Claude CLI 使用限制解除后自动恢复任务，或在等待期后执行自定义 Shell 命令。它能检测 Claude 使用限制，智能等待，并自动恢复任务执行。

[English](README.md) | 中文

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/F1F11HO935)

## ⚠️ 安全警告

**此脚本在执行 Claude 命令时使用 `--dangerously-skip-permissions` 标志，并可执行任意 Shell 命令**，这意味着：

- **Claude Code 将在不询问权限的情况下执行任务**
- **自定义 Shell 命令将在没有用户确认的情况下执行**
- **文件操作、系统命令和代码更改将自动运行**
- **仅在受信任的环境中使用，并使用受信任的提示/命令**
- **在运行此脚本之前，请仔细检查您的提示或命令**

**推荐用法：**
- 在隔离的开发环境中使用
- 避免在生产系统或敏感数据上使用
- 使用具体的提示以限制操作范围
- 考虑自动执行的潜在影响

## 使用场景

此脚本在以下场景中使用 Claude Code 进行开发时特别有用：

1. **任务被使用限制中断**：当您的 Claude Code 显示 `Claude usage limit reached.` 但您的任务尚未完全完成时
2. **自动任务恢复**：只需在项目根目录中运行 `claude-auto-resume`，当使用限制解除后，脚本将自动让 Claude Code 继续执行您之前未完成的任务
3. **自定义命令执行**：在等待使用限制解除后执行任何 Shell 命令，适用于重启服务、运行构建或处理数据

## 特性

- 🔄 自动检测 Claude CLI 使用限制
- ⏰ 智能等待并显示倒计时
- 🚀 自动任务恢复
- 🔧 等待期后执行自定义命令
- 🛡️ 安全警告和取消选项
- 🔗 支持复杂命令（管道、重定向、操作符）
- 🧪 内置测试模式用于开发和验证
- 🖥️ 跨平台支持（Linux/macOS/Windows PowerShell）
- 📦 零外部依赖（仅需标准 Unix 工具）

## 安装

Linux/macOS 的安装步骤与原仓库一致，以下内容保持不变。

### 方法 1：使用 wget（推荐）

```bash
wget -qO- https://raw.githubusercontent.com/terryso/claude-auto-resume/refs/heads/develop/claude-auto-resume.sh  | sudo tee /usr/local/bin/claude-auto-resume >/dev/null && sudo chmod +x /usr/local/bin/claude-auto-resume
```

### 方法 2：使用 Makefile

```bash
# 全局安装
sudo make install

# 安装到自定义位置
sudo make install PREFIX=/opt/local

# 卸载
sudo make uninstall
```

### 方法 3：手动安装

```bash
# 复制到系统路径
sudo cp claude-auto-resume.sh /usr/local/bin/claude-auto-resume
sudo chmod +x /usr/local/bin/claude-auto-resume

# 或创建符号链接
sudo ln -s $(pwd)/claude-auto-resume.sh /usr/local/bin/claude-auto-resume
```

### 方法 4：直接使用（无需安装）

```bash
# 使脚本可执行
chmod +x claude-auto-resume.sh

# 直接运行
./claude-auto-resume.sh
```

### Windows（PowerShell）

以下 Windows 步骤为本 fork 新增，Linux/macOS 用户请使用上方方法。

```powershell
# 在仓库根目录执行
$dest = Join-Path $env:USERPROFILE "bin"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item .\claude-auto-resume.ps1, .\claude-auto-resume.cmd $dest
```

确保目标目录已加入用户 PATH，然后执行：

```powershell
claude-auto-resume --help
```

说明：
- `.cmd` 封装器支持在 PowerShell 或 CMD 中直接运行 `claude-auto-resume`
- 优先使用 `pwsh`，若不可用则回退到 Windows PowerShell

## 使用方法

Windows 与 Linux/macOS 使用相同的命令行选项与参数。

### 基本用法

```bash
# 使用默认提示"continue"开始新会话
claude-auto-resume

# 使用自定义提示开始新会话
claude-auto-resume "implement user authentication"

# 使用标志指定自定义提示开始新会话
claude-auto-resume -p "write unit tests"

# 使用自定义提示继续上一次对话
claude-auto-resume -c "please continue the previous task"

# 使用标志指定自定义提示继续上一次对话
claude-auto-resume -c -p "resume where we left off"

# 等待期后执行自定义命令
claude-auto-resume -e "npm run dev"

# 使用别名标志执行自定义命令
claude-auto-resume --cmd "python app.py"

# 显示帮助
claude-auto-resume --help
```

### 本地使用（安装前）

```bash
# 确保脚本可执行
chmod +x claude-auto-resume.sh

# 使用默认提示开始新会话
./claude-auto-resume.sh

# 使用自定义提示开始新会话
./claude-auto-resume.sh "create login page"

# 继续上一次对话
./claude-auto-resume.sh -c "continue with the implementation"

# 等待期后执行自定义命令
./claude-auto-resume.sh -e "make build"
```

## 工作原理

1. **检测限制**：执行 `claude -p 'check'` 命令
2. **解析输出**：查找 `Claude AI usage limit reached|<timestamp>` 格式的消息
3. **计算等待时间**：根据时间戳计算所需等待时间
4. **显示倒计时**：实时显示剩余等待时间
5. **自动恢复**：自动执行以下命令之一：
   - `claude --dangerously-skip-permissions -p "<custom-prompt>"` （新会话，默认）
   - `claude -c --dangerously-skip-permissions -p "<custom-prompt>"` （使用 -c 标志继续对话）
   - 使用 `-e/--execute` 或 `--cmd` 标志执行自定义 Shell 命令

## 命令行选项

- **无参数**：使用默认提示"continue"开始新会话
- **单一参数**：使用自定义提示开始新会话（例如，`claude-auto-resume "implement feature"`）
- **-p, --prompt**：使用标志指定自定义提示（例如，`claude-auto-resume -p "write tests"`）
- **-c, --continue**：继续上一次对话（向 claude 命令添加 -c 标志）
- **-e, --execute**：等待期后执行自定义 Shell 命令（例如，`claude-auto-resume -e "npm run dev"`）
- **--cmd**：-e/--execute 的别名（例如，`claude-auto-resume --cmd "python app.py"`）
- **--test-mode**：[开发] 使用指定的等待时间（秒）模拟使用限制
- **-h, --help**：显示帮助信息和使用示例
- **-v, --version**：显示版本信息
- **--check**：显示系统检查信息

## 会话类型

### 开始新会话（默认）
使用不带 `-c` 的 `claude` 进行全新对话：
```bash
claude-auto-resume                    # 使用"continue"开始新会话
claude-auto-resume "new feature"      # 使用自定义提示开始新会话
claude-auto-resume -p "write tests"   # 使用标志开始新会话
```

### 继续上一次对话
使用 `claude -c` 继续上一次对话：
```bash
claude-auto-resume -c "keep going"           # 使用自定义提示继续对话
claude-auto-resume -c -p "resume work"       # 使用标志继续对话
```

### 执行自定义命令
等待期后执行任何 Shell 命令：
```bash
claude-auto-resume -e "npm run dev"                    # 启动开发服务器
claude-auto-resume --cmd "python app.py"               # 运行 Python 应用程序
claude-auto-resume -e "make build && ./app"            # 带操作符的复杂命令
claude-auto-resume -e "ls -la | grep '.js' | wc -l"    # 管道命令
claude-auto-resume -e "echo 'Step 1'; echo 'Step 2'"   # 多个命令
```

### 开发和测试
使用内置测试模式进行开发和验证：
```bash
claude-auto-resume --test-mode 5 -e "echo 'Test command'"    # 使用 5 秒等待进行测试
claude-auto-resume --test-mode 10 --cmd "npm run test"       # 测试构建过程
```

## 要求

- **Claude CLI**：必须安装并在 PATH 中可用
- **标准 Unix 工具**：`grep`、`date`、`sleep`、`awk`（通常预装）
- **Windows**：PowerShell 5.1+ 或 PowerShell 7+（当使用 Windows 脚本时）

## 安全考虑

### 权限绕过
此脚本使用 `--dangerously-skip-permissions` 以启用无人值守操作。这意味着：

1. **无交互式提示**：Claude 不会在执行命令前请求确认
2. **自动执行**：文件更改、系统命令和其他操作在没有用户批准的情况下运行
3. **信任要求**：您必须同时信任脚本和您提供的提示

### 最佳实践
- **环境隔离**：仅在开发/测试环境中使用
- **提示审查**：仔细构建提示以限制范围（例如，"继续在 src/auth.js 中实现登录功能"）
- **命令审查**：验证自定义命令对您的环境是安全和适当的
- **备份您的工作**：在运行前确保您有版本控制或备份
- **监控执行**：检查输出以了解执行了哪些操作
- **限制范围**：使用具体的提示/命令而不是开放式的

## 错误处理

脚本包括全面的错误处理：

- **退出代码 1**：Claude CLI 执行失败
- **退出代码 2**：无法提取有效的恢复时间戳
- **退出代码 4**：恢复命令执行失败

## 测试

```bash
# 语法检查
make test

# 或直接使用 bash
bash -n claude-auto-resume.sh
```

## 项目结构

```
claude-auto-resume/
├── claude-auto-resume.sh    # 主脚本
├── claude-auto-resume.ps1   # Windows PowerShell 脚本
├── claude-auto-resume.cmd   # Windows 启动封装器
├── Makefile                 # 安装/卸载脚本
├── docs/                    # 项目文档
│   ├── architecture.md      # 架构文档
│   ├── prd.md              # 产品需求文档
│   └── stories/            # 用户故事
├── CLAUDE.md               # Claude Code 指南
└── README.md               # 项目描述
```

## 路线图

查看我们的[开发路线图](docs/ROADMAP.md)了解计划的功能和改进，包括：

- **阶段 1**：核心稳定性改进（环境验证、错误处理）
- **阶段 2**：功能扩展（自定义命令执行、配置选项）
- **阶段 3**：用户体验优化（增强帮助、更好的时间显示）

## 贡献

1. Fork 此仓库
2. 创建功能分支（`git checkout -b feature/AmazingFeature`）
3. 提交您的更改（`git commit -m 'Add some AmazingFeature'`）
4. 推送到分支（`git push origin feature/AmazingFeature`）
5. 创建 Pull Request

在贡献新功能之前，请查看我们的[路线图](docs/ROADMAP.md)以确保与项目目标保持一致。

## 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件

## 致谢

- 原始项目与 Bash 实现作者：terryso（https://github.com/terryso/claude-auto-resume）
- 本 fork 增加 Windows PowerShell 版本与 Windows 安装说明

## 支持

如果您遇到问题或有建议：

1. 查看现有的[问题](https://github.com/terryso/claude-auto-resume/issues)
2. 创建一个新的问题描述问题
3. 或提交一个 Pull Request

## ⭐ Star 历史

[![Star History Chart](https://api.star-history.com/svg?repos=terryso/claude-auto-resume&type=Date)](https://www.star-history.com/#terryso/claude-auto-resume&Date)

---

**注意**：此工具依赖于 Claude CLI 输出格式。如果 Claude CLI 更新改变了输出格式，可能需要更新脚本。 
