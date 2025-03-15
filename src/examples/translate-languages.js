#!/usr/bin/env node

/**
 * Multi-language translation example execution script
 *
 * Usage:
 * 1. Give execution permission to the script: chmod +x translate-languages.js
 * 2. Run the script: ./translate-languages.js
 */

require("ts-node").register({
  transpileOnly: true,
  compilerOptions: {
    module: "commonjs",
  },
});

const { main } = require("./multi-language-example");

console.log("📚 Starting multi-language translation example...\n");

main()
  .then(() => {
    console.log("\n🎉 Translation example completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ An error occurred during translation:", error);
    process.exit(1);
  });
