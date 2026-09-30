import type { NextConfig } from "next";

// 브라우저는 /api/* 만 호출하고, Next.js 가 백엔드로 프록시한다 (PRD 2.3)
// 백엔드 주소는 서버 환경변수로만 받는다. 코드에 도메인을 쓰지 않는다
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
