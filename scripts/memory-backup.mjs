import { open, lstat, mkdir, readFile, rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { StringDecoder } from 'node:string_decoder'
import { createWindowsCredentialVault } from '../bridge/windows-credential-vault.mjs'
import { getMemoryEncryptionKey } from '../bridge/memory-key-provider.mjs'
import {
  createEncryptedMemoryBackup,
  restoreEncryptedMemoryBackup,
} from '../bridge/memory-backup.mjs'

const MEMORY_DIRECTORY = join(homedir(), '.jarvis', 'memory')
const MEMORY_FILE = join(MEMORY_DIRECTORY, 'memory.enc')
const AUDIT_FILE = join(MEMORY_DIRECTORY, 'audit.jsonl')
const MAX_BACKUP_BYTES = 96 * 1024 * 1024

function promptSecret(label) {
  const input = process.stdin
  const output = process.stdout
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    return Promise.reject(new Error('Run this command in an interactive Windows Terminal or PowerShell window'))
  }

  return new Promise((resolvePrompt, rejectPrompt) => {
    let value = ''
    let settled = false
    const decoder = new StringDecoder('utf8')

    const cleanup = () => {
      input.removeListener('data', onData)
      input.removeListener('error', onError)
      if (input.isTTY) {
        try { input.setRawMode(false) } catch {}
      }
      input.pause()
      output.write('\n')
    }

    const finish = (error) => {
      if (settled) return
      settled = true
      cleanup()
      if (error) {
        value = ''
        rejectPrompt(error)
      } else {
        resolvePrompt(value)
      }
    }

    const onError = (error) => finish(error)
    const onData = (chunk) => {
      for (const character of decoder.write(chunk)) {
        if (character === '\u0003') return finish(new Error('Cancelled'))
        if (character === '\r' || character === '\n') {
          value += decoder.end()
          return finish(null)
        }
        if (character === '\u007f' || character === '\b') {
          value = Array.from(value).slice(0, -1).join('')
          continue
        }
        if (character >= ' ' && character !== '\u007f') value += character
      }
    }

    try {
      output.write(label)
      input.setRawMode(true)
      input.resume()
      input.on('data', onData)
      input.once('error', onError)
    } catch (error) {
      finish(error)
    }
  })
}

async function writeBackupFile(outputPath, backup) {
  const destination = resolve(outputPath)
  await mkdir(dirname(destination), { recursive: true, mode: 0o700 })
  const handle = await open(destination, 'wx', 0o600)
  let failure
  try {
    await handle.writeFile(backup)
    await handle.sync()
  } catch (error) {
    failure = error
  } finally {
    await handle.close()
  }
  if (failure) {
    await rm(destination, { force: true }).catch(() => {})
    throw failure
  }
  return destination
}

async function requireRegularFile(path, label, maxBytes) {
  const info = await lstat(path)
  if (!info.isFile()) throw new Error(label + ' must be a regular file, not a symlink or directory')
  if (info.size < 1 || info.size > maxBytes) throw new Error(label + ' is empty or exceeds the supported size limit')
}

async function backup(outputArgument) {
  const vault = await createWindowsCredentialVault()
  await requireRegularFile(MEMORY_FILE, 'Encrypted memory store', 64 * 1024 * 1024)
  let key
  let passphrase = ''
  let confirmation = ''
  let encryptedBackup
  try {
    passphrase = await promptSecret('Backup passphrase (16+ characters; use a password manager): ')
    confirmation = await promptSecret('Confirm backup passphrase: ')
    if (passphrase !== confirmation) throw new Error('Passphrases do not match')
    key = await getMemoryEncryptionKey({ vault, encryptedStoreExists: true })
    const createdAt = new Date().toISOString()
    encryptedBackup = await createEncryptedMemoryBackup({
      filePath: MEMORY_FILE,
      auditPath: AUDIT_FILE,
      key,
      passphrase,
      createdAt,
    })
    const defaultName = 'jarvis-memory-' + createdAt.replace(/[:.]/g, '-') + '.jmbak'
    const outputPath = await writeBackupFile(
      outputArgument ? resolve(outputArgument) : join(MEMORY_DIRECTORY, 'backups', defaultName),
      encryptedBackup,
    )
    console.log('[jarvis] encrypted memory backup created')
    console.log('[jarvis] backup file: ' + outputPath)
    console.log('[jarvis] keep the passphrase separately in a password manager; it cannot be recovered')
    console.log('[jarvis] the bridge must be stopped while the snapshot is taken')
  } finally {
    key?.fill(0)
    encryptedBackup?.fill(0)
    passphrase = ''
    confirmation = ''
  }
}

async function restore(backupArgument) {
  if (!backupArgument) throw new Error('Provide the path to a .jmbak file')
  const backupPath = resolve(backupArgument)
  await requireRegularFile(backupPath, 'Memory backup', MAX_BACKUP_BYTES)
  const backupBytes = await readFile(backupPath)
  let passphrase = ''
  try {
    passphrase = await promptSecret('Backup passphrase: ')
    const vault = await createWindowsCredentialVault()
    const result = await restoreEncryptedMemoryBackup({
      backup: backupBytes,
      filePath: MEMORY_FILE,
      auditPath: AUDIT_FILE,
      vault,
      passphrase,
    })
    console.log('[jarvis] encrypted memory restored')
    console.log('[jarvis] restored records: ' + result.recordCount)
    console.log('[jarvis] restored audit bytes: ' + result.auditBytes)
    console.log('[jarvis] start Jarvis only after confirming the restore target and backup file')
  } finally {
    backupBytes.fill(0)
    passphrase = ''
  }
}

async function main() {
  if (process.platform !== 'win32') {
    throw new Error('Encrypted memory backup and restore currently require Windows Credential Manager')
  }
  const [command, argument] = process.argv.slice(2)
  if (command === 'backup') return backup(argument)
  if (command === 'restore') return restore(argument)
  throw new Error('Usage: npm run memory:backup [output-file] | npm run memory:restore -- <backup-file>')
}

main().catch((error) => {
  console.error('[jarvis] memory backup operation failed:', error?.message ?? error)
  process.exitCode = 1
})
