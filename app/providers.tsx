"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

import { api } from "@/lib/api-client";

export function Providers({ children }: { children: React.ReactNode }) {
  // 요청마다 새 클라이언트가 생기지 않도록 state 로 보관
  const [queryClient] = useState(() => new QueryClient());

  // 앱 시작 시 CSRF 쿠키(XSRF-TOKEN)를 먼저 발급받는다 (API_SPEC 1.4)
  useEffect(() => {
    api("/api/v1/auth/csrf").catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
