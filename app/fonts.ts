// app/fonts.ts — withus 글꼴 (시안 B: 제목 Instrument Serif + Noto Serif KR, 본문 Inter + Noto Sans KR)
import { Inter, Instrument_Serif, Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";

export const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--wu-font-display",
  display: "swap",
});

export const kr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--wu-font-kr",
  display: "swap",
  preload: false, // 한글 글꼴은 크기가 커서 미리 불러오지 않아요
});

const latin = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--wu-font-latin",
  display: "swap",
});

const krSans = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--wu-font-kr-sans",
  display: "swap",
  preload: false,
});

/** <html className={withusFonts}> 에 넣어 주세요 */
export const withusFonts = `${display.variable} ${kr.variable} ${latin.variable} ${krSans.variable}`;
