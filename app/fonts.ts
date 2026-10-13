// withus 글꼴 — 제목: Newsreader(영문) + Hahmlet(한글 명조), 본문: Inter(영문) + Pretendard(한글)
// Google 글꼴은 next/font/google 이 빌드할 때 받아 같이 배포하고, Pretendard 는 Google Fonts 에 없어
// app/fonts/PretendardVariable.woff2 (SIL OFL 1.1, app/fonts/Pretendard-LICENSE.txt) 를 next/font/local 로 불러온다
import { Hahmlet, Inter, Newsreader } from "next/font/google";
import localFont from "next/font/local";

const serifEn = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--wb-font-serif-en",
  display: "swap",
});
const serifKr = Hahmlet({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--wb-font-serif-kr",
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

export const withusFonts = [
  serifEn.variable,
  serifKr.variable,
  sansEn.variable,
  sansKr.variable,
].join(" ");
