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
    activity: (id: number) => ["customers", "detail", id, "activity"] as const,
    purchases: (id: number) => ["customers", "detail", id, "purchases"] as const,
    // 공개 수신거부 페이지 /unsubscribe/[token] — 관리자 고객 캐시와 섞이지 않게 별도 키
    unsubscribe: (token: string) => ["public-unsubscribe", token] as const,
  },
  segments: {
    all: ["segments"] as const,
    lists: ["segments", "list"] as const,
    list: (params: Record<string, string | number>) => ["segments", "list", params] as const,
    detail: (id: number) => ["segments", "detail", id] as const,
    fields: ["segments", "fields"] as const,
    preview: (rule: unknown) => ["segments", "preview", rule] as const,
  },
  // 팀원2: campaign(템플릿 포함), workflow
  templates: {
    all: ["templates"] as const,
    list: (filter: { channel?: "EMAIL" | "SMS"; page: number; size: number }) =>
      ["templates", "list", filter] as const,
    detail: (templateId: number) => ["templates", "detail", templateId] as const,
  },
  campaigns: {
    all: ["campaigns"] as const,
  },
  // 팀원3: tracking, coupon, ai
  dashboard: {
    all: ["dashboard"] as const,
    // asOf: 서울 기준 오늘. 기간을 생략(서버 기본값)해도 자정이 지나면 키가 바뀌어 새로 조회한다
    summary: (from: string | undefined, to: string | undefined, asOf: string) =>
      ["dashboard", "summary", from, to, asOf] as const,
    dailySends: (days: number) => ["dashboard", "daily-sends", days] as const,
    queue: ["dashboard", "queue"] as const,
    events: ["dashboard", "events"] as const,
    activeCampaigns: ["dashboard", "active-campaigns"] as const,
  },
  analytics: {
    // 성과 리포트 목록 (/analytics) — 팀원2 GET /campaigns 를 상태 필터·페이지로 조회
    campaignList: (status: string | undefined, page: number) =>
      ["analytics", "campaign-list", status, page] as const,
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
  members: {
    all: ["members"] as const,
  },
};
