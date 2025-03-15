#!/usr/bin/env node

/**
 * 다국어 번역 예제 실행 스크립트
 *
 * 사용법:
 * 1. 스크립트에 실행 권한 부여: chmod +x translate-languages.js
 * 2. 스크립트 실행: ./translate-languages.js
 */

require("ts-node").register({
  transpileOnly: true,
  compilerOptions: {
    module: "commonjs",
  },
});

const { main } = require("./multi-language-example");

console.log("📚 다국어 번역 예제를 시작합니다...\n");

main()
  .then(() => {
    console.log("\n🎉 번역 예제가 성공적으로 완료되었습니다.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 번역 중 오류가 발생했습니다:", error);
    process.exit(1);
  });
