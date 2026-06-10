#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OFFICIAL_DATABASE_NAME = 'geo_workstation_official';
const SMOKE_DATABASE_NAME = 'geo_workstation_aqa_chat_local_smoke';
const BACKUP_DIR_NAME = 'backups/database';
const SUPPORTED_PROTOCOLS = new Set(['postgres:', 'postgresql:']);

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');

function parseArgs(argv) {
  const options = {
    dryRun: true,
    allowSmokeBackup: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--allow-smoke-backup') {
      options.dryRun = false;
      options.allowSmokeBackup = true;
      continue;
    }

    throw new Error(`未知参数：${arg}。允许参数：--dry-run、--allow-smoke-backup`);
  }

  return options;
}

function readEnvFile() {
  const envPath = resolve(projectRoot, '.env');

  if (!existsSync(envPath)) {
    throw new Error(`未找到 .env 文件：${envPath}`);
  }

  return readFileSync(envPath, 'utf8');
}

function parseEnvValue(rawValue) {
  const trimmedValue = rawValue.trim();

  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    return trimmedValue.slice(1, -1);
  }

  return trimmedValue;
}

function parseEnv(content) {
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1);
    env[key] = parseEnvValue(value);
  }

  return env;
}

function parseDatabaseUrl(databaseUrl) {
  if (!databaseUrl) {
    throw new Error('.env 中缺少 DATABASE_URL，无法判断当前数据库。');
  }

  const url = new URL(databaseUrl);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));

  if (!databaseName) {
    throw new Error('DATABASE_URL 未包含数据库名，已停止。');
  }

  return {
    protocol: url.protocol,
    databaseName,
    host: url.hostname,
    port: url.port || '5432',
    username: url.username ? decodeURIComponent(url.username) : '',
    password: url.password ? decodeURIComponent(url.password) : '',
    sslMode: url.searchParams.get('sslmode') || '',
  };
}

function formatTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '_',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

function buildBackupTarget(databaseName) {
  const outputDir = resolve(projectRoot, BACKUP_DIR_NAME);
  const outputFileName = `${databaseName}_${formatTimestamp()}.dump`;

  return {
    outputDir,
    outputFileName,
    outputPath: resolve(outputDir, outputFileName),
  };
}

function printSummary({ databaseInfo, backupTarget, options, officialBlocked, status }) {
  console.log('OFFICIAL-DB-BACKUP-PREP-1 数据库备份安全检查');
  console.log(`- 当前数据库名：${databaseInfo.databaseName}`);
  console.log(`- 数据库类型：${databaseInfo.protocol.replace(':', '')}`);
  console.log(`- dry-run：${options.dryRun ? '是' : '否'}`);
  console.log(`- 允许 smoke backup：${options.allowSmokeBackup ? '是' : '否'}`);
  console.log(`- 输出目录：${backupTarget.outputDir}`);
  console.log(`- 输出文件名：${backupTarget.outputFileName}`);
  console.log(`- 是否已阻止 official 操作：${officialBlocked ? '是' : '否'}`);
  console.log(`- 当前状态：${status}`);
}

function ensureSupportedDatabase(databaseInfo) {
  if (!SUPPORTED_PROTOCOLS.has(databaseInfo.protocol)) {
    throw new Error(
      `当前 DATABASE_URL scheme 为 ${databaseInfo.protocol}，本工具暂只支持 PostgreSQL。`,
    );
  }
}

function ensureSafeDatabaseScope(databaseInfo, options) {
  // official 正式库必须默认阻断，避免误把准备工具变成真实正式库操作。
  if (databaseInfo.databaseName === OFFICIAL_DATABASE_NAME) {
    throw new Error(
      `检测到 official 数据库 ${OFFICIAL_DATABASE_NAME}，本阶段禁止导出、连接或修改 official。`,
    );
  }

  // smoke 备份只允许当前明确指向 smoke，防止把其他库误当测试库导出。
  if (options.allowSmokeBackup && databaseInfo.databaseName !== SMOKE_DATABASE_NAME) {
    throw new Error(
      `--allow-smoke-backup 只允许用于 ${SMOKE_DATABASE_NAME}，当前为 ${databaseInfo.databaseName}。`,
    );
  }
}

async function commandExists(command) {
  return new Promise((resolveCommand) => {
    const child = spawn(command, ['--version'], { stdio: 'ignore' });

    child.on('error', () => resolveCommand(false));
    child.on('exit', (code) => resolveCommand(code === 0));
  });
}

function buildPgDumpEnv(databaseInfo) {
  const pgEnv = {
    ...process.env,
    PGHOST: databaseInfo.host,
    PGPORT: databaseInfo.port,
    PGDATABASE: databaseInfo.databaseName,
  };

  if (databaseInfo.username) {
    pgEnv.PGUSER = databaseInfo.username;
  }

  if (databaseInfo.password) {
    pgEnv.PGPASSWORD = databaseInfo.password;
  }

  if (databaseInfo.sslMode) {
    pgEnv.PGSSLMODE = databaseInfo.sslMode;
  }

  return pgEnv;
}

async function runPgDump(databaseInfo, backupTarget) {
  mkdirSync(backupTarget.outputDir, { recursive: true });

  const pgDumpCommand = process.env.PG_DUMP_BIN || 'pg_dump';
  const hasPgDump = await commandExists(pgDumpCommand);

  if (!hasPgDump) {
    return {
      skipped: true,
      message:
        '未找到 pg_dump，已安全跳过 smoke 备份；安装 PostgreSQL client tools 后可重新执行。',
    };
  }

  // 使用 PG* 环境变量传递连接信息，避免把完整连接串打印到命令行。
  const pgDumpArgs = [
    '--format=custom',
    '--no-owner',
    '--no-privileges',
    '--file',
    backupTarget.outputPath,
  ];

  await new Promise((resolveDump, rejectDump) => {
    const child = spawn(pgDumpCommand, pgDumpArgs, {
      env: buildPgDumpEnv(databaseInfo),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      rejectDump(new Error(`pg_dump 启动失败：${error.message}`));
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolveDump();
        return;
      }

      rejectDump(new Error(`pg_dump 执行失败，退出码 ${code}：${stderr.trim()}`));
    });
  });

  const fileStat = statSync(backupTarget.outputPath);

  if (fileStat.size <= 0) {
    throw new Error(`备份文件大小为 0，已停止：${backupTarget.outputPath}`);
  }

  return {
    skipped: false,
    message: `smoke 备份已生成，文件大小 ${fileStat.size} bytes。`,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const env = parseEnv(readEnvFile());
  const databaseInfo = parseDatabaseUrl(env.DATABASE_URL);
  const backupTarget = buildBackupTarget(databaseInfo.databaseName);

  ensureSupportedDatabase(databaseInfo);

  try {
    ensureSafeDatabaseScope(databaseInfo, options);
  } catch (error) {
    printSummary({
      databaseInfo,
      backupTarget,
      options,
      officialBlocked: databaseInfo.databaseName === OFFICIAL_DATABASE_NAME,
      status: '已阻断',
    });
    throw error;
  }

  if (options.dryRun) {
    printSummary({
      databaseInfo,
      backupTarget,
      options,
      officialBlocked: false,
      status: 'dry-run，仅检查，不生成备份文件',
    });
    return;
  }

  const dumpResult = await runPgDump(databaseInfo, backupTarget);
  printSummary({
    databaseInfo,
    backupTarget,
    options,
    officialBlocked: false,
    status: dumpResult.message,
  });
}

main().catch((error) => {
  console.error(`数据库备份准备失败：${error.message}`);
  process.exitCode = 1;
});
