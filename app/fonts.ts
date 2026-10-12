// app/fonts.ts — withus 글꼴 (next/font가 글꼴을 내 서버에 같이 올려 줘서 빠르고 깨짐이 없어요)
import { Bricolage_Grotesque, Gothic_A1, IBM_Plex_Sans_KR } from "next/font/google";

export const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--wu-font-display",
  display: "swap",
});

export const kr = Gothic_A1({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--wu-font-kr",
  display: "swap",
  preload: false, // 한글 글꼴은 크기가 커서 미리 불러오지 않아요
});

export const sans = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--wu-font-sans",
  display: "swap",
  preload: false,
});

/** <html className={withusFonts}> 에 넣어 주세요 */
export const withusFonts = `${display.variable} ${kr.variable} ${sans.variable}`;
