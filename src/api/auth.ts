export type AuthMode = 'api-token' | 'basic' | 'oauth';

export interface AuthConfig {
  mode: AuthMode;
  email?: string;
  token?: string;
  username?: string;
  password?: string;
  oauthToken?: string;
}

export interface AuthProvider {
  getHeaders(): Record<string, string>;
}

export function createAuthProvider(config: AuthConfig): AuthProvider {
  switch (config.mode) {
    case 'api-token':
      if (!config.email || !config.token)
        throw new Error('API token mode requires --email and --token');
      return {
        getHeaders: () => {
          const encoded = Buffer.from(`${config.email}/token:${config.token}`).toString('base64');
          return { Authorization: `Basic ${encoded}` };
        },
      };
    case 'basic':
      if (!config.email || !config.password)
        throw new Error('Basic auth requires --email and --password');
      return {
        getHeaders: () => {
          const encoded = Buffer.from(`${config.email}:${config.password}`).toString('base64');
          return { Authorization: `Basic ${encoded}` };
        },
      };
    case 'oauth':
      if (!config.oauthToken)
        throw new Error('OAuth requires --oauth-token');
      return {
        getHeaders: () => ({ Authorization: `Bearer ${config.oauthToken}` }),
      };
  }
}
