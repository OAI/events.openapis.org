// YAML files are bundled as raw strings via the Turbopack rule in
// next.config.ts (scripts/yaml-raw-loader.cjs).
declare module '*.yml' {
  const content: string;
  export default content;
}

declare module '*.yaml' {
  const content: string;
  export default content;
}
