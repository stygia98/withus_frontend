"use client";

// TinyMCE 자체 설치 래퍼. CDN(tiny.cloud)·클라우드 API 키를 쓰지 않는다 (CLAUDE.md 3장)
// 스크립트는 public/tinymce(= node_modules/tinymce 복사본, scripts/copy-tinymce.mjs)에서 로드한다
//
// 사용하는 쪽은 next/dynamic(() => import(...), { ssr: false }) 으로 불러온다.
// 이 컴포넌트가 SSR 되면 내부 textarea id 가 서버·클라이언트에서 다르게 생성돼
// hydration mismatch 경고가 난다(@tinymce/tinymce-react 의 알려진 동작, 기능엔 영향 없음).
import { Editor } from "@tinymce/tinymce-react";
import type { Editor as TinyMceEditorInstance } from "tinymce";

// tinymce 패키지는 BlobInfo 를 모듈 export 로 내보내지 않는다(내부 전용 타입) —
// images_upload_handler 가 실제로 쓰는 두 메서드만 구조적 타입으로 정의한다
export type UploadBlobInfo = { blob(): Blob; filename(): string };

type TinyMceEditorProps = {
  value: string;
  onChange: (html: string) => void;
  /** 사용 중인 템플릿 등은 읽기 전용으로 보여줄 때 true */
  disabled?: boolean;
  /** 이미지를 선택하면 호출되고, 업로드한 이미지의 공개 URL 을 돌려줘야 한다 */
  onImageUpload?: (blobInfo: UploadBlobInfo) => Promise<string>;
  /** 에디터 인스턴스가 준비되면 전달한다 — 치환자 삽입 버튼 등 상위 화면에서 editor.insertContent() 로 쓴다 */
  onReady?: (editor: TinyMceEditorInstance) => void;
};

export function TinyMceEditor({
  value,
  onChange,
  disabled,
  onImageUpload,
  onReady,
}: TinyMceEditorProps) {
  return (
    <Editor
      tinymceScriptSrc="/tinymce/tinymce.min.js"
      licenseKey="gpl"
      value={value}
      disabled={disabled}
      onEditorChange={(html) => onChange(html)}
      onInit={(_event, editor) => onReady?.(editor)}
      init={{
        height: 420,
        menubar: false,
        plugins: ["link", "lists", "image", "table"],
        toolbar:
          "undo redo | blocks | bold italic | bullist numlist | link image table | removeformat",
        // 이미지·링크 주소를 상대 경로로 바꾸지 않는다 — 운영에서 메일의 이미지·자사 링크가 깨진다
        convert_urls: false,
        branding: false,
        promotion: false,
        images_upload_handler: onImageUpload,
      }}
    />
  );
}
