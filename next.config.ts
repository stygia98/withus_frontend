import type { NextConfig } from "next";

// 브라우저·메일 링크는 프론트 주소의 /api/*, /t/*, /files/* 만 호출하고, Next.js 가 백엔드로 프록시한다 (PRD 2.3)
// 백엔드 주소는 서버 환경변수로만 받는다. 코드에 도메인을 쓰지 않는다
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      // 메일 속 추적 링크(오픈 픽셀·클릭)도 프론트 주소로 받아 넘긴다 (도메인 미구매, PRD 10.4)
      { source: "/t/:path*", destination: `${backendUrl}/t/:path*` },
      // 에디터에서 올린 이미지(백엔드가 /files/** 로 서빙)도 프론트 주소로 받아 넘긴다 — 메일 속 이미지 주소가 base-url 기준이라 필요하다
      { source: "/files/:path*", destination: `${backendUrl}/files/:path*` },
    ];
  },
};

export default nextConfig;
