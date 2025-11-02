#!/usr/bin/env node

/**
 * Helper script to add Firebase Service Account JSON to .env file
 * 
 * Usage:
 * 1. Download your Firebase service account JSON from:
 *    Firebase Console > Project Settings > Service Accounts > Generate new private key
 * 
 * 2. Run this script:
 *    node setup-firebase-credentials.js path/to/service-account-key.json
 * 
 * Or manually:
 * 1. Open the downloaded JSON file
 * 2. Copy the entire JSON content
 * 3. Minify it (remove all newlines and spaces) or use an online JSON minifier
 * 4. Add to .env file:
 *    FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
 */

const fs = require('fs');
const path = require('path');

const jsonFilePath = process.argv[2];
const envFilePath = path.join(__dirname, '.env');

if (!jsonFilePath) {
  console.log('Usage: node setup-firebase-credentials.js <path-to-service-account-key.json>');
  console.log('\nExample:');
  console.log('  node setup-firebase-credentials.js ./firebase-service-account.json');
  process.exit(1);
}

try {
  // Read the JSON file
  const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
  const jsonData = JSON.parse(jsonContent);
  
  // Minify JSON (remove whitespace)
  const minifiedJson = JSON.stringify(jsonData);
  
  // Read existing .env file
  let envContent = fs.readFileSync(envFilePath, 'utf8');
  
  // Update or add FIREBASE_SERVICE_ACCOUNT_JSON
  if (envContent.includes('FIREBASE_SERVICE_ACCOUNT_JSON=')) {
    // Replace existing value
    envContent = envContent.replace(
      /FIREBASE_SERVICE_ACCOUNT_JSON=.*/,
      `FIREBASE_SERVICE_ACCOUNT_JSON='${minifiedJson.replace(/'/g, "\\'")}'`
    );
  } else {
    // Add new line
    envContent += `\nFIREBASE_SERVICE_ACCOUNT_JSON='${minifiedJson.replace(/'/g, "\\'")}'`;
  }
  
  // Write back to .env
  fs.writeFileSync(envFilePath, envContent);
  
  console.log('✅ Firebase Service Account JSON added to .env file successfully!');
  console.log('🔄 Please restart your server for changes to take effect.');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

