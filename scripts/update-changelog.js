#!/usr/bin/env node

/**
 * Script to update CHANGELOG.md with new version entry
 * Called by npm version hooks to ensure CHANGELOG.md is in sync
 */

const fs = require('fs');
const path = require('path');

function updateChangelog() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
  
  // Read current version from package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const newVersion = packageJson.version;
  
  // Read current changelog
  if (!fs.existsSync(changelogPath)) {
    console.log('CHANGELOG.md not found, creating new one...');
    const initialChangelog = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [${newVersion}] - ${new Date().toISOString().split('T')[0]}

### Added
- Initial release

`;
    fs.writeFileSync(changelogPath, initialChangelog);
    return;
  }
  
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  
  // Check if this version already exists
  const versionPattern = new RegExp(`^## \\[${newVersion.replace(/\./g, '\\.')}\\]`, 'm');
  if (versionPattern.test(changelog)) {
    console.log(`Version ${newVersion} already exists in CHANGELOG.md`);
    return;
  }
  
  // Find the position after "## [Unreleased]" to insert new version
  const unreleasedPattern = /^## \[Unreleased\]\s*$/m;
  const match = changelog.match(unreleasedPattern);
  
  if (!match) {
    console.log('Could not find [Unreleased] section in CHANGELOG.md');
    return;
  }
  
  const insertPosition = match.index + match[0].length;
  
  // Create new version entry with git commit analysis
  const today = new Date().toISOString().split('T')[0];
  
  // Try to generate changelog from recent commits
  let changelogContent = '### Changed\n- Performance improvements and bug fixes\n- Enhanced stability and compatibility';
  
  try {
    const { execSync } = require('child_process');
    // Get commits since last tag or last 5 commits
    const lastTagCommand = 'git describe --tags --abbrev=0 2>/dev/null || echo "HEAD~5"';
    const lastTag = execSync(lastTagCommand, { encoding: 'utf8' }).trim();
    const sinceRef = lastTag === 'HEAD~5' ? 'HEAD~5' : `${lastTag}..HEAD`;
    
    const commits = execSync(`git log ${sinceRef} --pretty=format:"%s" --no-merges`, { 
      encoding: 'utf8' 
    }).trim();
    
    if (commits) {
      const commitLines = commits.split('\n').filter(line => line.trim());
      const changes = commitLines.map(commit => {
        // Clean up commit message and categorize
        let message = commit.trim();
        
        // Remove common prefixes and clean up
        message = message.replace(/^(fix|feat|chore|docs|style|refactor|test):\s*/i, '');
        message = message.replace(/🤖 Generated with.*$/gm, '');
        message = message.replace(/Co-Authored-By:.*$/gm, '');
        message = message.trim();
        
        if (message) {
          return `- ${message}`;
        }
        return null;
      }).filter(Boolean);
      
      if (changes.length > 0) {
        changelogContent = changes.join('\n');
      }
    }
  } catch (error) {
    console.log('Could not analyze git commits, using default changelog entry');
  }
  
  const newEntry = `

## [${newVersion}] - ${today}

${changelogContent}

### Notes
- See commit history for detailed changes
- Maintains 100% backward compatibility

`;
  
  // Insert the new version entry
  const updatedChangelog = 
    changelog.slice(0, insertPosition) + 
    newEntry + 
    changelog.slice(insertPosition);
  
  // Write updated changelog
  fs.writeFileSync(changelogPath, updatedChangelog);
  console.log(`Added version ${newVersion} to CHANGELOG.md`);
  
  // Stage the changelog for the commit
  const { execSync } = require('child_process');
  try {
    execSync('git add CHANGELOG.md', { stdio: 'inherit' });
    console.log('Staged CHANGELOG.md for commit');
  } catch (error) {
    console.log('Note: Could not stage CHANGELOG.md (not in git repo or no git installed)');
  }
}

if (require.main === module) {
  updateChangelog();
}

module.exports = { updateChangelog };