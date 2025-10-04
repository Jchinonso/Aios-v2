#!/usr/bin/env node

/**
 * Universal AIOS CLI Installer
 * Works on Linux, macOS, and Windows
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const colors = {
  reset: '\x1b[0m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    return execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
  } catch (error) {
    if (!options.ignoreErrors) {
      throw error;
    }
    return null;
  }
}

async function main() {
  log('\n🚀 AIOS CLI Universal Installer\n', 'blue');
  log('════════════════════════════════════════════════════════════', 'cyan');

  const platform = os.platform();
  const isWindows = platform === 'win32';
  const isMac = platform === 'darwin';
  const isLinux = platform === 'linux';

  log(`📦 Detected Platform: ${platform}`, 'cyan');
  log(`🏠 Home Directory: ${os.homedir()}`, 'cyan');
  log(`📁 Current Directory: ${process.cwd()}\n`, 'cyan');

  // Step 1: Check Node.js version
  log('🔍 Checking Node.js version...', 'blue');
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion < 18) {
    log(`❌ Error: Node.js 18+ required. Current version: ${nodeVersion}`, 'red');
    log('Please upgrade Node.js: https://nodejs.org/', 'yellow');
    process.exit(1);
  }
  log(`✅ Node.js ${nodeVersion} detected\n`, 'green');

  // Step 2: Build the project
  log('🔨 Building AIOS CLI...', 'blue');
  try {
    exec('npm run build');
    log('✅ Build successful\n', 'green');
  } catch (error) {
    log('❌ Build failed', 'red');
    process.exit(1);
  }

  // Step 3: Setup npm global prefix (platform-specific)
  log('⚙️  Setting up npm global configuration...', 'blue');

  const npmGlobalDir = path.join(os.homedir(), '.npm-global');

  // Create directory if it doesn't exist
  if (!fs.existsSync(npmGlobalDir)) {
    fs.mkdirSync(npmGlobalDir, { recursive: true });
    log(`✅ Created directory: ${npmGlobalDir}`, 'green');
  }

  // Set npm prefix
  try {
    exec(`npm config set prefix "${npmGlobalDir}"`, { silent: true });
    log('✅ npm prefix configured\n', 'green');
  } catch (error) {
    log('⚠️  Warning: Could not set npm prefix', 'yellow');
  }

  // Step 4: Install globally
  log('📦 Installing AIOS CLI globally...', 'blue');

  try {
    // Try npm link first
    exec('npm link', { silent: true, ignoreErrors: true });
    log('✅ AIOS CLI linked globally\n', 'green');
  } catch (error) {
    log('⚠️  npm link failed, trying alternative method...', 'yellow');
    try {
      exec('npm install -g .', { ignoreErrors: false });
      log('✅ AIOS CLI installed globally\n', 'green');
    } catch (installError) {
      log('❌ Installation failed', 'red');
      log('\nTry running with elevated permissions:', 'yellow');
      if (isWindows) {
        log('  Run Command Prompt or PowerShell as Administrator', 'yellow');
      } else {
        log('  sudo npm link', 'yellow');
        log('  or', 'yellow');
        log('  sudo npm install -g .', 'yellow');
      }
      process.exit(1);
    }
  }

  // Step 5: Configure PATH
  log('🔧 Configuring PATH...', 'blue');

  const binPath = path.join(npmGlobalDir, 'bin');
  let pathInstructions = '';

  if (isWindows) {
    pathInstructions = `
Add to Windows PATH:
1. Press Win + X, select "System"
2. Click "Advanced system settings"
3. Click "Environment Variables"
4. Under "User variables", select "Path" and click "Edit"
5. Click "New" and add: ${binPath}
6. Click "OK" on all dialogs
7. Restart your terminal

Or run this in PowerShell (as Administrator):
  [Environment]::SetEnvironmentVariable('Path', "$env:Path;${binPath}", 'User')
`;
  } else if (isMac) {
    const shellRc = fs.existsSync(path.join(os.homedir(), '.zshrc')) ? '.zshrc' : '.bash_profile';
    pathInstructions = `
Add to your shell configuration:
  echo 'export PATH="${binPath}:$PATH"' >> ~/${shellRc}
  source ~/${shellRc}

Or run:
  export PATH="${binPath}:$PATH"
`;
  } else if (isLinux) {
    const shellRc = process.env.SHELL?.includes('zsh') ? '.zshrc' : '.bashrc';
    pathInstructions = `
Add to your shell configuration:
  echo 'export PATH="${binPath}:$PATH"' >> ~/${shellRc}
  source ~/${shellRc}

Or run:
  export PATH="${binPath}:$PATH"
`;
  }

  log(pathInstructions, 'cyan');

  // Step 6: Verify installation
  log('✅ Verifying installation...', 'blue');

  try {
    const aioslocation = exec('which aios', { silent: true, ignoreErrors: true })?.toString().trim() ||
                         exec('where aios', { silent: true, ignoreErrors: true })?.toString().trim();

    if (aioslocation) {
      log(`✅ aios command found at: ${aioslocation}`, 'green');
    } else {
      log('⚠️  Could not verify aios command location', 'yellow');
      log('   This is normal - you may need to restart your terminal', 'yellow');
    }
  } catch (error) {
    log('⚠️  Could not verify installation automatically', 'yellow');
  }

  // Step 7: Success message
  log('\n════════════════════════════════════════════════════════════', 'cyan');
  log('✅ AIOS CLI Installation Complete!\n', 'green');

  log('📋 Next Steps:', 'blue');
  log('  1. Restart your terminal (or run the PATH command above)', 'cyan');
  log('  2. Verify installation: aios --version', 'cyan');
  log('  3. Show help: aios --help', 'cyan');
  log('  4. Run interactive mode: aios-cli', 'cyan');
  log('\n🎉 Happy deploying!\n', 'green');

  // Step 8: Quick test
  log('🧪 Testing installation...', 'blue');
  log('   Running: aios --version\n', 'cyan');

  try {
    // Set PATH for this process
    process.env.PATH = `${binPath}${path.delimiter}${process.env.PATH}`;
    exec('aios --version');
    log('\n✅ Test successful!', 'green');
  } catch (error) {
    log('\n⚠️  Test failed - you may need to restart your terminal', 'yellow');
  }

  log('\n════════════════════════════════════════════════════════════\n', 'cyan');
}

// Run installer
main().catch(error => {
  console.error('\n❌ Installation failed:', error.message);
  process.exit(1);
});