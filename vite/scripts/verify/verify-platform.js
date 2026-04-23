const { existsSync, readFileSync, statSync } = require('fs');
const { resolve, join } = require('path');

const engineRoot = resolve(__dirname, '../../..');

const PLATFORM_CONFIGS = {
  web: {
    name: 'Web',
    expectedConstants: {
      WECHAT: false,
      XIAOMI: false,
      ALIPAY: false,
      BYTEDANCE: false,
    },
    forbiddenPatterns: [
      /\bwx\./g,
      /\bmy\./g,
      /\bswan\./g,
      /\bqq\./g,
      /\btt\./g,
      /\bqg\./g,
      /\bks\./g,
      /\bhw\./g,
      /System\.register/g,
    ],
    requiredPatterns: [],
    format: 'esm',
    description: 'Web平台应该使用ESM格式，不包含小游戏API',
  },
  wechat: {
    name: 'WeChat Mini Game',
    expectedConstants: {
      WECHAT: true,
      XIAOMI: false,
      ALIPAY: false,
      SUPPORT_JIT: false,
    },
    forbiddenPatterns: [
      /System\.register/g,
      /\bmy\./g,
      /\bswan\./g,
      /\bqq\./g,
      /\btt\./g,
      /\bqg\./g,
    ],
    requiredPatterns: [
      /\bwx\./g,
    ],
    format: 'cjs',
    description: '微信小游戏平台应该使用CJS格式，包含wx API',
  },
  xiaomi: {
    name: 'Xiaomi Quick Game',
    expectedConstants: {
      XIAOMI: true,
      WECHAT: false,
      ALIPAY: false,
      SUPPORT_JIT: false,
    },
    forbiddenPatterns: [
      /System\.register/g,
      /\bwx\./g,
      /\bmy\./g,
      /\bswan\./g,
      /\btt\./g,
    ],
    requiredPatterns: [
      /\bqg\./g,
    ],
    format: 'cjs',
    description: '小米快游戏平台应该使用CJS格式，包含qg API',
  },
  alipay: {
    name: 'Alipay Mini Game',
    expectedConstants: {
      ALIPAY: true,
      WECHAT: false,
      XIAOMI: false,
      SUPPORT_JIT: false,
    },
    forbiddenPatterns: [
      /System\.register/g,
      /\bwx\./g,
      /\bswan\./g,
      /\btt\./g,
      /\bks\./g,
    ],
    requiredPatterns: [
      /\bmy\./g,
    ],
    format: 'cjs',
    description: '支付宝小游戏平台应该使用CJS格式，包含my API',
  },
  bytedance: {
    name: 'ByteDance Mini Game',
    expectedConstants: {
      BYTEDANCE: true,
      WECHAT: false,
      XIAOMI: false,
      ALIPAY: false,
      SUPPORT_JIT: false,
    },
    forbiddenPatterns: [
      /System\.register/g,
      /\bwx\./g,
      /\bmy\./g,
      /\bswan\./g,
      /\bks\./g,
    ],
    requiredPatterns: [
      /\btt\./g,
    ],
    format: 'cjs',
    description: '字节跳动小游戏平台应该使用CJS格式，包含tt API',
  },
  baidu: {
    name: 'Baidu Mini Game',
    expectedConstants: {
      WECHAT: false,
      XIAOMI: false,
      ALIPAY: false,
      SUPPORT_JIT: false,
    },
    forbiddenPatterns: [
      /System\.register/g,
      /\bwx\./g,
      /\bmy\./g,
      /\btt\./g,
      /\bks\./g,
    ],
    requiredPatterns: [
      /\bswan\./g,
    ],
    format: 'cjs',
    description: '百度小游戏平台应该使用CJS格式，包含swan API',
  },
  native: {
    name: 'Native',
    expectedConstants: {
      HTML5: false,
      WECHAT: false,
    },
    forbiddenPatterns: [
      /\bwx\./g,
      /\bmy\./g,
      /\bswan\./g,
      /System\.register/g,
    ],
    requiredPatterns: [
      /\bjsb\./g,
    ],
    format: 'cjs',
    description: 'Native平台应该使用CJS格式，包含jsb API',
  },
};

function verifyBuild(platform) {
  const config = PLATFORM_CONFIGS[platform];
  if (!config) {
    return {
      platform,
      passed: false,
      checks: [{ name: '平台配置', passed: false, message: `未知平台: ${platform}` }],
      summary: `❌ 未知平台: ${platform}`,
    };
  }

  const outputDir = resolve(engineRoot, 'bin/vite', platform, 'prod');
  const checks = [];

  checks.push(checkOutputExists(outputDir, platform));
  
  const content = loadBuildContent(outputDir);
  if (!content) {
    return {
      platform,
      passed: false,
      checks,
      summary: `❌ ${config.name} 构建产物不存在`,
    };
  }

  checks.push(checkFileStructure(outputDir, platform));
  checks.push(checkModuleFormat(content, platform, config));
  checks.push(checkFileSize(outputDir, platform));
  checks.push(...checkConstants(content, platform, config));
  checks.push(...checkForbiddenPatterns(content, platform, config));
  checks.push(...checkRequiredPatterns(content, platform, config));
  
  const passed = checks.every(c => c.passed);
  
  return {
    platform,
    passed,
    checks,
    summary: passed ? `✅ ${config.name} 验证通过` : `❌ ${config.name} 验证失败`,
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

function loadBuildContent(outputDir) {
  const entryFile = join(outputDir, 'cc.js');
  if (!existsSync(entryFile)) {
    return null;
  }
  return readFileSync(entryFile, 'utf-8');
}

function checkFileStructure(outputDir, platform) {
  const entryFile = join(outputDir, 'cc.js');
  const mapFile = join(outputDir, 'cc.js.map');
  
  const hasEntry = existsSync(entryFile);
  const hasMap = existsSync(mapFile);
  
  return {
    name: '文件结构检查',
    passed: hasEntry,
    message: hasEntry 
      ? (hasMap ? 'cc.js + cc.js.map' : 'cc.js (无sourcemap)') 
      : 'cc.js 不存在',
  };
}

function checkModuleFormat(content, platform, config) {
  if (config.format === 'esm') {
    const isESM = content.includes('export ') || content.includes('import ');
    return {
      name: '模块格式检查',
      passed: isESM,
      message: isESM ? 'ESM格式正确' : '未发现ESM格式',
    };
  } else {
    const hasUseStrict = content.startsWith('"use strict"');
    return {
      name: '模块格式检查',
      passed: hasUseStrict,
      message: hasUseStrict ? 'CJS格式正确 (use strict)' : '未发现CJS格式',
    };
  }
}

function checkFileSize(outputDir, platform) {
  const entryFile = join(outputDir, 'cc.js');
  if (!existsSync(entryFile)) {
    return { name: '产物大小检查', passed: false, message: '文件不存在' };
  }
  
  const stat = statSync(entryFile);
  const sizeMB = (stat.size / 1024 / 1024).toFixed(2);
  const sizeKB = (stat.size / 1024).toFixed(2);
  
  let passed = true;
  let message = `cc.js大小: ${sizeMB}MB (${sizeKB}KB)`;
  
  if (stat.size > 3 * 1024 * 1024) {
    passed = false;
    message += ' - 超过3MB，建议优化';
  }
  
  return { name: '产物大小检查', passed, message };
}

function checkConstants(content, platform, config) {
  const checks = [];
  const { expectedConstants } = config;
  
  for (const [constant, expectedValue] of Object.entries(expectedConstants)) {
    const pattern = new RegExp(`const\\s+${constant}\\s*=\\s*(true|false)\\s*;`, 'g');
    const match = content.match(pattern);
    
    if (match) {
      const actualValue = match[0].includes('true');
      checks.push({
        name: `常量 ${constant}`,
        passed: actualValue === expectedValue,
        message: actualValue === expectedValue 
          ? `${constant} = ${expectedValue}` 
          : `${constant} = ${actualValue}，期望 ${expectedValue}`,
      });
    } else if (expectedValue === false) {
      checks.push({
        name: `常量 ${constant}`,
        passed: true,
        message: `${constant} 未定义（tree-shaking移除，等效于false）`,
      });
    } else {
      checks.push({
        name: `常量 ${constant}`,
        passed: false,
        message: `${constant} 未定义，期望 ${expectedValue}`,
      });
    }
  }
  
  return checks;
}

function checkForbiddenPatterns(content, platform, config) {
  const checks = [];
  const { forbiddenPatterns } = config;
  
  for (const pattern of forbiddenPatterns) {
    const matches = content.match(pattern);
    const hasMatch = matches && matches.length > 0;
    
    checks.push({
      name: `禁止模式检查`,
      passed: !hasMatch,
      message: hasMatch 
        ? `发现禁止的模式: ${pattern.toString()} (${matches.length}次)` 
        : `未发现禁止模式`,
    });
  }
  
  return checks;
}

function checkRequiredPatterns(content, platform, config) {
  const checks = [];
  const { requiredPatterns } = config;
  
  if (requiredPatterns.length === 0) {
    return checks;
  }
  
  for (const pattern of requiredPatterns) {
    const matches = content.match(pattern);
    const hasMatch = matches && matches.length > 0;
    
    checks.push({
      name: `必需模式检查`,
      passed: hasMatch,
      message: hasMatch 
        ? `发现必需模式: ${pattern.toString()} (${matches.length}次)` 
        : `未发现必需模式: ${pattern.toString()}`,
    });
  }
  
  return checks;
}

function main() {
  const platforms = process.argv.slice(2);
  const targetPlatforms = platforms.length > 0 ? platforms : ['web', 'wechat', 'xiaomi', 'alipay', 'bytedance', 'baidu'];
  
  console.log('========================================');
  console.log('Vite Build Platform Verification');
  console.log('========================================\n');
  
  const results = [];
  
  for (const platform of targetPlatforms) {
    const config = PLATFORM_CONFIGS[platform];
    console.log(`\n验证 ${platform} 平台...`);
    if (config && config.description) {
      console.log(`说明: ${config.description}`);
    }
    console.log('-'.repeat(40));
    
    const result = verifyBuild(platform);
    results.push(result);
    
    for (const check of result.checks) {
      const icon = check.passed ? '✅' : '❌';
      console.log(`  ${icon} ${check.name}: ${check.message}`);
    }
    
    console.log(`\n${result.summary}`);
  }
  
  const allPassed = results.every(r => r.passed);
  
  console.log('\n========================================');
  console.log(allPassed ? '✅ 所有平台验证通过' : '❌ 部分平台验证失败');
  console.log('========================================');
  
  process.exit(allPassed ? 0 : 1);
}

main();
