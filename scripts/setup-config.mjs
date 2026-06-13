#!/usr/bin/env node
/**
 * Setup script to ensure z-ai-web-dev-sdk config exists.
 * This runs before `next start` to make sure the SDK can find its configuration.
 *
 * The SDK looks for .z-ai-config in:
 *   1. process.cwd()/.z-ai-config
 *   2. os.homedir()/.z-ai-config
 *   3. /etc/.z-ai-config
 *
 * This script ensures at least one of these exists by:
 *   1. Checking if .z-ai-config already exists in the project root
 *   2. If not, trying to copy from /etc/.z-ai-config
 *   3. If that fails, creating one from environment variables
 */

import { writeFileSync, copyFileSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const PROJECT_ROOT = process.cwd()
const PROJECT_CONFIG = join(PROJECT_ROOT, '.z-ai-config')
const HOME_CONFIG = join(homedir(), '.z-ai-config')
const ETC_CONFIG = '/etc/.z-ai-config'

function isValidConfig(configStr) {
  try {
    const config = JSON.parse(configStr)
    return !!(config.baseUrl && config.apiKey)
  } catch {
    return false
  }
}

// Step 1: Check if config already exists in project root
if (existsSync(PROJECT_CONFIG)) {
  try {
    const content = readFileSync(PROJECT_CONFIG, 'utf-8')
    if (isValidConfig(content)) {
      console.log('[setup-config] .z-ai-config already exists in project root')
      process.exit(0)
    }
  } catch {
    // Continue to next step
  }
}

// Step 2: Try to copy from /etc/.z-ai-config
if (existsSync(ETC_CONFIG)) {
  try {
    const content = readFileSync(ETC_CONFIG, 'utf-8')
    if (isValidConfig(content)) {
      writeFileSync(PROJECT_CONFIG, content, 'utf-8')
      console.log('[setup-config] Copied .z-ai-config from /etc/ to project root')
      process.exit(0)
    }
  } catch (err) {
    console.warn('[setup-config] Failed to copy from /etc/:', err.message)
  }
}

// Step 3: Try to copy from home directory
if (existsSync(HOME_CONFIG)) {
  try {
    const content = readFileSync(HOME_CONFIG, 'utf-8')
    if (isValidConfig(content)) {
      writeFileSync(PROJECT_CONFIG, content, 'utf-8')
      console.log('[setup-config] Copied .z-ai-config from home directory to project root')
      process.exit(0)
    }
  } catch (err) {
    console.warn('[setup-config] Failed to copy from home directory:', err.message)
  }
}

// Step 4: Create from environment variables
const baseUrl = process.env.ZAI_BASE_URL || process.env.ZAI_API_BASE_URL || ''
const apiKey = process.env.ZAI_API_KEY || ''
const chatId = process.env.ZAI_CHAT_ID || ''
const userId = process.env.ZAI_USER_ID || ''
const token = process.env.ZAI_TOKEN || ''

if (baseUrl && apiKey) {
  const config = { baseUrl, apiKey }
  if (chatId) config.chatId = chatId
  if (userId) config.userId = userId
  if (token) config.token = token

  writeFileSync(PROJECT_CONFIG, JSON.stringify(config, null, 2), 'utf-8')
  console.log('[setup-config] Created .z-ai-config from environment variables')
  process.exit(0)
}

// Step 5: No config available - warn but don't fail
console.warn('[setup-config] WARNING: No .z-ai-config found and no environment variables set.')
console.warn('[setup-config] The app will start, but AI features (agent workflow) will not work.')
console.warn('[setup-config] To fix this, set environment variables: ZAI_BASE_URL, ZAI_API_KEY')
console.warn('[setup-config] Or place a .z-ai-config file in the project root.')

// Create a placeholder config that will cause a clear error message
// rather than a cryptic crash
writeFileSync(PROJECT_CONFIG, JSON.stringify({
  baseUrl: 'https://internal-api.z.ai/v1',
  apiKey: 'MISSING',
  note: 'Auto-generated placeholder. Set ZAI_BASE_URL and ZAI_API_KEY env vars to enable AI features.'
}, null, 2), 'utf-8')

console.log('[setup-config] Created placeholder .z-ai-config (AI features will be disabled)')
