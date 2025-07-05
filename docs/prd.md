# Claude Auto-Resume Product Requirements Document (PRD)

## Goals and Background Context

### Goals

*   Automate the process of resuming a Claude task after a usage limit has been reached.
*   Eliminate the need for manual intervention to continue a task after the restriction is lifted.
*   Provide a seamless user experience for long-running tasks that may encounter usage limits.

### Background Context

Currently, when a user hits the Claude API usage limit, their work is interrupted. They receive a message indicating the time when they can resume their task. This requires the user to remember to manually execute a "continue" command at a later time, which is inconvenient and can lead to delays, especially if the user is unavailable when the limit is lifted. This tool aims to solve this problem by automating the resumption process.

### Change Log

| Date | Version | Description | Author |
| :--- | :------ | :---------- | :----- |
| 2025-07-06 | 1.0 | Initial draft | Gemini |

## Requirements

### Functional

*   FR1: The tool must be able to execute a `claude -p 'check'` command.
*   FR2: The tool must be able to parse the output of the `claude -p 'check'` command to identify if the usage limit has been reached.
*   FR3: The tool must be able to extract the resume timestamp from the "Claude AI usage limit reached" message.
*   FR4: The tool must calculate the remaining time until the resume timestamp.
*   FR5: The tool must wait for the calculated duration.
*   FR6: After the wait, the tool must automatically execute the `claude -c -p 'continue'` command.
*   FR7: The tool should print a message indicating when it will resume.

### Non Functional

*   NFR1: The tool should be a self-contained shell script.
*   NFR2: The tool should be executable from the command line.
*   NFR3: The tool should not require any external dependencies beyond standard shell commands.

## Technical Assumptions

### Repository Structure

*   Polyrepo

### Service Architecture

*   A single shell script.

### Testing requirements

*   Manual testing will be sufficient for this tool.

### Additional Technical Assumptions and Requests

*   The script will be named `claude-auto-resume.sh`.
*   The script will be made executable using `chmod +x`.

## Epics

- Epic1 Claude Auto-Resume: Create a shell script to automatically resume Claude tasks after usage limits are lifted.

## Epic 1 Claude Auto-Resume

Create a shell script to automatically resume Claude tasks after usage limits are lifted.

### Story 1.1 Create the auto-resume script

As a user,
I want a shell script that can check for Claude usage limits and automatically resume my task,
so that I don't have to manually intervene.

#### Acceptance Criteria

- 1: The script, when executed, runs `claude -p 'check'`.
- 2: The script can parse the output to find "Claude AI usage limit reached|TIMESTAMP".
- 3: The script calculates the wait time from the TIMESTAMP.
- 4: The script sleeps for the required duration.
- 5: The script executes `claude -c -p 'continue'` after sleeping.
- 6: The script is named `claude-auto-resume.sh`.
- 7: The script has execute permissions.
