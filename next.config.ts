import type { NextConfig } from "next";

// 브라우저·메일 링크는 프론트 주소의 /api/*, /t/* 만 호출하고, Next.js 가 백엔드로 프록시한다 (PRD 2.3)
// 백엔드 주소는 서버 환경변수로만 받는다. 코드에 도메인을 쓰지 않는다
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      // 메일 속 추적 링크(오픈 픽셀·클릭)도 프론트 주소로 받아 넘긴다 (도메인 미구매, PRD 10.4)
      { source: "/t/:path*", destination: `${backendUrl}/t/:path*` },
    ];
  },
};

export default nextConfig;
