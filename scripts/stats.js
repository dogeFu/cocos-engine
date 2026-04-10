#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const chalk = require('chalk');

class StatsCollector {
    constructor() {
        this.stats = {
            typescript: { files: 0, lines: 0, modules: {} },
            cpp: { files: 0, lines: 0 },
            build: { size: 0, files: {} }
        };
        this.shouldSave = process.argv.includes('--save');
        this.shouldDiff = process.argv.includes('--diff');
        this.reportPath = path.join(__dirname, '..', 'litePlan', 'stats-report.json');
    }

    countLinesInFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            return content.split('\n').length;
        } catch (error) {
            return 0;
        }
    }

    countLinesInDir(dir, extensions, excludeDirs = []) {
        let totalLines = 0;
        let totalFiles = 0;

        const walkDir = (currentDir) => {
            const items = fs.readdirSync(currentDir);
            
            for (const item of items) {
                const fullPath = path.join(currentDir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    if (!excludeDirs.includes(item) && !item.startsWith('.')) {
                        walkDir(fullPath);
                    }
                } else if (stat.isFile()) {
                    const ext = path.extname(item);
                    if (extensions.includes(ext)) {
                        const lines = this.countLinesInFile(fullPath);
                        totalLines += lines;
                        totalFiles++;
                    }
                }
            }
        };

        if (fs.existsSync(dir)) {
            walkDir(dir);
        }

        return { files: totalFiles, lines: totalLines };
    }

    countTypeScriptCode() {
        console.log(chalk.blue('📊 统计 TypeScript 代码...'));
        
        const cocosDir = path.join(__dirname, '..', 'cocos');
        const result = this.countLinesInDir(
            cocosDir,
            ['.ts', '.tsx'],
            ['node_modules', '__tests__', 'tests']
        );

        this.stats.typescript = {
            files: result.files,
            lines: result.lines,
            modules: {}
        };

        const modules = fs.readdirSync(cocosDir).filter(item => {
            const fullPath = path.join(cocosDir, item);
            return fs.statSync(fullPath).isDirectory() && !item.startsWith('_');
        });

        for (const module of modules) {
            const modulePath = path.join(cocosDir, module);
            const moduleStats = this.countLinesInDir(
                modulePath,
                ['.ts', '.tsx'],
                ['node_modules', '__tests__', 'tests']
            );
            if (moduleStats.lines > 0) {
                this.stats.typescript.modules[module] = moduleStats;
            }
        }

        console.log(chalk.green(`✅ TypeScript: ${result.files} 文件, ${result.lines.toLocaleString()} 行`));
    }

    countCppCode() {
        console.log(chalk.blue('📊 统计 C++ 代码...'));
        
        const nativeDir = path.join(__dirname, '..', 'native', 'cocos');
        const result = this.countLinesInDir(
            nativeDir,
            ['.cpp', '.h', '.hpp', '.cc', '.c'],
            ['external', 'node_modules']
        );

        this.stats.cpp = {
            files: result.files,
            lines: result.lines
        };

        console.log(chalk.green(`✅ C++: ${result.files} 文件, ${result.lines.toLocaleString()} 行`));
    }

    countBuildSize() {
        console.log(chalk.blue('📊 统计打包体积...'));
        
        const binDir = path.join(__dirname, '..', 'bin');
        
        if (!fs.existsSync(binDir)) {
            console.log(chalk.yellow('⚠️  未找到构建输出目录 (bin/)，请先运行 npm run build'));
            return;
        }

        const getDirectorySize = (dir) => {
            let totalSize = 0;
            const files = {};

            const walkDir = (currentDir) => {
                const items = fs.readdirSync(currentDir);
                
                for (const item of items) {
                    const fullPath = path.join(currentDir, item);
                    const stat = fs.statSync(fullPath);
                    
                    if (stat.isDirectory()) {
                        walkDir(fullPath);
                    } else if (stat.isFile()) {
                        const size = stat.size;
                        totalSize += size;
                        const ext = path.extname(item);
                        if (!files[ext]) {
                            files[ext] = { count: 0, size: 0 };
                        }
                        files[ext].count++;
                        files[ext].size += size;
                    }
                }
            };

            walkDir(dir);
            return { totalSize, files };
        };

        const result = getDirectorySize(binDir);
        this.stats.build = {
            size: result.totalSize,
            files: result.files
        };

        const sizeMB = (result.totalSize / 1024 / 1024).toFixed(2);
        console.log(chalk.green(`✅ 打包体积: ${sizeMB} MB`));
    }

    formatNumber(num) {
        return num.toLocaleString();
    }

    formatSize(bytes) {
        const mb = bytes / 1024 / 1024;
        if (mb >= 1) {
            return `${mb.toFixed(2)} MB`;
        }
        const kb = bytes / 1024;
        return `${kb.toFixed(2)} KB`;
    }

    formatDiff(current, previous) {
        const diff = current - previous;
        const percentage = ((diff / previous) * 100).toFixed(1);
        
        if (diff > 0) {
            return chalk.red(`+${this.formatNumber(diff)} (${percentage}%)`);
        } else if (diff < 0) {
            return chalk.green(`${this.formatNumber(diff)} (${percentage}%)`);
        } else {
            return chalk.gray('无变化');
        }
    }

    formatSizeDiff(current, previous) {
        const diff = current - previous;
        const percentage = ((diff / previous) * 100).toFixed(1);
        
        if (diff > 0) {
            return chalk.red(`+${this.formatSize(diff)} (${percentage}%)`);
        } else if (diff < 0) {
            return chalk.green(`${this.formatSize(diff)} (${percentage}%)`);
        } else {
            return chalk.gray('无变化');
        }
    }

    printReport() {
        console.log('\n' + chalk.bold.blue('='.repeat(80)));
        console.log(chalk.bold.blue('📊 Cocos Engine 代码统计报告'));
        console.log(chalk.bold.blue('='.repeat(80)));

        console.log('\n' + chalk.bold.yellow('📝 代码行数统计'));
        console.log(chalk.gray('─'.repeat(80)));
        
        const totalLines = this.stats.typescript.lines + this.stats.cpp.lines;
        const totalFiles = this.stats.typescript.files + this.stats.cpp.files;
        
        console.log(`${chalk.cyan('TypeScript:')} ${this.formatNumber(this.stats.typescript.lines)} 行 (${this.stats.typescript.files} 文件)`);
        console.log(`${chalk.cyan('C++:       ')} ${this.formatNumber(this.stats.cpp.lines)} 行 (${this.stats.cpp.files} 文件)`);
        console.log(chalk.gray('─'.repeat(80)));
        console.log(`${chalk.bold.green('总计:      ')} ${chalk.bold.green(this.formatNumber(totalLines))} 行 (${totalFiles} 文件)`);

        console.log('\n' + chalk.bold.yellow('📦 TypeScript 模块详情'));
        console.log(chalk.gray('─'.repeat(80)));
        
        const sortedModules = Object.entries(this.stats.typescript.modules)
            .sort((a, b) => b[1].lines - a[1].lines);

        for (const [module, stats] of sortedModules) {
            const percentage = ((stats.lines / this.stats.typescript.lines) * 100).toFixed(1);
            const bar = this.generateBar(percentage);
            console.log(`${chalk.cyan(module.padEnd(20))} ${this.formatNumber(stats.lines).padStart(8)} 行 ${bar} ${percentage}%`);
        }

        if (this.stats.build.size > 0) {
            console.log('\n' + chalk.bold.yellow('📦 打包体积统计'));
            console.log(chalk.gray('─'.repeat(80)));
            
            console.log(`${chalk.cyan('总体积:')} ${this.formatSize(this.stats.build.size)}`);
            
            const sortedFiles = Object.entries(this.stats.build.files)
                .sort((a, b) => b[1].size - a[1].size);

            console.log('\n文件类型分布:');
            for (const [ext, stats] of sortedFiles.slice(0, 10)) {
                const percentage = ((stats.size / this.stats.build.size) * 100).toFixed(1);
                const bar = this.generateBar(percentage);
                console.log(`${chalk.cyan(ext.padEnd(10))} ${this.formatSize(stats.size).padStart(12)} ${bar} ${percentage}% (${stats.count} 文件)`);
            }
        }

        console.log('\n' + chalk.bold.blue('='.repeat(80)));
        console.log(chalk.gray(`生成时间: ${new Date().toLocaleString('zh-CN')}`));
        console.log(chalk.bold.blue('='.repeat(80)) + '\n');
    }

    printDiffReport(previousReport) {
        console.log('\n' + chalk.bold.blue('='.repeat(80)));
        console.log(chalk.bold.blue('📊 Cocos Engine 代码对比报告'));
        console.log(chalk.bold.blue('='.repeat(80)));

        const prev = previousReport.details;
        const prevTimestamp = new Date(previousReport.timestamp).toLocaleString('zh-CN');

        console.log(chalk.gray(`对比基准: ${prevTimestamp}`));
        console.log('');

        console.log(chalk.bold.yellow('📝 代码行数对比'));
        console.log(chalk.gray('─'.repeat(80)));

        const totalLines = this.stats.typescript.lines + this.stats.cpp.lines;
        const prevTotalLines = prev.typescript.lines + prev.cpp.lines;
        const totalFiles = this.stats.typescript.files + this.stats.cpp.files;
        const prevTotalFiles = prev.typescript.files + prev.cpp.files;

        console.log(`${chalk.cyan('TypeScript:')} ${this.formatNumber(this.stats.typescript.lines)} 行 ` +
            `${this.formatDiff(this.stats.typescript.lines, prev.typescript.lines)}`);
        console.log(`${chalk.cyan('C++:       ')} ${this.formatNumber(this.stats.cpp.lines)} 行 ` +
            `${this.formatDiff(this.stats.cpp.lines, prev.cpp.lines)}`);
        console.log(chalk.gray('─'.repeat(80)));
        console.log(`${chalk.bold.green('总计:      ')} ${chalk.bold.green(this.formatNumber(totalLines))} 行 ` +
            `${this.formatDiff(totalLines, prevTotalLines)}`);

        console.log('\n' + chalk.bold.yellow('📦 TypeScript 模块对比'));
        console.log(chalk.gray('─'.repeat(80)));

        const allModules = new Set([
            ...Object.keys(this.stats.typescript.modules),
            ...Object.keys(prev.typescript.modules)
        ]);

        const moduleDiffs = [];
        for (const module of allModules) {
            const current = this.stats.typescript.modules[module]?.lines || 0;
            const previous = prev.typescript.modules[module]?.lines || 0;
            const diff = current - previous;
            
            if (diff !== 0 || current > 0) {
                moduleDiffs.push({
                    module,
                    current,
                    previous,
                    diff,
                    percentage: previous > 0 ? ((diff / previous) * 100).toFixed(1) : 'N/A'
                });
            }
        }

        moduleDiffs.sort((a, b) => a.diff - b.diff);

        for (const { module, current, previous, diff, percentage } of moduleDiffs) {
            const diffStr = diff > 0 
                ? chalk.red(`+${this.formatNumber(diff)}`) 
                : diff < 0 
                    ? chalk.green(this.formatNumber(diff))
                    : chalk.gray('无变化');
            
            const status = current === 0 
                ? chalk.red(' [已删除]')
                : previous === 0 
                    ? chalk.green(' [新增]')
                    : '';

            console.log(`${chalk.cyan(module.padEnd(20))} ${this.formatNumber(current).padStart(8)} 行 ${diffStr.padStart(12)} ${status}`);
        }

        if (this.stats.build.size > 0 && prev.build.size > 0) {
            console.log('\n' + chalk.bold.yellow('📦 打包体积对比'));
            console.log(chalk.gray('─'.repeat(80)));
            
            console.log(`${chalk.cyan('总体积:')} ${this.formatSize(this.stats.build.size)} ` +
                `${this.formatSizeDiff(this.stats.build.size, prev.build.size)}`);
        }

        console.log('\n' + chalk.bold.blue('='.repeat(80)));
        console.log(chalk.gray(`生成时间: ${new Date().toLocaleString('zh-CN')}`));
        console.log(chalk.bold.blue('='.repeat(80)) + '\n');
    }

    generateBar(percentage) {
        const barLength = 20;
        const filled = Math.round((parseFloat(percentage) / 100) * barLength);
        const empty = barLength - filled;
        return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
    }

    saveToFile() {
        const reportDir = path.dirname(this.reportPath);
        
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalLines: this.stats.typescript.lines + this.stats.cpp.lines,
                totalFiles: this.stats.typescript.files + this.stats.cpp.files,
                buildSize: this.stats.build.size
            },
            details: this.stats
        };

        fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2), 'utf-8');
        console.log(chalk.green(`\n📄 报告已保存到: ${this.reportPath}`));
    }

    loadPreviousReport() {
        if (fs.existsSync(this.reportPath)) {
            try {
                const content = fs.readFileSync(this.reportPath, 'utf-8');
                return JSON.parse(content);
            } catch (error) {
                console.log(chalk.yellow('⚠️  无法读取之前的报告文件'));
                return null;
            }
        }
        return null;
    }

    run() {
        console.log(chalk.bold.blue('\n🚀 开始统计 Cocos Engine 代码...\n'));
        
        this.countTypeScriptCode();
        this.countCppCode();
        this.countBuildSize();

        if (this.shouldDiff) {
            const previousReport = this.loadPreviousReport();
            if (previousReport) {
                this.printDiffReport(previousReport);
            } else {
                console.log(chalk.yellow('\n⚠️  未找到之前的报告文件，无法进行对比'));
                this.printReport();
            }
        } else {
            this.printReport();
        }

        if (this.shouldSave) {
            this.saveToFile();
        }
    }
}

const collector = new StatsCollector();
collector.run();
