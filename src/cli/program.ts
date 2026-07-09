import fs from 'fs';
import path from 'path';
import { minimist } from './minimist';
import { parseCommand } from './command';
import { commands } from './commands';
import { TextOutput, JsonOutput } from './output';
import { loadConfig, maskConfig, writeRcConfig, rcFilePath } from '../config/config';
import { createAuthProvider } from '../api/auth';
import { ZendeskClient } from '../api/client';
import type { Output } from './output';
import type { MinimistArgs } from './minimist';
import type { AnyCommandSchema } from './command';

const globalOptions = ['json', 'raw', 'help', 'h', 'version', 'v', 's', 'subdomain', 'e', 'email', 'token', 'password', 'oauth-token'];
const booleanGlobalOptions = ['help', 'json', 'raw', 'version', 'v', 'h'];

export async function program() {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf-8'));
  const help = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'help.json'), 'utf-8'));

  const argv = process.argv.slice(2);
  const args: MinimistArgs = minimist(argv, {
    boolean: [...help.booleanOptions, ...booleanGlobalOptions],
    string: ['_'],
  });

  if (args.s) { args.subdomain = args.s; delete args.s; }
  if (args.e) { args.email = args.e; delete args.e; }

  const output: Output = args.json ? new JsonOutput() : new TextOutput();
  const commandName = args._[0];

  if (args.version || args.v) {
    output.version(pkg.version);
    process.exit(0);
  }

  const cmdEntry = commandName && help.commands[commandName];
  const command: AnyCommandSchema | undefined = commands[commandName];

  if (args.help || args.h || !commandName) {
    if (cmdEntry) {
      output.help(cmdEntry.help);
    } else {
      output.help(help.global);
    }
    process.exit(0);
  }

  if (!cmdEntry || !command)
    output.error(`Unknown command: ${commandName}`);

  validateFlags(args, cmdEntry);
  validateArgs(args, cmdEntry);

  // ── Local config commands ──

  if (commandName === 'config-show') {
    const config = loadConfig(args);
    output.format(maskConfig(config));
    return;
  }

  if (commandName === 'config-set') {
    const key = args._[1];
    const value = args._[2];
    if (!key || !value)
      output.error('Usage: zendesk-cli config-set <key> <value>');
    writeRcConfig(key, value);
    output.format({ [key]: key === 'token' || key === 'password' ? '****' : value });
    return;
  }

  if (commandName === 'config-path') {
    output.format(rcFilePath);
    return;
  }

  // ── API commands ──

  try {
    const config = loadConfig(args);
    const parsed = parseCommand(command, args as Record<string, string> & { _: string[] });
    const auth = createAuthProvider({
      mode: config.mode,
      email: config.email,
      token: config.token,
      password: config.password,
      oauthToken: config.oauthToken,
    });

    const pathStr = typeof command.api.path === 'function'
      ? (command.api.path as (args: any) => string)(parsed)
      : command.api.path;

    const client = new ZendeskClient(config.subdomain, auth);
    const rawQueryParams = extractQueryParams(args, cmdEntry);
    const transformed = command.transformRequest ? command.transformRequest(parsed) : parsed;

    let result: any;

    if (command.list) {
      const queryParams = { ...rawQueryParams, ...filterQueryParams(transformed) };
      result = await client.list(command.api.method, pathStr, queryParams);
    } else {
      const method = command.api.method;
      const isBodyMethod = method !== 'GET' && method !== 'DELETE';
      const queryParams = isBodyMethod
        ? rawQueryParams
        : { ...rawQueryParams, ...filterQueryParams(transformed) };
      const apiOptions: any = { queryParams };
      if (isBodyMethod)
        apiOptions.body = transformed;
      result = await client.request(method, pathStr, apiOptions);
    }

    const finalResult = command.transformResponse ? command.transformResponse(result) : result;
    console.log(output.format(finalResult));
  } catch (e: any) {
    output.error(e.message || String(e));
  }
}

function extractQueryParams(args: MinimistArgs, cmdEntry: any): Record<string, any> {
  const params: Record<string, any> = {};
  const cmdFlags = Object.keys(cmdEntry.flags || {});
  for (const key of Object.keys(args)) {
    if (key === '_' || globalOptions.includes(key)) continue;
    if (cmdFlags.includes(key))
      params[key] = args[key];
  }
  return params;
}

function filterQueryParams(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && typeof value !== 'object')
      result[key] = value;
  }
  return result;
}

function validateFlags(args: MinimistArgs, cmdEntry: { flags: Record<string, 'boolean' | 'string'> }) {
  const unknownFlags: string[] = [];
  for (const key of Object.keys(args)) {
    if (key === '_') continue;
    if (globalOptions.includes(key)) continue;
    if (!(key in cmdEntry.flags))
      unknownFlags.push(key);
  }
  if (unknownFlags.length)
    throw new Error(`Unknown option${unknownFlags.length > 1 ? 's' : ''}: ${unknownFlags.map(f => `--${f}`).join(', ')}`);
}

function validateArgs(args: MinimistArgs, cmdEntry: { args: string[] }) {
  const positional = args._.slice(1);
  if (positional.length > cmdEntry.args.length)
    throw new Error(`error: too many arguments: expected ${cmdEntry.args.length}, received ${positional.length}`);
}
