// TinyMCE 자체 설치: node_modules/tinymce 에서 실제로 쓰는 파일만 public/tinymce 로 복사한다 (CDN·클라우드 API 키 미사용)
// npm install 뒤 postinstall 로 자동 실행된다. 원본이나 필요한 파일이 없으면 실패로 끝낸다(조용히 넘기면 에디터가 빈 화면이 된다)
// 쓰는 플러그인을 바꾸면(TinyMceEditor.tsx 의 plugins) 아래 목록도 같이 바꾼다
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "tinymce");
const dest = join(root, "public", "tinymce");

const files = [
  "tinymce.min.js",
  "license.md", // GPLv2+ 고지
  "models/dom",
  "themes/silver",
  "icons/default",
  "skins/ui/oxide",
  "skins/content/default",
  ...["link", "lists", "image", "table"].map((p) => `plugins/${p}`),
];

const missing = files.filter((f) => !existsSync(join(src, f)));
if (missing.length > 0) {
  console.error(
    `[tinymce] node_modules/tinymce 에 없는 파일: ${missing.join(", ")} — npm install 을 먼저 실행하세요.`,
  );
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
for (const f of files) cpSync(join(src, f), join(dest, f), { recursive: true });
console.log(`[tinymce] ${files.length}개 항목을 public/tinymce 로 복사 완료`);
