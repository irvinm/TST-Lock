module.exports = {
  ignoreFiles: [
    'AMO.md',
    'TODO.md',
    'README.md',
    'GEMINI.md',
    'LICENSE',
    'package.json',
    'package-lock.json',
    'web-ext-config.cjs',
    'screenshots',
    'screenshots/**',
    'tests',
    'tests/**',
    'web-ext-artifacts/**',
    '.*'
  ],
  build: {
    overwriteDest: true,
    filename: 'TST-Lock.xpi'
  }
};
