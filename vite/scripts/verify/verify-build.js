const { existsSync, readdirSync, statSync, readFileSync } = require('fs');
const { resolve, join } = require('path');

const engineRoot = resolve(__dirname, '../../..');

function verifyBuild(platform) {
  const outputDir = resolve(engineRoot, 'bin/vite', platform, 'prod');
  const checks = [];
  
  checks.push(checkOutputExists(outputDir, platform));
  checks.push(checkEntryFile(outputDir, platform));
  checks.push(checkModuleFormat(outputDir, platform));
  checks.push(checkFileSize(outputDir, platform));
  checks.push(checkSingleFile(outputDir, platform));
  
  if (platform === 'web') {
    checks.push(checkNoSystemJS(outputDir));
  }
  
  if (platform === 'wechat' || platform === 'native') {
    checks.push(checkCJSFormat(outputDir));
  }
  
  const passed = checks.every(c => c.passed);
  
  return {
    platform,
    passed,
    checks,
    summary: passed ? `✅ ${platform} 验证通过` : `❌ ${platform} 验证失败`,
  };
}

function checkOutputExists(outputDir, platform) {
  const exists = existsSync(outputDir);
  return {
    name: '输出目录存在',
    passed: exists,
    message: exists ? `输出目录: ${outputDir}` : `输出目录不存在: ${outputDir}`,
  };
}

function checkEntryFile(outputDir, platform) {
  const entryFile = join(outputDir, 'cc.js');
  const exists = existsSync(entryFile);
  return {
    name: '入口文件存在',
    passed: exists,
    message: exists ? `入口文件: ${entryFile}` : `入口文件不存在: ${entryFile}`,
  };
}

function checkModuleFormat(outputDir, platform) {
  const entryFile = join(outputDir, 'cc.js');
  if (!existsSync(entryFile)) {
    return { name: '模块格式检查', passed: false, message: '入口文件不存在' };
  }
  
  const content = readFileSync(entryFile, 'utf-8');
  
  if (platform === 'web') {
    const isESM = content.includes('import ') || content.includes('export ');
    return {
      name: '模块格式检查',
      passed: isESM,
      message: isESM ? 'ESM格式正确' : '未发现ESM格式',
    };
  } else {
    const isCJS = content.includes('require(') || content.includes('module.exports');
    return {
      name: '模块格式检查',
      passed: isCJS,
      message: isCJS ? 'CJS格式正确' : '未发现CJS格式',
    };
  }
}

function checkFileSize(outputDir, platform) {
  const entryFile = join(outputDir, 'cc.js');
  if (!existsSync(entryFile)) {
    return { name: '产物大小检查', passed: false, message: '入口文件不存在' };
  }
  
  const stat = statSync(entryFile);
  const sizeMB = (stat.size / 1024 / 1024).toFixed(2);
  
  return {
    name: '产物大小检查',
    passed: stat.size > 0,
    message: `cc.js大小: ${sizeMB}MB`,
  };
}

function checkSingleFile(outputDir, platform) {
  const files = readdirSync(outputDir).filter(f => f.endsWith('.js'));
  const hasSingleFile = files.length === 1 && files[0] === 'cc.js';
  
  return {
    name: '单文件输出检查',
    passed: hasSingleFile,
    message: hasSingleFile ? '单文件输出正确' : `发现${files.length}个JS文件: ${files.join(', ')}`,
  };
}

function checkNoSystemJS(outputDir) {
  const entryFile = join(outputDir, 'cc.js');
  if (!existsSync(entryFile)) {
    return { name: '无SystemJS格式', passed: false, message: '入口文件不存在' };
  }
  
  const content = readFileSync(entryFile, 'utf-8');
  const hasSystemRegister = content.includes('System.register');
  
  return {
    name: '无SystemJS格式',
    passed: !hasSystemRegister,
    message: hasSystemRegister ? '发现System.register格式' : '未发现SystemJS格式',
  };
}

function checkCJSFormat(outputDir) {
  const entryFile = join(outputDir, 'cc.js');
  if (!existsSync(entryFile)) {
    return { name: 'CJS格式检查', passed: false, message: '入口文件不存在' };
  }
  
  const content = readFileSync(entryFile, 'utf-8');
  const hasUseStrict = content.startsWith('"use strict"');
  const hasModuleExports = content.includes('module.exports');
  
  return {
    name: 'CJS格式检查',
    passed: hasUseStrict || hasModuleExports,
    message: hasUseStrict ? '使用严格模式' : (hasModuleExports ? '使用module.exports' : '未发现CJS格式'),
  };
}

function main() {
  const platforms = ['web', 'wechat'];
  const results = [];
  
  console.log('========================================');
  console.log('Vite Build Verification (Single File)');
  console.log('========================================\n');
  
  for (const platform of platforms) {
    console.log(`\n验证 ${platform} 平台...`);
    const result = verifyBuild(platform);
    results.push(result);
    
    console.log(`\n${result.summary}`);
    for (const check of result.checks) {
      const icon = check.passed ? '✅' : '❌';
      console.log(`  ${icon} ${check.name}: ${check.message}`);
    }
  }
  
  const allPassed = results.every(r => r.passed);
  
  console.log('\n========================================');
  console.log(allPassed ? '✅ 所有平台验证通过' : '❌ 部分平台验证失败');
  console.log('========================================');
  
  process.exit(allPassed ? 0 : 1);
}

main();
