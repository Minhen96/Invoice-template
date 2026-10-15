// @ts-check
import { readdirSync } from 'node:fs'

import js from '@eslint/js'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import importX from 'eslint-plugin-import-x'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Architecture: one-way imports, features isolated from each other.
const features = readdirSync('./src/features', { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

const SHARED = ['./src/components', './src/hooks', './src/lib']

const boundaryZones = [
  // Shared code never depends on features, routes or the app shell.
  ...SHARED.map((target) => ({
    target,
    from: ['./src/features', './src/routes', './src/app'],
    message: 'Shared code must not import features, routes or app.',
  })),
  // Features never depend on routes or the app shell.
  {
    target: './src/features',
    from: ['./src/routes', './src/app'],
    message: 'Features must not import routes or app.',
  },
  // Features never import each other (move shared pieces to components/ or lib/).
  ...features.map((name) => ({
    target: `./src/features/${name}`,
    from: './src/features',
    except: [`./${name}`],
    message: 'Features must not import other features.',
  })),
  // The backend never imports the web app (it is bundled separately by Convex).
  {
    target: './convex',
    from: './src',
    message: 'Convex functions must not import from src/. Put shared pure logic in convex/lib.',
  },
]

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      'src/routeTree.gen.ts',
      'convex/_generated',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      jsxA11y.flatConfigs.strict,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'import-x': importX,
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver()],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'import-x/no-restricted-paths': ['error', { zones: boundaryZones }],
      'import-x/no-cycle': 'error',
      'import-x/no-duplicates': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // `onClick={() => setOpen(true)}` is idiomatic React.
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      // `const { _id, ...rest } = doc` is how we drop fields.
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      // TanStack Router control flow: `throw redirect(...)` / `throw notFound()`.
      '@typescript-eslint/only-throw-error': [
        'error',
        {
          allow: [
            { from: 'package', package: '@tanstack/router-core', name: 'Redirect' },
            { from: 'package', package: '@tanstack/router-core', name: 'NotFoundError' },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
          message: 'Use design tokens (CSS variables), not raw hex colours.',
        },
      ],
    },
  },
  {
    // Outside a feature, import it only through its public index.
    files: ['src/routes/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/*'],
              message: "Import from the feature's index (e.g. '@/features/auth').",
            },
          ],
        },
      ],
    },
  },
  {
    // TanStack Router route files export `Route` objects, not only components.
    files: ['src/routes/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // Invoice templates are printed documents: their palettes are part of the design, and the
    // accent swatches are data the user picks from.
    files: ['src/components/document/**', 'convex/lib/defaults.ts', 'convex/lib/email.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/testing/**', 'e2e/**'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      'no-restricted-syntax': 'off',
    },
  },
  {
    // jsdom polyfills: they test for browser APIs the DOM types claim always exist.
    files: ['src/testing/setup.ts'],
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
  {
    files: ['*.config.{js,ts}', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
)
