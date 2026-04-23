const { execSync } = require('child_process');
const { existsSync, statSync, readdirSync } = require('fs');
const { resolve, join } = require('path');

const engineRoot = resolve(__dirname, '../..');

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

function getDirectorySize(dir) {
  if (!existsSync(dir)) return 0;
  let totalSize = 0;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      totalSize += getDirectorySize(fullPath);
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.wasm')) {
      totalSize += statSync(fullPath).size;
    }
  }
  return totalSize;
}

function getFileCount(dir) {
  if (!existsSync(dir)) return 0;
  let count = 0;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      count += getFileCount(fullPath);
    } else if (entry.name.endsWith('.js')) {
      count++;
    }
  }
  return count;
}

function runCommand(command, label) {
  console.log(`\n运行: ${command}`);
  console.log('-'.repeat(50));
  
  const startTime = Date.now();
  try {
    execSync(command, {
      cwd: engineRoot,
      stdio: 'pipe',
      timeout: 300000,
    });
  } catch (error) {
    console.error(`错误: ${error.message}`);
  }
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`完成: ${label} - 耗时: ${formatTime(duration)}`);
  return duration;
}

function main() {
  console.log('========================================');
  console.log('构建性能对比测试');
  console.log('========================================');
  
  console.log('\n清理旧产物...');
  try {
    execSync('npm run vite:clean', { cwd: engineRoot, stdio: 'pipe' });
    execSync('rm -rf bin/dev/cc bin/dev/cc-min', { cwd: engineRoot, stdio: 'pipe' });
  } catch (e) {}
  
  console.log('\n========================================');
  console.log('1. 老构建测试');
  console.log('========================================');
  
  const oldBuildTime = runCommand('npm run build:dev', '老构建');
  
  const oldOutputDir = resolve(engineRoot, 'bin/dev/cc');
  const oldSize = getDirectorySize(oldOutputDir);
  const oldFileCount = getFileCount(oldOutputDir);
  
  console.log(`\n老构建产物统计:`);
  console.log(`  - 输出目录: bin/dev/cc/`);
  console.log(`  - 总大小: ${formatSize(oldSize)}`);
  console.log(`  - JS文件数: ${oldFileCount}`);
  
  console.log('\n========================================');
  console.log('2. 新构建测试');
  console.log('========================================');
  
  const newBuildTime = runCommand('npm run vite:build:web', '新构建');
  
  const newOutputDir = resolve(engineRoot, 'bin/vite/web/prod');
  const newSize = getDirectorySize(newOutputDir);
  const newFileCount = getFileCount(newOutputDir);
  
  console.log(`\n新构建产物统计:`);
  console.log(`  - 输出目录: bin/vite/web/prod/`);
  console.log(`  - 总大小: ${formatSize(newSize)}`);
  console.log(`  - JS文件数: ${newFileCount}`);
  
  console.log('\n========================================');
  console.log('对比结果');
  console.log('========================================');
  
  const timeDiff = oldBuildTime - newBuildTime;
  const timeRatio = (newBuildTime / oldBuildTime * 100).toFixed(1);
  const sizeDiff = oldSize - newSize;
  const sizeRatio = (newSize / oldSize * 100).toFixed(1);
  
  console.log('\n构建时间对比:');
  console.log(`  老构建: ${formatTime(oldBuildTime)}`);
  console.log(`  新构建: ${formatTime(newBuildTime)}`);
  console.log(`  差异: ${timeDiff > 0 ? '-' : '+'}${formatTime(Math.abs(timeDiff))} (${timeRatio}%)`);
  
  console.log('\n产物大小对比:');
  console.log(`  老构建: ${formatSize(oldSize)}`);
  console.log(`  新构建: ${formatSize(newSize)}`);
  console.log(`  差异: ${sizeDiff > 0 ? '-' : '+'}${formatSize(Math.abs(sizeDiff))} (${sizeRatio}%)`);
  
  console.log('\n文件数量对比:');
  console.log(`  老构建: ${oldFileCount} 个JS文件`);
  console.log(`  新构建: ${newFileCount} 个JS文件`);
  
  console.log('\n========================================');
  
  if (newBuildTime < oldBuildTime && newSize < oldSize) {
    console.log('✅ 新构建在时间和大小上都优于老构建');
  } else if (newBuildTime < oldBuildTime) {
    console.log('✅ 新构建速度更快');
  } else if (newSize < oldSize) {
    console.log('✅ 新构建产物更小');
  }
  
  console.log('========================================');
}

main();
