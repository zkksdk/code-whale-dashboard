const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up CodeWhale Dashboard...\n');

const rootDir = __dirname;
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

// Check Node.js version
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
  console.log(`✅ Node.js ${nodeVersion}`);
} catch (e) {
  console.error('❌ Node.js not found. Please install Node.js 18+');
  process.exit(1);
}

// Check npm
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
  console.log(`✅ npm ${npmVersion}`);
} catch (e) {
  console.error('❌ npm not found');
  process.exit(1);
}

// Check CodeWhale
try {
  execSync('codewhale --version', { stdio: 'pipe' });
  console.log('✅ CodeWhale detected');
} catch (e) {
  console.warn('⚠️  CodeWhale not found. Chat features will be limited.');
  console.log('   To install: npm install -g codewhale');
}

// Create data directory
const dataDir = path.join(require('os').homedir(), '.code-whale-dashboard');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`✅ Created data directory: ${dataDir}`);
}

// Install backend dependencies
console.log('\n📦 Installing backend dependencies...');
try {
  process.chdir(backendDir);
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Backend dependencies installed');
} catch (e) {
  console.error('❌ Failed to install backend dependencies');
  process.exit(1);
}

// Install frontend dependencies
console.log('\n📦 Installing frontend dependencies...');
try {
  process.chdir(frontendDir);
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Frontend dependencies installed');
} catch (e) {
  console.error('❌ Failed to install frontend dependencies');
  process.exit(1);
}

// Create .env file
const envPath = path.join(backendDir, '.env');
if (!fs.existsSync(envPath)) {
  const envContent = `PORT=4322
NODE_ENV=development
DATA_DIR=${dataDir}
`;
  fs.writeFileSync(envPath, envContent);
  console.log(`✅ Created .env file: ${envPath}`);
}

console.log('\n🎉 Setup complete!');
console.log('\nTo start the dashboard:');
console.log('1. Start backend: cd backend && npm run dev');
console.log('2. Start frontend: cd frontend && npm run dev');
console.log('3. Open http://localhost:4321 in your browser');
console.log('\nOr use the root package.json scripts:');
console.log('  npm run install:all  # Install all dependencies');
console.log('  npm run dev          # Start both servers');
console.log('  npm run build        # Build for production');
console.log('  npm start            # Start production server');