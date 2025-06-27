const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for module resolution
config.resolver.alias = {
  '@': './src',
  '@components': './src/components',
  '@screens': './src/screens',
  '@services': './src/services',
  '@types': './src/types',
  '@utils': './src/utils',
  '@hooks': './src/hooks',
  '@constants': './src/constants',
};

// Configure file watcher to avoid EMFILE error
config.watchFolders = [__dirname];
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config; 