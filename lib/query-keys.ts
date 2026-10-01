// TanStack Query 쿼리 키는 이 파일에서만 만든다 (CLAUDE.md 5장)
// 도메인 담당자가 자기 도메인 블록에 키를 추가한다. 파일 변경은 PL 리뷰 대상
export const queryKeys = {
  // 팀원1: customer, segment
  customers: {
    all: ["customers"] as const,
    lists: ["customers", "list"] as const,
    list: (params: Record<string, string | number>) => ["customers", "list", params] as const,
    detail: (id: number) => ["customers", "detail", id] as const,
    consentHistory: (id: number) => ["customers", "detail", id, "consent-history"] as const,
  },
  segments: {
    all: ["segments"] as const,
  },
  // 팀원2: campaign(템플릿 포함), workflow
  templates: {
    all: ["templates"] as const,
  },
  campaigns: {
    all: ["campaigns"] as const,
  },
  // 팀원3: tracking, coupon, ai
  dashboard: {
    all: ["dashboard"] as const,
    summary: (from?: string, to?: string) => ["dashboard", "summary", from, to] as const,
    dailySends: (days: number) => ["dashboard", "daily-sends", days] as const,
    queue: ["dashboard", "queue"] as const,
    events: ["dashboard", "events"] as const,
    activeCampaigns: ["dashboard", "active-campaigns"] as const,
  },
  analytics: {
    campaign: (campaignId: number, from?: string, to?: string) =>
      ["analytics", "campaign", campaignId, from, to] as const,
    // AI-03 성과 요약 (최근 1건)
    report: (campaignId: number) => ["analytics", "report", campaignId] as const,
    steps: (campaignId: number, from?: string, to?: string) =>
      ["analytics", "steps", campaignId, from, to] as const,
  },
  coupons: {
    all: ["coupons"] as const,
    list: (page: number) => ["coupons", "list", page] as const,
    issues: (couponId: number, page: number) => ["coupons", "issues", couponId, page] as const,
    // 고객 공개 페이지 /c/[token] — 관리자 쿠폰 캐시와 섞이지 않게 별도 키
    publicCard: (token: string) => ["public-coupon", token] as const,
  },
  // PL: auth
  auth: {
    me: ["auth", "me"] as const,
  },
};
