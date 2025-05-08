#!/usr/bin/env node
/**
 * Code Size Monitor
 * 
 * This script analyzes the codebase and reports files that exceed size limits.
 * It helps enforce the code organization guidelines by identifying files that
 * need refactoring.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix paths to point directly to the project directories
const DIST_DIR = path.resolve(__dirname, '../dist');
const SRC_DIR = path.resolve(__dirname, '../src');
const REPORT_FILE = path.resolve(__dirname, 'size-report.json');
const SIZE_THRESHOLD = 300; // 300 lines - based on our code organization metrics

function getFileSizes(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const results = {};
  
  function processDir(currentDir, relativePath = '') {
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        processDir(filePath, path.join(relativePath, file));
      } else {
        const ext = path.extname(file);
        if (extensions.includes(ext)) {
          const fullPath = path.join(relativePath, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const lineCount = content.split('\n').length;
          results[fullPath] = lineCount;
        }
      }
    }
  }
  
  processDir(dir);
  return results;
}

function printReport(fileSizes) {
  console.log('Code Size Report:');
  console.log('=================');
  
  // Sort by line count, descending
  const sortedFiles = Object.entries(fileSizes)
    .sort((a, b) => b[1] - a[1]);
  
  for (const [file, lineCount] of sortedFiles) {
    const warning = lineCount > SIZE_THRESHOLD ? ' ⚠️  EXCEEDS THRESHOLD!' : '';
    console.log(`${file}: ${lineCount} lines${warning}`);
  }
  
  // Report summary
  const exceededFiles = sortedFiles.filter(([_, lineCount]) => lineCount > SIZE_THRESHOLD);
  if (exceededFiles.length > 0) {
    console.log('\nFiles exceeding threshold:');
    console.log('=========================');
    for (const [file, lineCount] of exceededFiles) {
      console.log(`${file}: ${lineCount} lines (${lineCount - SIZE_THRESHOLD} lines over limit)`);
    }
    console.log(`\nTotal: ${exceededFiles.length} file(s) exceed the ${SIZE_THRESHOLD} line threshold.`);
  } else {
    console.log('\nAll files are within acceptable size limits.');
  }
}

function main() {
  try {
    // Check source files
    console.log('Analyzing source code files...');
    const srcSizes = getFileSizes(SRC_DIR);
    printReport(srcSizes);
    
    // Check dist files if they exist
    if (fs.existsSync(DIST_DIR)) {
      console.log('\nAnalyzing build files...');
      const bundleSizes = {};
      const files = fs.readdirSync(DIST_DIR);
      
      for (const file of files) {
        const ext = path.extname(file);
        if (ext === '.js' || ext === '.css') {
          const filePath = path.join(DIST_DIR, file);
          const stats = fs.statSync(filePath);
          console.log(`- ${file}: ${(stats.size / 1024).toFixed(2)} KB`);
          bundleSizes[file] = stats.size;
        }
      }
      
      // Save bundle sizes for future comparison
      fs.writeFileSync(REPORT_FILE, JSON.stringify(bundleSizes, null, 2));
    }
  } catch (error) {
    console.error('Error analyzing code:', error);
    process.exit(1);
  }
}

main(); 