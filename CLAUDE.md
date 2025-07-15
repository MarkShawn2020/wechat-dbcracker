# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a WeChat database decryption tool (wechat-dbcracker) that extracts chat history from WeChat databases on macOS. The project uses DTrace to hook into WeChat's SQLCipher database operations and extract encryption keys.

## Architecture

The project follows a monorepo structure with multiple packages:

- **core/**: Contains the main DTrace script (`dbcracker.d`) for key extraction
- **packages/scripts/**: TypeScript utilities for processing extracted keys
- **packages/wechater/**: Electron application for database viewing
- **packages/wechat-db-manager/**: Tauri application for database management

## Development Commands

### Testing
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### Package-specific Commands

#### Scripts Package
```bash
cd packages/scripts
pnpm convert  # Convert .keys file to TOML format
```

#### Wechater (Electron App)
```bash
cd packages/wechater
pnpm dev              # Development mode
pnpm build            # Build for production
pnpm lint             # Run linting
pnpm typecheck        # Run type checking
pnpm rebuild          # Rebuild native dependencies (better-sqlite3)
pnpm build:mac        # Build for macOS
pnpm build:win        # Build for Windows
pnpm build:linux      # Build for Linux
```

## Key Components

### DTrace Script (core/dbcracker.d)
- Hooks into WeChat's SQLCipher operations
- Extracts database paths and encryption keys
- Outputs in a format compatible with the scripts package

### Key Processing (packages/scripts/keys2toml.ts)
- Parses DTrace output from `.keys` file
- Extracts database paths, keys, and types
- Converts to structured TOML format

### Database Libraries
- **better-sqlite3**: Primary SQLite interface
- **better-sqlite3-multiple-ciphers**: For SQLCipher database support
- **toml**: For configuration file parsing

## Security Notes

This tool is designed for legitimate security research and database recovery purposes. The project:
- Requires WeChat version 3.6 or below
- Needs SIP (System Integrity Protection) disabled
- Uses DTrace for process monitoring
- Extracts encryption keys from memory during login

## Platform Requirements

- macOS only (due to DTrace dependency)
- WeChat client version 3.6 or below
- SQLCipher development environment
- Disabled SIP for DTrace functionality

## Testing Framework

Uses Jest with ts-jest for TypeScript support. Configuration includes:
- TypeScript compilation via ts-jest
- Node.js test environment
- Root-level test discovery

## Build System

- **Package Manager**: pnpm with workspace support
- **TypeScript**: ES2020 target with CommonJS modules
- **Electron**: For cross-platform desktop application
- **Tauri**: Alternative framework for native applications