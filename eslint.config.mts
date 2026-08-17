import globals from 'globals'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  { ignores: ['lib/**', 'node_modules/**'] },
  tseslint.configs.recommended,
  stylistic.configs.customize({
    indent: 2,
    quotes: 'single',
    semi: false,
    jsx: false,
    braceStyle: 'stroustrup',
  }),
  {
    files: [
      '**/*.ts',
    ],
    plugins: {
      '@stylistic': stylistic,
    },
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/array-bracket-spacing': ['error', 'never'],
      '@stylistic/space-unary-ops': ['error', { words: true, nonwords: true }],
      '@stylistic/multiline-ternary': 'off',
      '@stylistic/operator-linebreak': 'off',

      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
])
