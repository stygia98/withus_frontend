// TanStack Query 쿼리 키는 이 파일에서만 만든다 (CLAUDE.md 5장)
// 도메인 담당자가 자기 도메인 블록에 키를 추가한다. 파일 변경은 PL 리뷰 대상
export const queryKeys = {
  // 팀원1: customer, segment
  customers: {
    all: ["customers"] as const,
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
  },
  coupons: {
    all: ["coupons"] as const,
  },
  // PL: auth
  auth: {
    me: ["auth", "me"] as const,
  },
};
