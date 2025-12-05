/**
 * Post-install script to fix react-native-reanimated compatibility with worklets 0.7.x
 * This allows react-native-worklets 0.7.x to work with react-native-reanimated 4.1.x
 */

const fs = require('fs');
const path = require('path');

const compatibilityJsonPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-reanimated',
  'compatibility.json'
);

try {
  if (fs.existsSync(compatibilityJsonPath)) {
    const compatibility = JSON.parse(fs.readFileSync(compatibilityJsonPath, 'utf8'));
    
    // Add 0.7.x support to 4.1.x if not already present
    if (compatibility['4.1.x'] && compatibility['4.1.x']['react-native-worklets']) {
      const workletsVersions = compatibility['4.1.x']['react-native-worklets'];
      if (!workletsVersions.includes('0.7.x')) {
        workletsVersions.push('0.7.x');
        fs.writeFileSync(
          compatibilityJsonPath,
          JSON.stringify(compatibility, null, 2),
          'utf8'
        );
        console.log('✅ Fixed react-native-reanimated compatibility for worklets 0.7.x');
      }
    }
  }
} catch (error) {
  console.warn('⚠️  Could not fix reanimated compatibility:', error.message);
}

