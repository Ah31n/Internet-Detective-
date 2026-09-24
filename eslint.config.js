const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['.expo/**', 'node_modules/**'],
  },
  {
    // Reanimated SharedValues are intentionally mutable UI-thread handles.
    // React's general immutability rule cannot distinguish those mutations.
    files: [
      'src/design-system/components/TactilePressable.tsx',
      'src/features/shell/screens/AppLaunchScreen.tsx',
    ],
    rules: {
      'react-hooks/immutability': 'off',
    },
  },
]);
