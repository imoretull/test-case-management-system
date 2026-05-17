// Framework-local ambient types for Vite's import.meta.env.
// The framework intentionally does NOT depend on Vite — apps that consume
// this package may use Vite, Webpack, esbuild, etc. We only declare the
// shape we read so TS is happy here.

interface ImportMetaEnv {
  readonly VITE_JIRA_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
