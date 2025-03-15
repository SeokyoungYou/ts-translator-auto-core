#!/usr/bin/env node

/**
 * Module Compatibility Test Script
 * Tests compatibility with both ESM and CommonJS module systems.
 *
 * How to run:
 * 1. npm install dotenv cross-spawn chalk
 * 2. node src/examples/dual-module-test.js
 */

// Required Node.js modules
const spawn = require("cross-spawn");
const path = require("path");
const chalk = require("chalk") || {
  green: (text) => text,
  red: (text) => text,
  yellow: (text) => text,
  blue: (text) => text,
};

console.log(chalk.blue("🔍 Starting module compatibility check..."));
console.log(chalk.blue("========================================="));

// Current working directory
const cwd = process.cwd();

// Test execution function
function runTest(command, args, name) {
  console.log(chalk.yellow(`\n🧪 Running ${name} test...\n`));

  // Execute subprocess
  const result = spawn.sync(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env },
  });

  // Evaluate result
  if (result.status === 0) {
    console.log(chalk.green(`\n✅ ${name} test succeeded!`));
    return true;
  } else {
    console.log(
      chalk.red(`\n❌ ${name} test failed. Exit code: ${result.status}`)
    );
    return false;
  }
}

// ESM test
const esmSuccess = runTest(
  "node",
  [
    "--experimental-modules",
    path.join(cwd, "src", "examples", "esm-example.js"),
  ],
  "ES Module"
);

console.log(chalk.blue("\n-----------------------------------------\n"));

// CommonJS test
const cjsSuccess = runTest(
  "node",
  [path.join(cwd, "src", "examples", "cjs-example.cjs")],
  "CommonJS Module"
);

console.log(chalk.blue("\n========================================="));

// Results summary
console.log(chalk.yellow("\n📊 Test Results Summary:"));
console.log(
  `ESM Compatibility: ${
    esmSuccess ? chalk.green("✓ Success") : chalk.red("✗ Failed")
  }`
);
console.log(
  `CommonJS Compatibility: ${
    cjsSuccess ? chalk.green("✓ Success") : chalk.red("✗ Failed")
  }`
);

if (esmSuccess && cjsSuccess) {
  console.log(
    chalk.green("\n🎉 Congratulations! Compatible with both module systems!")
  );
} else {
  console.log(chalk.red("\n⚠️ Some tests failed. Check the error messages."));
  process.exit(1);
}
