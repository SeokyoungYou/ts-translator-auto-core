const fs = require("fs");
const path = require("path");

const cjsDir = path.resolve(__dirname, "..", "dist", "cjs");

console.log(`cjsDir: ${cjsDir}`);

// 모든 파일과 하위 디렉터리를 재귀적으로 처리하는 함수
function processDirectory(directory) {
  console.log(`Processing directory: ${directory}`);
  const items = fs.readdirSync(directory);

  for (const item of items) {
    const itemPath = path.join(directory, item);
    const stats = fs.statSync(itemPath);

    if (stats.isDirectory()) {
      // 디렉터리면 재귀적으로 처리
      processDirectory(itemPath);
    } else if (stats.isFile() && item.endsWith(".js")) {
      // JS 파일이면 .cjs로 이름 변경 및 내용 수정
      renameAndUpdateFile(itemPath);
    }
  }
}

// 파일 이름을 변경하고 내용을 업데이트하는 함수
function renameAndUpdateFile(filePath) {
  const newPath = filePath.replace(".js", ".cjs");

  // 파일 이름 변경
  fs.renameSync(filePath, newPath);

  // 파일 내용 읽기
  let content = fs.readFileSync(newPath, "utf8");

  // require('./xxx') 형식의 모든 패턴을 찾아 .cjs로 변경
  content = content.replace(
    /require\(['"]\.\/([^'"]+)['"]\)/g,
    "require('./$1.cjs')"
  );
  content = content.replace(
    /require\(['"]\.\.\/([^'"]+)['"]\)/g,
    "require('../$1.cjs')"
  );

  // 수정된 내용 저장
  fs.writeFileSync(newPath, content);

  console.log(
    `Renamed and updated: ${path.basename(filePath)} -> ${path.basename(
      newPath
    )}`
  );
}

// 메인 실행
try {
  console.log(`Processing CJS files in: ${cjsDir}`);
  processDirectory(cjsDir);
  console.log("All CJS files have been processed successfully.");
} catch (error) {
  console.error(`Error processing CJS files: ${error.message}`);
  process.exit(1);
}
