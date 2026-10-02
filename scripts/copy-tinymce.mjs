// TinyMCE 자체 설치: node_modules/tinymce 를 public/tinymce 로 복사한다 (CDN·클라우드 API 키 미사용)
// npm install 뒤 postinstall 로 자동 실행된다
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "..", "node_modules", "tinymce");
const dest = join(__dirname, "..", "public", "tinymce");

if (!existsSync(src)) {
  console.warn("[tinymce] node_modules/tinymce 가 없습니다. npm install 을 먼저 실행하세요.");
  process.exit(0);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log("[tinymce] node_modules/tinymce -> public/tinymce 복사 완료");
