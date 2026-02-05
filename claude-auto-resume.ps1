#!/usr/bin/env pwsh
<#!
.SYNOPSIS
  Auto-resume script for Claude CLI tasks (PowerShell port)
#>

$ErrorActionPreference = 'Stop'

$VERSION = '1.4.1'
$DEFAULT_PROMPT = 'continue'
$USE_CONTINUE_FLAG = $false
$EXECUTE_MODE = $false
$CUSTOM_COMMAND = ''
$TEST_MODE = $false
$TEST_WAIT_SECONDS = 0

$script:CLEANUP_DONE = $false
$script:CLAUDE_PROCESS = $null

function Cleanup-Resources {
  if ($script:CLEANUP_DONE) { return }
  if ($script:CLAUDE_PROCESS -and -not $script:CLAUDE_PROCESS.HasExited) {
    try { $script:CLAUDE_PROCESS.Kill() } catch {}
    Start-Sleep -Seconds 1
    try { if (-not $script:CLAUDE_PROCESS.HasExited) { $script:CLAUDE_PROCESS.Kill() } } catch {}
  }
  $script:CLAUDE_PROCESS = $null
  $script:CLEANUP_DONE = $true
}

function On-CtrlC {
  Write-Host ""
  Write-Host "[INFO] Script interrupted by user (Ctrl+C)"
  Write-Host "[INFO] Cleaning up and exiting gracefully..."
  Cleanup-Resources
  exit 130
}

# Trap Ctrl+C
$null = Register-EngineEvent -SourceIdentifier Console_CancelKeyPress -Action {
  On-CtrlC
}

function Show-Help {
@"
Usage: claude-auto-resume [OPTIONS] [PROMPT]

Automatically resume Claude CLI tasks after usage limits are lifted.

OPTIONS:
    -p, --prompt PROMPT    Custom prompt (default: "continue")
    -c, --continue        Continue previous conversation
    -e, --execute COMMAND  Execute custom command after usage limit wait period
    --cmd COMMAND         Execute custom command after usage limit wait period (alias for -e)
    -h, --help           Show this help
    -v, --version        Show version information
    --check              Show system check information
    --test-mode SECONDS   [DEV] Simulate usage limit with specified wait time in seconds

EXAMPLES:
    claude-auto-resume "implement feature"
    claude-auto-resume -c "continue task"
    claude-auto-resume -p "write tests"
    claude-auto-resume -e "npm run dev"     # Executes after usage limit wait
    claude-auto-resume --cmd "python app.py"  # Executes after usage limit wait
    claude-auto-resume --test-mode 10 -e "echo test"  # [DEV] Test with 10s wait

WARNING: Uses --dangerously-skip-permissions. Use only in trusted environments.
WARNING: Custom command execution allows arbitrary shell commands. Use with caution.
"@ | Write-Host
}

function Check-NetworkConnectivity {
  try {
    if (Test-Connection -ComputerName 8.8.8.8 -Count 1 -Quiet -ErrorAction SilentlyContinue) { return $true }
    if (Test-Connection -ComputerName 1.1.1.1 -Count 1 -Quiet -ErrorAction SilentlyContinue) { return $true }
  } catch {}
  try {
    $null = Invoke-WebRequest -Uri 'https://www.google.com' -UseBasicParsing -TimeoutSec 5
    return $true
  } catch {}
  return $false
}

function Validate-ClaudeCLI {
  $cmd = Get-Command claude -ErrorAction SilentlyContinue
  if (-not $cmd) {
    Write-Host "[ERROR] Claude CLI not found. Please install Claude CLI first."
    Write-Host "[SUGGESTION] Visit https://claude.ai/code for installation instructions."
    Write-Host "[DEBUG] Searched PATH for 'claude' command"
    exit 1
  }
  try {
    $help = & claude --help 2>$null
    if ($help -notmatch 'dangerously-skip-permissions') {
      Write-Host "[WARNING] Your Claude CLI version may not support --dangerously-skip-permissions flag."
      Write-Host "[SUGGESTION] This script requires a recent version of Claude CLI. Please consider updating."
      Write-Host "[DEBUG] Run 'claude --help' to see available options"
      Write-Host "The script will continue but may fail during execution."
    }
  } catch {
    Write-Host "[WARNING] Unable to check claude --help. Continuing."
  }
}

function Invoke-ProcessWithTimeout {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [int]$TimeoutSeconds = 300
  )

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $FilePath
  $psi.Arguments = ($Arguments -join ' ')
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true

  $p = New-Object System.Diagnostics.Process
  $p.StartInfo = $psi
  $null = $p.Start()
  $script:CLAUDE_PROCESS = $p

  if ($TimeoutSeconds -le 0) {
    $p.WaitForExit()
  } else {
    if (-not $p.WaitForExit($TimeoutSeconds * 1000)) {
      try { $p.Kill() } catch {}
      return @{ ExitCode = 124; Output = ($p.StandardOutput.ReadToEnd() + $p.StandardError.ReadToEnd()) }
    }
  }

  $out = $p.StandardOutput.ReadToEnd()
  $err = $p.StandardError.ReadToEnd()
  return @{ ExitCode = $p.ExitCode; Output = ($out + $err) }
}

function Execute-CustomCommand {
  param([string]$Command)

  Write-Host "WARNING: About to execute custom command: '$Command'"
  Write-Host "WARNING: This command will be executed with full shell privileges."
  Write-Host "WARNING: Press Ctrl+C within 5 seconds to cancel..."
  for ($i = 5; $i -ge 1; $i--) {
    Write-Host -NoNewline ("`rExecuting in {0} seconds... " -f $i)
    Start-Sleep -Seconds 1
  }
  Write-Host "`rExecuting custom command...                    "

  $start = Get-Date
  Write-Host "Executing: $Command"
  Write-Host "===================="

  $proc = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $Command) -Wait -PassThru
  $exitCode = $proc.ExitCode

  $duration = (Get-Date) - $start
  Write-Host "===================="
  Write-Host "Command completed with exit code: $exitCode"
  Write-Host ("Execution time: {0} seconds" -f [int]$duration.TotalSeconds)

  if ($exitCode -eq 0) {
    Write-Host "Custom command executed successfully."
  } else {
    Write-Host "Custom command failed with exit code: $exitCode"
    Write-Host "[HINT] Check the command syntax and permissions."
    Write-Host "[DEBUG] Command: $Command"
  }

  return $exitCode
}

function Extract-OldFormatTimestamp {
  param([string]$ClaudeOutput)
  $parts = $ClaudeOutput -split '\|'
  if ($parts.Length -lt 2) {
    Write-Host "[ERROR] Failed to extract a valid resume timestamp from Claude output."
    Write-Host "[HINT] Expected format: 'Claude AI usage limit reached|<timestamp>'"
    Write-Host "[SUGGESTION] Check if Claude CLI output format has changed."
    Write-Host "[DEBUG] Raw output: $ClaudeOutput"
    exit 2
  }
  $ts = $parts[1].Trim()
  if (-not ($ts -match '^[0-9]+$') -or [int64]$ts -le 0) {
    Write-Host "[ERROR] Failed to extract a valid resume timestamp from Claude output."
    Write-Host "[HINT] Expected format: 'Claude AI usage limit reached|<timestamp>'"
    Write-Host "[SUGGESTION] Check if Claude CLI output format has changed."
    Write-Host "[DEBUG] Raw output: $ClaudeOutput"
    Write-Host "[DEBUG] Extracted timestamp: '$ts'"
    exit 2
  }
  return [int64]$ts
}

function Extract-NewFormatTimestamp {
  param([string]$ClaudeOutput)

  $m = [regex]::Match($ClaudeOutput, 'resets\s+(\d+)(am|pm)', 'IgnoreCase')
  if (-not $m.Success) {
    Write-Host "[ERROR] Failed to extract reset time from new Claude output format."
    Write-Host "[HINT] Expected format: 'X-hour limit reached - resets Xam/pm' or 'You've hit your limit  resets Xam/pm (Zone)'"
    Write-Host "[SUGGESTION] Check if Claude CLI output format has changed."
    Write-Host "[DEBUG] Raw output: $ClaudeOutput"
    exit 2
  }

  $hour = [int]$m.Groups[1].Value
  $period = $m.Groups[2].Value.ToLowerInvariant()

  if ($period -eq 'am') {
    if ($hour -eq 12) { $hour = 0 }
  } else {
    if ($hour -ne 12) { $hour += 12 }
  }

  $now = Get-Date
  $todayReset = $now.Date.AddHours($hour)
  if ($now -gt $todayReset) {
    $resume = $todayReset.AddDays(1)
  } else {
    $resume = $todayReset
  }

  return [int64]([DateTimeOffset]$resume).ToUnixTimeSeconds()
}

try {
  # Parse args
  $CUSTOM_PROMPT = $DEFAULT_PROMPT

  for ($i = 0; $i -lt $args.Count; $i++) {
    $arg = $args[$i]
    switch ($arg) {
      '-p' {
        if ($i + 1 -ge $args.Count) { Write-Host "[ERROR] Option $arg requires a prompt argument."; exit 1 }
        $CUSTOM_PROMPT = $args[$i + 1]; $i++
      }
      '--prompt' {
        if ($i + 1 -ge $args.Count) { Write-Host "[ERROR] Option $arg requires a prompt argument."; exit 1 }
        $CUSTOM_PROMPT = $args[$i + 1]; $i++
      }
      '-c' { $USE_CONTINUE_FLAG = $true }
      '--continue' { $USE_CONTINUE_FLAG = $true }
      '-e' {
        if ($i + 1 -ge $args.Count) { Write-Host "[ERROR] Option $arg requires a command argument."; exit 1 }
        $EXECUTE_MODE = $true; $CUSTOM_COMMAND = $args[$i + 1]; $i++
      }
      '--execute' {
        if ($i + 1 -ge $args.Count) { Write-Host "[ERROR] Option $arg requires a command argument."; exit 1 }
        $EXECUTE_MODE = $true; $CUSTOM_COMMAND = $args[$i + 1]; $i++
      }
      '--cmd' {
        if ($i + 1 -ge $args.Count) { Write-Host "[ERROR] Option $arg requires a command argument."; exit 1 }
        $EXECUTE_MODE = $true; $CUSTOM_COMMAND = $args[$i + 1]; $i++
      }
      '-h' { Show-Help; exit 0 }
      '--help' { Show-Help; exit 0 }
      '-v' { Write-Host "claude-auto-resume v$VERSION"; exit 0 }
      '--version' { Write-Host "claude-auto-resume v$VERSION"; exit 0 }
      '--test-mode' {
        if ($i + 1 -ge $args.Count -or -not ($args[$i + 1] -match '^[0-9]+$')) {
          Write-Host "[ERROR] Option $arg requires a valid number of seconds."; exit 1
        }
        $TEST_MODE = $true
        $TEST_WAIT_SECONDS = [int]$args[$i + 1]
        $i++
      }
      '--check' {
        Write-Host "claude-auto-resume v$VERSION - System Check"
        Write-Host "================================================"
        Write-Host ""
        Write-Host "Script Information:"
        Write-Host "  Version: $VERSION"
        Write-Host "  Location: $PSCommandPath"
        Write-Host ""
        Write-Host "Claude CLI Information:"
        $cmd = Get-Command claude -ErrorAction SilentlyContinue
        if ($cmd) {
          Write-Host "  Status: Available"
          Write-Host "  Location: $($cmd.Source)"
          $ver = & claude --version 2>$null
          if (-not $ver) { $ver = 'Unknown' }
          Write-Host "  Version: $ver"
          $help = & claude --help 2>$null
          if ($help -match 'dangerously-skip-permissions') {
            Write-Host "  --dangerously-skip-permissions: Supported"
          } else {
            Write-Host "  --dangerously-skip-permissions: Not supported"
          }
        } else {
          Write-Host "  Status: Not found"
          Write-Host "  [ERROR] Claude CLI not found in PATH"
        }
        Write-Host ""
        Write-Host "System Compatibility:"
        Write-Host "  OS: $([System.Environment]::OSVersion.VersionString)"
        Write-Host "  Architecture: $env:PROCESSOR_ARCHITECTURE"
        Write-Host "  Shell: $($PSVersionTable.PSEdition) PowerShell $($PSVersionTable.PSVersion)"
        Write-Host ""
        Write-Host "Network Utilities:"
        if (Get-Command curl -ErrorAction SilentlyContinue) { $curlStatus = 'Available' } else { $curlStatus = 'Not found' }
        if (Get-Command wget -ErrorAction SilentlyContinue) { $wgetStatus = 'Available' } else { $wgetStatus = 'Not found' }
        Write-Host "  ping: Available"
        Write-Host "  curl: $curlStatus"
        Write-Host "  wget: $wgetStatus"
        Write-Host ""
        Write-Host "Environment Validation:"
        if ($cmd) { $cliStatus = 'Available' } else { $cliStatus = 'Not found' }
        Write-Host "  Claude CLI: $cliStatus"
        Write-Host -NoNewline "  Network connectivity: "
        if (Check-NetworkConnectivity) { Write-Host "Connected" } else { Write-Host "Failed" }
        exit 0
      }
      default {
        if ($arg -like '-*') {
          Write-Host "Unknown option: $arg"
          Show-Help
          exit 1
        }
        $CUSTOM_PROMPT = $arg
      }
    }
  }

  if ($EXECUTE_MODE -and $USE_CONTINUE_FLAG) {
    Write-Host "[ERROR] Cannot use both custom command execution (-e/--execute/--cmd) and continue flag (-c/--continue)."
    Write-Host "[HINT] Choose either Claude conversation continuation or custom command execution."
    Write-Host "[SUGGESTION] Use 'claude-auto-resume --help' to see usage examples."
    exit 1
  }

  if ($EXECUTE_MODE -and [string]::IsNullOrWhiteSpace($CUSTOM_COMMAND)) {
    Write-Host "[ERROR] Custom command cannot be empty when using execute mode."
    Write-Host "[HINT] Provide a command to execute after -e/--execute/--cmd flag."
    Write-Host "[SUGGESTION] Example: claude-auto-resume -e 'npm run dev'"
    exit 1
  }

  if (-not $EXECUTE_MODE) {
    Validate-ClaudeCLI
  }

  Write-Host "Checking network connectivity..."
  if (-not (Check-NetworkConnectivity)) {
    Write-Host "[ERROR] Network connectivity check failed."
    Write-Host "[HINT] Claude CLI requires internet connection to function properly."
    Write-Host "[SUGGESTION] Please check your internet connection and try again."
    Write-Host "[DEBUG] Tested: ping 8.8.8.8, ping 1.1.1.1, and HTTPS connectivity"
    exit 3
  }
  Write-Host "Network connectivity confirmed."

  # Run claude check with timeout
  $CLAUDE_OUTPUT = ''
  $RET_CODE = 0

  if ($EXECUTE_MODE) {
    Write-Host "Execute mode detected. Checking for usage limits..."
    Write-Host "[INFO] This check may take 1-2 minutes depending on network conditions..."
    if (Get-Command claude -ErrorAction SilentlyContinue) {
      $res = Invoke-ProcessWithTimeout -FilePath 'claude' -Arguments @('-p','check') -TimeoutSeconds 300
      $RET_CODE = $res.ExitCode
      $CLAUDE_OUTPUT = $res.Output
    } else {
      Write-Host "[WARNING] Claude CLI not found. Skipping usage limit check in execute mode."
      $RET_CODE = 0
      $CLAUDE_OUTPUT = ''
    }
  } else {
    Write-Host "Executing Claude CLI command..."
    Write-Host "[INFO] This check may take 1-2 minutes depending on network conditions..."
    $res = Invoke-ProcessWithTimeout -FilePath 'claude' -Arguments @('-p','check') -TimeoutSeconds 300
    $RET_CODE = $res.ExitCode
    $CLAUDE_OUTPUT = $res.Output
  }

  if ($RET_CODE -eq 124) {
    if ($EXECUTE_MODE) {
      Write-Host "[WARNING] Claude CLI operation timed out after 300 seconds in execute mode."
      Write-Host "[HINT] Will proceed with custom command execution without usage limit detection."
    } else {
      Write-Host "[ERROR] Claude CLI operation timed out after 300 seconds."
      Write-Host "[HINT] This may indicate network issues or Claude service problems."
      Write-Host "[SUGGESTION] Try again in a few minutes, or check Claude service status."
      Write-Host "[DEBUG] Command executed: claude -p 'check'"
      exit 3
    }
  }

  if (-not $CLAUDE_OUTPUT -and $RET_CODE -eq 0 -and -not $EXECUTE_MODE) {
    Write-Host "[ERROR] Claude CLI returned empty output unexpectedly."
    Write-Host "[HINT] This may indicate Claude CLI installation or configuration issues."
    Write-Host "[SUGGESTION] Try running 'claude --help' to verify CLI is working properly."
    Write-Host "[DEBUG] Command succeeded but returned no output"
    exit 5
  }

  $LIMIT_MSG = ''
  $limitPattern = '(?i)(usage limit|limit reached|hit your limit).*resets'
  $resetPattern = '(?i)resets\s+\d+(am|pm)'
  if ($CLAUDE_OUTPUT -match $limitPattern -or $CLAUDE_OUTPUT -match $resetPattern) {
    $LIMIT_MSG = $CLAUDE_OUTPUT
  }

  if ($TEST_MODE) {
    Write-Host "[TEST MODE] Simulating usage limit with ${TEST_WAIT_SECONDS} seconds wait time..."
    $LIMIT_MSG = 'Claude AI usage limit reached|simulated'
  }

  if ($LIMIT_MSG) {
    if ($TEST_MODE) {
      $nowTs = [DateTimeOffset]::Now.ToUnixTimeSeconds()
      $resumeTs = $nowTs + $TEST_WAIT_SECONDS
      $waitSeconds = $TEST_WAIT_SECONDS
    } else {
      if ($CLAUDE_OUTPUT -match 'Claude AI usage limit reached\|') {
        $resumeTs = Extract-OldFormatTimestamp -ClaudeOutput $CLAUDE_OUTPUT
      } else {
        $resumeTs = Extract-NewFormatTimestamp -ClaudeOutput $CLAUDE_OUTPUT
      }
      $nowTs = [DateTimeOffset]::Now.ToUnixTimeSeconds()
      $waitSeconds = [int]($resumeTs - $nowTs)
    }

    if ($waitSeconds -le 0) {
      Write-Host "Resume time has arrived. Retrying now."
    } else {
      $resumeTime = [DateTimeOffset]::FromUnixTimeSeconds($resumeTs).LocalDateTime
      Write-Host ("Claude usage limit detected. Waiting until {0:yyyy-MM-dd HH:mm:ss}..." -f $resumeTime)
      while ($waitSeconds -gt 0) {
        $h = [int]($waitSeconds / 3600)
        $m = [int](($waitSeconds % 3600) / 60)
        $s = [int]($waitSeconds % 60)
        Write-Host -NoNewline ("`rResuming in {0:00}:{1:00}:{2:00}..." -f $h, $m, $s)
        Start-Sleep -Seconds 1
        $nowTs = [DateTimeOffset]::Now.ToUnixTimeSeconds()
        $waitSeconds = [int]($resumeTs - $nowTs)
      }
      Write-Host "`rResume time has arrived. Retrying now.           "
    }

    Start-Sleep -Seconds 10

    if (-not $EXECUTE_MODE) {
      Write-Host "Re-checking network connectivity before resuming..."
      if (-not (Check-NetworkConnectivity)) {
        Write-Host "[ERROR] Network connectivity lost during wait period."
        Write-Host "[SUGGESTION] Please check your internet connection and run the script again."
        exit 3
      }
    }

    if ($EXECUTE_MODE) {
      Write-Host "Executing custom command after wait period..."
      $exitCode2 = Execute-CustomCommand -Command $CUSTOM_COMMAND
      if ($exitCode2 -ne 0) {
        Write-Host "[ERROR] Custom command failed with exit code: $exitCode2"
        Write-Host "[HINT] Check the command syntax and permissions."
        Write-Host "[DEBUG] Command: $CUSTOM_COMMAND"
        exit 4
      }
      Write-Host "Custom command has been executed successfully."
    } else {
      if ($USE_CONTINUE_FLAG) {
        Write-Host "Automatically continuing previous Claude conversation with prompt: '$CUSTOM_PROMPT'"
        $res2 = Invoke-ProcessWithTimeout -FilePath 'claude' -Arguments @('-c','--dangerously-skip-permissions','-p',"$CUSTOM_PROMPT") -TimeoutSeconds 0
      } else {
        Write-Host "Automatically starting new Claude session with prompt: '$CUSTOM_PROMPT'"
        $res2 = Invoke-ProcessWithTimeout -FilePath 'claude' -Arguments @('--dangerously-skip-permissions','-p',"$CUSTOM_PROMPT") -TimeoutSeconds 0
      }
      $RET_CODE2 = $res2.ExitCode
      $CLAUDE_OUTPUT2 = $res2.Output

      if ($RET_CODE2 -ne 0) {
        Write-Host "[ERROR] Claude CLI failed after resume."
        Write-Host "[HINT] This may indicate authentication issues or service problems."
        Write-Host "[SUGGESTION] Try running 'claude --help' to verify CLI is working properly."
        Write-Host "[DEBUG] Exit code: $RET_CODE2"
        Write-Host "[DEBUG] Output: $CLAUDE_OUTPUT2"
        exit 4
      }
      Write-Host "Task has been automatically resumed and completed."
      Write-Host "CLAUDE_OUTPUT:"
      Write-Host $CLAUDE_OUTPUT2
    }

    exit 0
  }

  if ($RET_CODE -ne 0 -and -not $EXECUTE_MODE) {
    Write-Host "[ERROR] Claude CLI execution failed."
    Write-Host "[HINT] This may indicate authentication, network, or service issues."
    Write-Host "[SUGGESTION] Check your Claude CLI authentication and try again."
    Write-Host "[DEBUG] Exit code: $RET_CODE"
    Write-Host "[DEBUG] Command executed: claude -p 'check'"
    Write-Host "[DEBUG] Output: $CLAUDE_OUTPUT"
    exit 1
  }

  if ($EXECUTE_MODE) {
    Write-Host "No usage limit detected. Custom command will only execute after a usage limit wait period."
    Write-Host "Since there is no usage limit, the custom command will not be executed."
    Write-Host "Use claude-auto-resume in execute mode only when you expect usage limits."
    exit 0
  }

  Write-Host "No waiting required. Task completed."
  exit 0
}
finally {
  Cleanup-Resources
}

