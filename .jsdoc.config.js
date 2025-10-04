module.exports = {
  source: {
    include: ['./shared/', './node-cli/src/', './scripts/'],
    includePattern: '\\.(js|ts|tsx)$',
    exclude: [
      'node_modules/',
      'dist/',
      'build/',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/__tests__/**',
    ],
  },
  opts: {
    destination: './docs/api/',
    recurse: true,
    readme: './README.md',
  },
  plugins: [
    'plugins/markdown',
    'plugins/typescript',
  ],
  templates: {
    cleverLinks: false,
    monospaceLinks: false,
    useLongnameInNav: true,
    showInheritedInNav: true,
  },
  markdown: {
    hardwrap: true,
    idInHeadings: true,
  },
  typescript: {
    moduleRoot: './',
  },
};