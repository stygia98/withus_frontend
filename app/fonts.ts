// withus 글꼴 — 제목: 나눔스퀘어라운드(끝이 둥근 고딕, 한글·영문 공용), 본문: Inter(영문) + Pretendard(한글)
// 본문 Inter 는 next/font/google 이 빌드할 때 받아 같이 배포한다. 한글 글꼴은 Google Fonts 에 없어 파일로 둔다.
// - 나눔스퀘어라운드: app/fonts/NanumSquareRound{R,B}.woff2 (SIL OFL 1.1, app/fonts/NanumSquareRound-LICENSE.txt)
// - Pretendard: app/fonts/PretendardVariable.woff2 (SIL OFL 1.1, app/fonts/Pretendard-LICENSE.txt)
import { Inter } from "next/font/google";
import localFont from "next/font/local";

// 굵기는 보통(R)·굵게(B) 두 벌만 둔다. 제목 굵기 500(CSS 의 --wb-serif 제목)은 굵게(B)로 보이게 범위를 나눈다
const title = localFont({
  src: [
    { path: "./fonts/NanumSquareRoundR.woff2", weight: "300 499", style: "normal" },
    { path: "./fonts/NanumSquareRoundB.woff2", weight: "500 900", style: "normal" },
  ],
  variable: "--wb-font-title",
  display: "swap",
  preload: false, // 한글 글꼴은 크기가 커서 미리 불러오지 않는다
});
const sansEn = Inter({ subsets: ["latin"], variable: "--wb-font-sans-en", display: "swap" });
const sansKr = localFont({
  src: "./fonts/PretendardVariable.woff2",
  weight: "45 920",
  variable: "--wb-font-sans-kr",
  display: "swap",
  preload: false,
});

export const withusFonts = [title.variable, sansEn.variable, sansKr.variable].join(" ");
