import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import unusedImports from 'eslint-plugin-unused-imports';
import reactHooks from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';
import requireSafeParse from './eslint-rules/require-safe-parse.mjs';

// Local plugin hosting custom rules that enforce Arceus-specific invariants
// (currently: the Windows-SIGSEGV-safe parser entrypoint).
const arcLocalPlugin = {
  rules: {
    'require-safe-parse': requireSafeParse,
  },
};

// Selectors that protect MCP-reachable code from corrupting the JSON-RPC
// stdio frame stream. The MCP-reachable block below uses these directly;
// the lbug-adapter file-specific block must spread them in too because
// ESLint flat config REPLACES (not merges) `no-restricted-syntax` when
// multiple matching configs target the same file. Extracting to a const
// makes the dependency mechanical instead of documentation-enforced.
const mcpStdoutWriteSelectors = [
  {
    selector:
      "MemberExpression[object.type='MemberExpression'][object.object.name='process'][object.property.name='stdout'][property.name='write']",
    message:
      'Direct process.stdout.write is forbidden in MCP-reachable code. Route diagnostics through console.error or process.stderr.write — the MCP stdio transport owns stdout for JSON-RPC frames.',
  },
  {
    selector:
      "CallExpression[callee.type='MemberExpression'][callee.object.type='MemberExpression'][callee.object.object.name='process'][callee.object.property.name='stdout'][callee.property.name='write']",
    message:
      'Direct process.stdout.write is forbidden in MCP-reachable code. Route diagnostics through console.error or process.stderr.write — the MCP stdio transport owns stdout for JSON-RPC frames.',
  },
  {
    // Catches the canonical destructuring shape:
    //   const { write } = process.stdout;
    // (and any other ObjectPattern destructure rooted at process.stdout)
    // which would otherwise capture a reference to the original write
    // and bypass the sentinel.
    selector:
      "VariableDeclarator[init.type='MemberExpression'][init.object.name='process'][init.property.name='stdout'] > ObjectPattern",
    message:
      'Destructuring process.stdout is forbidden in MCP-reachable code — bypasses the sentinel. Use process.stderr.write for diagnostics.',
  },
];

export default [
  // Global ignores
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      'arc/vendor/**',
      'arceus-web/src/vendor/**',
      'arc/test/fixtures/**',
      'arceus-web/test/fixtures/**',
      'arceus-web/playwright-report/**',
      'arceus-web/test-results/**',
      '**/*.d.ts',
      '.claude/**',
      '.history/**',
      '**/.venv/**',
      '**/venv/**',
    ],
  },

  // Base TypeScript config for all packages
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      // Unused imports — auto-fixable
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],

      // TypeScript quality
      '@typescript-eslint/no-unused-vars': 'off', // handled by unused-imports plugin
      'no-unused-vars': 'off', // handled by unused-imports plugin
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // General quality
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },

  // CLI packages — `console.log` is for stdout (CLI tool output), while
  // `console.error`/`console.warn` print standard diagnostics to stderr.
  {
    files: ['arc/src/cli/**/*.ts'],
    rules: {
      'no-console': ['error', { allow: ['log', 'warn', 'error'] }],
    },
  },

  // Server packages — banner output goes to `console.log`, but all other
  // diagnostic logging must go through pino.
  {
    files: ['arc/src/server/**/*.ts'],
    rules: {
      'no-console': ['error', { allow: ['log'] }],
    },
  },

  // Forcing function for the pino migration. Severity is `error` — the
  // codebase-wide migration is complete; new `console.*` in core source
  // must fail lint. CLI/server are exempt above (legitimate stdout output).
  // Tests, bin scripts, and the logger module itself remain exempt.
  {
    files: ['arc/src/**/*.ts'],
    ignores: ['arc/src/cli/**', 'arc/src/server/**', 'arc/src/core/logger.ts'],
    rules: {
      'no-console': 'error',
    },
  },

  // MCP-reachable code: forbid stdout-corrupting writes. The MCP stdio
  // transport writes JSON-RPC frames to stdout; per the spec, the server
  // MUST NOT write anything to stdout that is not a valid MCP message.
  // Diagnostics must go to stderr (console.error). Direct process.stdout.write
  // bypasses the gate and is also forbidden in these dirs.
  // cli/mcp.ts is included here even though it lives under cli/ — it is the
  // MCP entrypoint and inherits stricter discipline than the rest of cli/.
  {
    files: [
      'arc/src/mcp/**/*.ts',
      'arc/src/core/lbug/**/*.ts',
      'arc/src/core/embeddings/**/*.ts',
      'arc/src/core/tree-sitter/**/*.ts',
      'arc/src/cli/mcp.ts',
    ],
    rules: {
      'no-console': ['error', { allow: ['error'] }],
      'no-restricted-syntax': ['error', ...mcpStdoutWriteSelectors],
    },
  },

  // Windows SIGSEGV protection: every tree-sitter parse in `core/` must route
  // through parseSourceSafe. Direct `<parser>.parse(content, ...)` crashes on
  // Windows for inputs > 32 767 chars (V8 string-conversion bug, uncatchable
  // from JS). The rule auto-fixes the call site; the developer adds the
  // missing import after the fix runs. Out of scope: tests (skipped by the
  // rule), the helper itself (`safe-parse.ts`), and the `grpc-patterns/proto.ts`
  // grammar-load smoke test (filtered by string-literal-arg skip in the rule).
  {
    files: ['arc/src/core/**/*.ts'],
    plugins: {
      arc: arcLocalPlugin,
    },
    rules: {
      'arc/require-safe-parse': 'error',
    },
  },

  // React-specific rules for arceus-web
  {
    files: ['arceus-web/src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Prevent direct conn.close() / db.close() in the LadybugDB adapter (#1376).
  // All close operations must go through safeClose() so the WAL is always
  // flushed before the connection is released. The sole authorised call site
  // inside safeClose itself uses an eslint-disable-next-line override.
  //
  // ESLint flat config REPLACES (not merges) `no-restricted-syntax` when
  // multiple matching configs target the same file. lbug-adapter.ts is also
  // covered by the MCP-reachable block above, so we spread the shared
  // mcpStdoutWriteSelectors here alongside the safeClose selectors. Without
  // this, lbug-adapter would silently lose its MCP stdout-write protection.
  {
    files: ['arc/src/core/lbug/lbug-adapter.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...mcpStdoutWriteSelectors,
        {
          selector: "CallExpression[callee.object.name='conn'][callee.property.name='close']",
          message: 'Use safeClose() instead of calling conn.close() directly (#1376).',
        },
        {
          selector: "CallExpression[callee.object.name='db'][callee.property.name='close']",
          message: 'Use safeClose() instead of calling db.close() directly (#1376).',
        },
      ],
    },
  },

  // Disable formatting rules (prettier handles those)
  prettierConfig,
];
