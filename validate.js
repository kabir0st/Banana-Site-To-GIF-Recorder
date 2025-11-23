#!/usr/bin/env node
/**
 * Static validation script for ScrollGif extension
 * Checks for common issues without requiring browser
 */

const fs = require('fs');
const path = require('path');

const errors = [];
const warnings = [];

// Check if files exist
const requiredFiles = [
  'manifest.json',
  'background.js',
  'popup/popup.html',
  'popup/popup.js',
  'popup/popup.css',
  'content/content.js',
  'lib/gif.js',
  'lib/gif.worker.js',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png'
];

console.log('🔍 Validating ScrollGif extension...\n');

// Check required files
console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    errors.push(`Missing required file: ${file}`);
  } else {
    console.log(`  ✅ ${file}`);
  }
});

// Validate manifest.json
console.log('\n📋 Validating manifest.json...');
try {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  
  if (manifest.manifest_version !== 3) {
    errors.push('Manifest version must be 3');
  }
  
  const requiredPermissions = ['activeTab', 'tabs', 'scripting', 'storage', 'downloads'];
  requiredPermissions.forEach(perm => {
    if (!manifest.permissions || !manifest.permissions.includes(perm)) {
      errors.push(`Missing required permission: ${perm}`);
    }
  });
  
  if (!manifest.host_permissions || !manifest.host_permissions.includes('<all_urls>')) {
    warnings.push('host_permissions might be needed for all URLs');
  }
  
  if (!manifest.background || !manifest.background.service_worker) {
    errors.push('Missing background service_worker');
  }
  
  if (!manifest.action || !manifest.action.default_popup) {
    errors.push('Missing action.default_popup');
  }
  
  console.log('  ✅ Manifest structure is valid');
} catch (e) {
  errors.push(`Invalid manifest.json: ${e.message}`);
}

// Check for common code issues
console.log('\n🔎 Checking code for common issues...');

// Check background.js
const backgroundCode = fs.readFileSync('background.js', 'utf8');
if (!backgroundCode.includes('chrome.runtime.onMessage.addListener')) {
  errors.push('background.js missing message listener');
}
if (!backgroundCode.includes('chrome.tabs.captureVisibleTab')) {
  errors.push('background.js missing captureVisibleTab API call');
}

// Check popup.js
const popupCode = fs.readFileSync('popup/popup.js', 'utf8');
if (!popupCode.includes('chrome.runtime.onMessage.addListener')) {
  errors.push('popup.js missing message listener');
}
if (!popupCode.includes('GIF')) {
  warnings.push('popup.js might not properly handle GIF.js loading');
}

// Check popup.html
const popupHtml = fs.readFileSync('popup/popup.html', 'utf8');
if (!popupHtml.includes('gif.js')) {
  warnings.push('popup.html might not load gif.js correctly');
}

// Check content.js
const contentCode = fs.readFileSync('content/content.js', 'utf8');
if (!contentCode.includes('chrome.runtime.onMessage.addListener')) {
  errors.push('content.js missing message listener');
}

// Check for potential issues
if (backgroundCode.includes('chrome.runtime.sendMessage') && 
    !backgroundCode.includes('try') && 
    !backgroundCode.includes('catch')) {
  warnings.push('background.js sends messages without error handling');
}

// Summary
console.log('\n📊 Validation Summary:');
if (errors.length === 0 && warnings.length === 0) {
  console.log('  ✅ No errors or warnings found!');
  console.log('\n✨ Extension structure looks good!');
  console.log('\n📝 Next steps:');
  console.log('  1. Load extension in Chrome (chrome://extensions/)');
  console.log('  2. Enable Developer mode');
  console.log('  3. Click "Load unpacked" and select this directory');
  console.log('  4. Test on a regular webpage');
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`);
    errors.forEach(err => console.log(`   - ${err}`));
  }
  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${warnings.length}):`);
    warnings.forEach(warn => console.log(`   - ${warn}`));
  }
  process.exit(errors.length > 0 ? 1 : 0);
}

