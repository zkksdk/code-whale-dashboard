const fs = require('fs');
const path = require('path');
const os = require('os');
const TOML = require('@iarna/toml');
const chokidar = require('chokidar');

const CONFIG_PATH = path.join(os.homedir(), '.deepseek', 'config.toml');

const DEFAULT_CONFIG = {
  deepseek: {
    api_key: '',
    base_url: 'https://api.deepseek.com',
    provider: 'deepseek',
    model: 'deepseek-chat',
    max_tokens: 4096,
    temperature: 0.7,
    top_p: 1.0,
    frequency_penalty: 0,
    presence_penalty: 0
  },
  nvidia_nim: {
    api_key: '',
    base_url: 'https://integrate.api.nvidia.com/v1',
    model: 'deepseek-ai/deepseek-r1',
    max_tokens: 4096,
    temperature: 0.7
  },
  ui: {
    theme: 'dark',
    language: 'en',
    show_cost: true,
    auto_scroll: true
  }
};

function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return { ...DEFAULT_CONFIG, _status: 'not_found' };
    }
    const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = TOML.parse(content);
    return { ...parsed, _status: 'loaded', _path: CONFIG_PATH };
  } catch (err) {
    console.error('Failed to load config:', err.message);
    return { ...DEFAULT_CONFIG, _status: 'error', _error: err.message };
  }
}

function saveConfig(newConfig) {
  try {
    const configDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const cleanConfig = { ...newConfig };
    delete cleanConfig._status;
    delete cleanConfig._path;
    delete cleanConfig._error;

    // Backup existing config
    if (fs.existsSync(CONFIG_PATH)) {
      const backupPath = CONFIG_PATH + '.backup';
      fs.copyFileSync(CONFIG_PATH, backupPath);
    }

    const tomlContent = TOML.stringify(cleanConfig);
    fs.writeFileSync(CONFIG_PATH, tomlContent, 'utf-8');
    return { success: true, path: CONFIG_PATH };
  } catch (err) {
    console.error('Failed to save config:', err.message);
    return { success: false, error: err.message };
  }
}

function isConfigValid() {
  const config = loadConfig();
  if (config._status === 'not_found' || config._status === 'error') {
    return { valid: false, reason: config._status };
  }

  const provider = config.deepseek?.provider || 'deepseek';
  const apiKey = provider === 'nvidia_nim'
    ? config.nvidia_nim?.api_key
    : config.deepseek?.api_key;

  if (!apiKey || apiKey.trim() === '') {
    return { valid: false, reason: 'Missing API key' };
  }

  return { valid: true, provider };
}

function watchConfig(callback) {
  const configDir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(configDir)) {
    return () => {};
  }

  const watcher = chokidar.watch(CONFIG_PATH, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300 }
  });

  watcher.on('change', () => {
    const config = loadConfig();
    callback(config);
  });

  return () => watcher.close();
}

module.exports = { loadConfig, saveConfig, isConfigValid, watchConfig, CONFIG_PATH };