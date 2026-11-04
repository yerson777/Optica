interface OpticaRuntimeConfig {
  apiUrl?: string;
}

const runtimeConfig = (
  globalThis as unknown as { __OPTICA_CONFIG__?: OpticaRuntimeConfig }
).__OPTICA_CONFIG__;

const runtimeApiUrl = runtimeConfig?.apiUrl?.trim();

export const environment = {
  production: true,
  apiUrl: runtimeApiUrl || '/api',
};
