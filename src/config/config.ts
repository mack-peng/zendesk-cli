import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { MinimistArgs } from '../cli/minimist';

export interface Config {
  subdomain: string;
  email: string;
  mode: 'api-token' | 'basic' | 'oauth';
  token?: string;
  password?: string;
  oauthToken?: string;
  output: 'text' | 'json';
  raw: boolean;
}

export function loadConfig(args: MinimistArgs): Config {
  const env = {
    subdomain: process.env.ZENDESK_SUBDOMAIN,
    email: process.env.ZENDESK_EMAIL,
    token: process.env.ZENDESK_TOKEN,
    password: process.env.ZENDESK_PASSWORD,
    oauthToken: process.env.ZENDESK_OAUTH_TOKEN,
  };

  const fileConfig = readRcFile();

  const subdomain = (args.s as string) || (args.subdomain as string) || env.subdomain || fileConfig.subdomain;
  const email = (args.e as string) || (args.email as string) || env.email || fileConfig.email;
  const token = (args.token as string) || env.token || fileConfig.token;
  const password = (args.password as string) || env.password || fileConfig.password;
  const oauthToken = (args['oauth-token'] as string) || env.oauthToken || fileConfig.oauthToken;

  const mode: 'api-token' | 'basic' | 'oauth' = oauthToken
    ? 'oauth'
    : token
      ? 'api-token'
      : password
        ? 'basic'
        : 'api-token';

  if (!subdomain || !email)
    throw new Error(
      'Missing required config. Set ZENDESK_SUBDOMAIN and ZENDESK_EMAIL env vars, ' +
      'or use --subdomain and --email flags, or run: zendesk-cli config-set <key> <value>'
    );

  return {
    subdomain,
    email,
    mode,
    token,
    password,
    oauthToken,
    output: args.json ? 'json' : 'text',
    raw: !!args.raw,
  };
}

export function maskConfig(config: Config): Record<string, string> {
  return {
    subdomain: config.subdomain,
    email: config.email,
    mode: config.mode,
    token: config.token ? config.token.slice(0, 4) + '***' + config.token.slice(-2) : '(not set)',
    password: config.password ? '****' : '(not set)',
    oauthToken: config.oauthToken ? config.oauthToken.slice(0, 6) + '...' : '(not set)',
    output: config.output,
  };
}

export const rcFilePath = path.join(os.homedir(), '.zendeskrc');

function readRcFile(): Record<string, string> {
  try {
    const content = fs.readFileSync(rcFilePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export function writeRcConfig(key: string, value: string): Record<string, string> {
  const config = readRcFile();
  config[key] = value;
  fs.writeFileSync(rcFilePath, JSON.stringify(config, null, 2) + '\n');
  return config;
}
