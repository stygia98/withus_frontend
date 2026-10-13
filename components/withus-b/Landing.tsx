"use client";
/**
 * withus 시안 B — 홈(서비스 소개)
 * 사용: app/page.tsx 에서 <Landing /> 하나만 넣으면 돼요.
 * 스타일: styles/withus-b.css + styles/withus-b-landing.css
 */
import { useEffect, useRef } from "react";

const QUEUE: [string, string, "r" | "y" | "g", string][][] = [
  [
    ["10월 재방문 쿠폰 · 서울 세그먼트", "1,284명 · 메일", "r", "20:50 마감 임박"],
    ["휴면 고객 웰컴백", "212명 · 메일", "y", "오늘 19:00"],
    ["수신동의 2년 확인 안내", "318명 · 메일", "g", "11.01 09:00"],
  ],
  [
    ["재방문 쿠폰 템플릿", "변수 {이름} {쿠폰}", "g", "검수 완료"],
    ["팬미팅 D-7 SMS", "90자 · (광고) 표기", "y", "검수 대기"],
  ],
  [
    ["팬미팅 사전 알림", "2,410명 · 예약", "y", "10.12 19:00"],
    ["응원봉 v3 사전 판매", "4,812명 · SMS", "g", "10.30 13:00"],
    ["9월 생일 쿠폰", "402명 · 완료", "g", "전환 7.8%"],
  ],
  [
    ["재방문 20% 쿠폰", "사용 92 / 1,284", "g", "11.06까지"],
    ["팬미팅 굿즈 10%", "사용 0 / 2,410", "r", "오늘 만료"],
  ],
];

// 팬 화면(/c, /unsubscribe)은 고객별 토큰 링크로만 열리므로 홈에서 바로 가는 링크는 두지 않는다
export default function Landing() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const $ = <T extends Element = HTMLElement>(s: string) => el.querySelector(s) as T | null;
    const $$ = (s: string) => Array.from(el.querySelectorAll<HTMLElement>(s));
    const off: (() => void)[] = [];
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 머리글: 300px 아래로 내려가면 흰 배경
    const nav = $("#nav");
    const onScroll = () => nav?.classList.toggle("sc", scrollY > 300);
    addEventListener("scroll", onScroll, { passive: true });
    off.push(() => removeEventListener("scroll", onScroll));

    // 나타나기 (위 · 아래 양방향) + 숫자 올라가기
    const count = (c: HTMLElement & { _on?: number }) => {
      const to = Number(c.dataset.count),
        t0 = performance.now();
      const f = (t: number) => {
        const p = Math.min(1, (t - t0) / 1200);
        c.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString("ko-KR");
        if (p < 1 && c._on) requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    };
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          const t = e.target as HTMLElement;
          if (e.intersectionRatio >= 0.15) t.classList.add("in");
          else if (!e.isIntersecting) t.classList.remove("in");
          const c = t.querySelector<HTMLElement & { _on?: number }>("[data-count]");
          if (c && e.intersectionRatio >= 0.15 && !c._on) {
            c._on = 1;
            count(c);
          } else if (c && !e.isIntersecting) {
            c._on = 0;
            c.textContent = "0";
          }
        }),
      { threshold: [0, 0.15] },
    );
    $$(".rv").forEach((n) => io.observe(n));
    off.push(() => io.disconnect());

    // 첫 화면 앱: 도구 버튼 → 발송 대기열 바뀜
    const q = (k: number) => {
      const box = $("#q");
      if (box)
        box.innerHTML = QUEUE[k]
          .map(
            (r) =>
              `<div><div><b>${r[0]}</b><small>${r[1]}</small></div><span class="due ${r[2]}">${r[3]}</span></div>`,
          )
          .join("");
      const n = $("#qn");
      if (n) n.textContent = String(QUEUE[k].length);
    };
    q(0);
    $$("#tools button").forEach((b) => {
      b.onclick = () => {
        $$("#tools button").forEach((x) => x.classList.toggle("on", x === b));
        q(Number(b.dataset.k));
      };
    });

    // 마우스: 원 · 연필 · 낙서가 다른 속도로 따라 움직임
    const st = $("#stage");
    if (st && matchMedia("(pointer:fine)").matches && !reduce) {
      const mv: [string, number][] = [
        [".circle", 30],
        [".pencil", -24],
        [".scr1", 18],
        [".scr2", -14],
      ];
      const onMove = (e: MouseEvent) => {
        const r = st.getBoundingClientRect(),
          x = (e.clientX - r.left) / r.width - 0.5,
          y = (e.clientY - r.top) / r.height - 0.5;
        mv.forEach(([s, k]) => {
          const n = st.querySelector<HTMLElement>(s);
          if (n) n.style.translate = `${x * k}px ${y * k}px`;
        });
      };
      st.addEventListener("mousemove", onMove);
      off.push(() => st.removeEventListener("mousemove", onMove));
    }
    return () => off.forEach((f) => f());
  }, []);

  return (
    <div className="wb wb-landing" ref={root}>
      <header className="nav" id="nav">
        <div className="w">
          <div className="l">
            <a href="#top" className="logo">
              withus
            </a>
            <nav>
              <a href="#features">기능</a>
              <a href="#uses">활용 사례</a>
              <a href="#trust">발송 규정</a>
            </nav>
          </div>
          <div className="r">
            <a href="/login" className="btn k">
              로그인
            </a>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="w">
            <h1 className="rv">
              팬 마케팅을 위한 <span className="box l">CRM</span>
              <br />
              운영 <span className="box m">시스템</span>
            </h1>
            <p className="rv d1">
              withus는 고객 DB, 세그먼트, 메일 · SMS 발송, 쿠폰, 성과 분석을 하나로 연결해요. 흩어진
              툴 대신 한 화면에서 캠페인을 운영하세요.
            </p>
            <div className="cta rv d2">
              <a href="/login" className="btn k">
                로그인하고 시작하기
              </a>
            </div>
          </div>
        </section>
        <section className="stage" id="stage">
          <span className="grid-bg"></span>
          <span className="circle"></span>
          <svg className="pencil" viewBox="0 0 140 40" aria-hidden="true">
            <path d="M0 20 28 4h100v32H28z" fill="#cfeaff" stroke="#001c2e" strokeWidth="2" />
            <path d="M0 20 28 4v32z" fill="#e9f5ff" stroke="#001c2e" strokeWidth="2" />
            <path d="M0 20 9 15v10z" fill="#001c2e" />
          </svg>
          <svg className="scr1" viewBox="0 0 90 50" aria-hidden="true">
            <path
              d="M5 40 80 10M10 46 86 18M16 50 70 30"
              stroke="#001c2e"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
          <svg className="scr2" viewBox="0 0 80 40" aria-hidden="true">
            <path
              d="M2 30c10-20 20 10 30-10s20 10 30-6 10 8 16 0"
              fill="none"
              stroke="#001c2e"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
          <div className="in rv">
            <div className="appk">
              <aside>
                <b>w</b>
                <svg viewBox="0 0 24 24">
                  <path d="M3 11 12 4l9 7v9H3z" />
                </svg>
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
                </svg>
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
                <svg viewBox="0 0 24 24">
                  <path d="M4 20V10M10 20V4M16 20v-7" />
                </svg>
              </aside>
              <main>
                <h6>
                  마케팅 도구 <span>전체 보기</span>
                </h6>
                <div className="tools" id="tools">
                  <button className="on" data-k="0">
                    <i style={{ background: "#8fd3ff" }}></i>세그먼트
                  </button>
                  <button data-k="1">
                    <i style={{ background: "#a9dcff" }}></i>템플릿
                  </button>
                  <button data-k="2">
                    <i style={{ background: "#18c8ff" }}></i>캠페인
                  </button>
                  <button data-k="3">
                    <i style={{ background: "#cfeaff" }}></i>쿠폰
                  </button>
                </div>
                <h6 style={{ marginTop: "18px" }}>
                  발송 대기열{" "}
                  <span style={{ background: "#001c2e", color: "#fff", boxShadow: "none" }} id="qn">
                    3
                  </span>
                </h6>
                <div className="q" id="q"></div>
                <h6 style={{ marginTop: "16px" }}>최근 활동</h6>
                <div className="q">
                  <div>
                    <span>10월 재방문 쿠폰 · 메일 오픈 43.1%</span>
                    <small>방금</small>
                  </div>
                  <div>
                    <span>팬미팅 사전 알림 · 예약 2,410명</span>
                    <small>25분 전</small>
                  </div>
                </div>
              </main>
            </div>
            <div className="chat">
              <div className="hd">
                <b></b>withus AI
              </div>
              <div className="art"></div>
              <h5>안녕하세요, 하늘님!</h5>
              <div className="sg">
                <span>휴면 고객 웰컴백 메일 쓰기</span>
                <span>이번 주 오픈율 요약하기</span>
                <span>쿠폰 전환이 높은 세그먼트 찾기</span>
              </div>
            </div>
          </div>
        </section>

        <section className="sec c">
          <div className="w">
            <h2 className="h2 rv">
              필요한 건{" "}
              <span className="st">
                툴 하나 더
                <svg viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M2 6 C30 2 60 9 98 3" />
                </svg>
              </span>
              가 아니라
              <br />
              <span className="hlx tex">시스템</span>예요.
            </h2>
            <p className="lede rv d1">
              지금 CRM 마케팅은 흩어진 툴 위에서 돌아가요. 명단은 엑셀에, 발송은 문자 사이트에,
              쿠폰은 또 다른 곳에. 연결은 마케터가 손으로 하고, 결과는 끝나고 나서야 보여요.
            </p>
            <p className="lede rv d2">
              withus는 그 우회로를 없애요. 고객 데이터가 기준이 되고, 반응이 신호가 되고, AI가 그
              둘을 이어 줘요.
            </p>
          </div>
          <svg className="scrib rv" viewBox="0 0 1000 230" aria-hidden="true">
            <path
              className="s"
              d="M20 200 C40 150 80 120 110 150 C130 170 105 185 112 160 C125 120 150 160 160 120 C175 60 195 30 205 90 C212 140 215 190 230 170 C245 140 250 60 262 50 C275 40 268 120 290 140 M300 40 L318 20 M318 52 L340 40 M340 80 C350 60 360 40 372 52 C360 60 380 70 368 80 C386 80 372 100 386 108 C400 90 420 110 410 140 C425 100 440 80 460 110 C470 130 470 140 480 120 C490 100 500 140 520 130 C540 120 560 170 640 175 C700 178 760 170 800 168"
            />
            <path
              className="s"
              d="M360 160 l-8 10 M375 150 l2 14 M386 162 l10 6 M808 168 l12 -8 M810 172 l14 6"
            />
            <g transform="translate(820 150) rotate(-35)">
              <path d="M0 12 24 0h110v24H24z" fill="#cfeaff" />
              <path d="M0 12 24 0v24z" fill="#e9f5ff" />
              <path d="M0 12 8 8v8z" fill="#001c2e" />
            </g>
          </svg>
        </section>

        <section className="sec" id="features">
          <div className="w">
            <h2 className="h2 c rv">
              흩어진 업무를 하나의
              <br />
              마케팅 시스템으로.
            </h2>
            <div className="rows">
              <div className="row rv">
                <div className="pic" style={{ background: "var(--mint)" }}>
                  <svg
                    className="blob"
                    viewBox="0 0 200 200"
                    style={{ left: "8%", top: "-10%", width: "78%" }}
                  >
                    <path
                      d="M40 10 170 0 200 110 140 200 20 180 0 70z"
                      fill="#1a4bff"
                      opacity=".9"
                    />
                  </svg>
                  <div className="card">
                    <div className="t">
                      <b></b>withus AI
                    </div>
                    캠페인 초안을 만들었어요. 바로 수정할 수 있어요.
                    <div className="chip">📄 10월 재방문 쿠폰 캠페인 ›</div>
                    <p style={{ marginTop: "12px" }}>이어서 할 수 있는 일:</p>
                    <ol className="ol">
                      <li>
                        <span className="tagp">서울 · 최근 반응 30일+</span> 세그먼트에 예약 발송
                      </li>
                      <li>메일 미열람 고객에게 SMS 리마인드 추가</li>
                      <li>쿠폰 전환 리포트 만들기</li>
                    </ol>
                  </div>
                </div>
                <div className="txt">
                  <svg className="ico" viewBox="0 0 48 48">
                    <rect x="4" y="20" width="40" height="7" fill="#1a4bff" />
                    <rect x="8" y="28" width="34" height="7" fill="#2fd1ff" />
                    <rect x="2" y="36" width="44" height="8" fill="#18c8ff" />
                    <rect
                      x="16"
                      y="6"
                      width="6"
                      height="16"
                      transform="rotate(-20 19 14)"
                      fill="#cfeaff"
                    />
                  </svg>
                  <div>
                    <h3>
                      흩어진 툴이 아닌
                      <br />
                      하나로 이어진 흐름
                    </h3>
                    <p>
                      수집 · 세그먼트 · 발송 · 분석을 한 루프로 연결해 툴과 담당자 사이의 전달
                      과정을 없애요.
                    </p>
                  </div>
                </div>
              </div>
              <div className="row r rv">
                <div
                  className="pic"
                  style={{
                    background: "var(--pink)",
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,.25) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.25) 1px,transparent 1px)",
                    backgroundSize: "16px 16px",
                  }}
                >
                  <svg
                    className="blob"
                    viewBox="0 0 200 200"
                    style={{ left: "-8%", top: "-30%", width: "50%" }}
                  >
                    <path
                      d="M100 0 120 60 190 40 140 100 200 150 120 140 100 200 80 140 0 150 60 100 10 40 80 60z"
                      fill="#cfeaff"
                    />
                  </svg>
                  <div className="card" style={{ width: "min(380px,100%)" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <b style={{ fontSize: "13px" }}>쿠폰 전환 현황</b>
                        <br />
                        <small style={{ color: "var(--mute)" }}>최근 7일 · 전체 캠페인</small>
                      </div>
                      <div className="ring">
                        <span>799</span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        marginTop: "10px",
                        fontSize: "11px",
                        color: "var(--mute)",
                      }}
                    >
                      <span>● 사용</span>
                      <span>● 곧 만료</span>
                      <span>● 미사용</span>
                    </div>
                    <div
                      className="chip"
                      style={{ width: "100%", justifyContent: "space-between" }}
                    >
                      오픈율 41.2% <span style={{ color: "#13803f" }}>+3.4%p</span>
                    </div>
                  </div>
                </div>
                <div className="txt">
                  <svg className="ico" viewBox="0 0 48 48">
                    <rect x="2" y="2" width="44" height="44" fill="#1a4bff" />
                    <rect x="6" y="6" width="17" height="17" fill="#cfeaff" />
                    <rect x="25" y="6" width="17" height="17" fill="#2fd1ff" />
                    <rect x="6" y="25" width="17" height="17" fill="#2fd1ff" />
                    <rect x="25" y="25" width="17" height="17" fill="#cfeaff" />
                    <circle cx="14.5" cy="14.5" r="4" fill="#001c2e" />
                    <circle cx="33.5" cy="33.5" r="4" fill="#001c2e" />
                  </svg>
                  <div>
                    <h3>
                      캠페인 성과를
                      <br />
                      실시간으로
                    </h3>
                    <p>
                      오픈 · 클릭 · 쿠폰 전환이 바로 쌓여요. 캠페인이 끝난 뒤가 아니라, 진행 중에
                      판단하세요.
                    </p>
                  </div>
                </div>
              </div>
              <div className="row rv">
                <div
                  className="pic"
                  style={{
                    background: "var(--lav)",
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,.2) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.2) 1px,transparent 1px)",
                    backgroundSize: "16px 16px",
                  }}
                >
                  <svg
                    className="blob"
                    viewBox="0 0 200 200"
                    style={{ right: "-10%", bottom: "-20%", width: "60%" }}
                  >
                    <circle cx="100" cy="100" r="100" fill="#2fd1ff" />
                  </svg>
                  <div className="card">
                    <div className="t" style={{ fontSize: "13px" }}>
                      고객 DB 업로드
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>10월_고객명단.xlsx</span>
                      <b>10,000행</b>
                    </div>
                    <div className="bar">
                      <i></i>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: "14px",
                        alignItems: "baseline",
                      }}
                    >
                      <span style={{ color: "var(--mute)" }}>타깃 고객</span>
                      <span className="big" data-count="1284">
                        0
                      </span>
                    </div>
                    <div className="chip">
                      지역 = 서울 <b>AND</b> 최근 반응 30일+ <b>AND</b> 수신 동의
                    </div>
                  </div>
                </div>
                <div className="txt">
                  <svg className="ico" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="22" fill="#001c2e" />
                    <circle cx="24" cy="24" r="15" fill="#a9dcff" />
                    <circle cx="24" cy="24" r="8" fill="#18c8ff" />
                  </svg>
                  <div>
                    <h3>
                      세그먼트 기반
                      <br />
                      정밀 타깃팅
                    </h3>
                    <p>
                      지역 · 연령 · 누적 구매액 · 최근 반응을 AND / OR로 결합하면 대상 인원이 바로
                      계산돼요.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sec" id="uses">
          <div className="w">
            <div className="uh rv">
              <h2>
                모든 캠페인 상황을
                <br />
                하나의 시스템으로
              </h2>
              <p>withus는 매장이 실제로 일하는 방식에 맞춰요. 별도 툴이나 추가 작업 없이요.</p>
            </div>
            <div className="uses">
              <article className="use rv">
                <div className="pic">
                  <svg
                    className="blob"
                    viewBox="0 0 200 100"
                    style={{ left: "10%", top: "10%", width: "80%" }}
                  >
                    <path d="M0 100 100 0 200 100z" fill="#1a4bff" />
                  </svg>
                  <div className="card">
                    <span className="tagp" style={{ float: "right" }}>
                      추천
                    </span>
                    <b style={{ fontSize: "13px" }}>AI로 캠페인 만들기</b>
                    <p style={{ color: "var(--mute)", marginTop: "6px" }}>
                      목표만 쓰면 세그먼트 · 문구 · 발송 시간을 제안해요.
                    </p>
                  </div>
                </div>
                <h3>캠페인 기획과 제작</h3>
                <p>
                  목표를 입력하면 세그먼트와 문구, 발송 시간까지 바로 실행할 수 있는 초안을
                  만들어요.
                </p>
              </article>
              <article className="use rv d1">
                <div
                  className="pic"
                  style={{ background: "linear-gradient(180deg,transparent 30%,transparent)" }}
                >
                  <svg
                    className="blob"
                    viewBox="0 0 200 100"
                    style={{ left: "0", top: "0", width: "60%" }}
                  >
                    <path d="M0 0h200L120 100H0z" fill="#2fd1ff" />
                  </svg>
                  <div className="card">
                    <b style={{ fontSize: "13px" }}>어떤 고객에게 보낼까요?</b>
                    <div className="chip" style={{ width: "100%" }}>
                      예: 서울, 최근 30일 반응 없음
                    </div>
                  </div>
                </div>
                <h3>세그먼트와 타깃팅</h3>
                <p>고객 반응이 쌓일 때마다 세그먼트가 갱신되어 다음 발송 대상이 바로 정해져요.</p>
              </article>
              <article className="use rv d2">
                <div className="pic">
                  <svg
                    className="blob"
                    viewBox="0 0 200 60"
                    style={{ right: "-10%", top: "0", width: "90%" }}
                  >
                    <path d="M0 20 200 0v30L20 60z" fill="#cfeaff" />
                  </svg>
                  <div className="card">
                    <b style={{ fontSize: "13px" }}>휴면 고객 212명</b>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginTop: "6px",
                      }}
                    >
                      <div className="ring" style={{ width: "46px", height: "46px" }}>
                        <span style={{ width: "32px", height: "32px", fontSize: "11px" }}>42</span>
                      </div>
                      <span style={{ color: "var(--mute)" }}>웰컴백 오픈율 42%</span>
                    </div>
                  </div>
                </div>
                <h3>휴면 고객 재활성화</h3>
                <p>반응이 끊긴 고객을 찾아 자동으로 다시 연결해요.</p>
              </article>
              <article className="use rv">
                <div className="pic">
                  <svg
                    className="blob"
                    viewBox="0 0 200 100"
                    style={{ left: "5%", top: "-20%", width: "90%" }}
                  >
                    <ellipse cx="100" cy="60" rx="100" ry="70" fill="#1a4bff" />
                  </svg>
                  <div className="card">
                    <b style={{ fontSize: "13px" }}>팬미팅 사전 알림</b>
                    <p style={{ color: "var(--mute)", marginTop: "4px" }}>
                      D-7 · D-1 · 당일 순서대로 안내
                    </p>
                  </div>
                </div>
                <h3>공연 · 팬미팅 알림</h3>
                <p>예약 발송으로 일정 전에 필요한 안내를 순서대로 보내요.</p>
              </article>
              <article className="use rv d1">
                <div className="pic">
                  <svg
                    className="blob"
                    viewBox="0 0 200 100"
                    style={{ left: "0", top: "0", width: "100%" }}
                  >
                    <path d="M0 30C60 0 140 60 200 20v80H0z" fill="#18c8ff" />
                  </svg>
                  <div className="card">
                    <b style={{ fontSize: "13px" }}>굿즈 사전 판매</b>
                    <p style={{ color: "var(--mute)", marginTop: "4px" }}>
                      VIP 4,812명 먼저 공개 · 10.30 13:00
                    </p>
                  </div>
                </div>
                <h3>굿즈 · 사전 판매</h3>
                <p>VIP 세그먼트에 먼저 열고 반응을 실시간으로 확인해요.</p>
              </article>
              <article className="use rv d2">
                <div className="pic">
                  <svg
                    className="blob"
                    viewBox="0 0 200 60"
                    style={{ left: "10%", top: "0", width: "80%" }}
                  >
                    <path d="M0 10h200v20H0z" fill="#1a4bff" />
                  </svg>
                  <div className="card">
                    <b style={{ fontSize: "13px" }}>생일 쿠폰 · 매월 자동</b>
                    <p style={{ color: "var(--mute)", marginTop: "4px" }}>
                      9월 312건 사용 · 전환 7.8%
                    </p>
                  </div>
                </div>
                <h3>정기 · 자동 발송</h3>
                <p>생일 · 수신 동의 재확인처럼 반복되는 발송은 한 번 설정하면 끝나요.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="sec c" id="trust">
          <div className="w">
            <h2 className="h2 rv">팬을 위한 규정, 시스템이 지켜요.</h2>
            <div className="trust">
              <div className="tr rv">
                <span className="n">01</span>
                <h3>광고 발송 시간</h3>
                <p>광고성 발송은 08:00–20:50에만, 넘기면 다음 날 자동 예약.</p>
              </div>
              <div className="tr rv d1">
                <span className="n">02</span>
                <h3>수신 거부 자동 삽입</h3>
                <p>모든 메일 · SMS에 수신 거부 링크가 자동으로 들어가요.</p>
              </div>
              <div className="tr rv d2">
                <span className="n">03</span>
                <h3>역할별 권한</h3>
                <p>고객 데이터는 조직 안에서, 역할별 권한으로 관리돼요.</p>
              </div>
              <div className="tr rv d3">
                <span className="n">04</span>
                <h3>쿠폰 1회 사용</h3>
                <p>쿠폰은 1회만 사용, 사용 시각과 매장이 기록돼요.</p>
              </div>
            </div>
            <div className="band rv">
              <p>개인정보와 발송 규정을 기본으로</p>
              <div className="seals">
                <span className="seal">광고 시간</span>
                <span className="seal">수신 거부</span>
                <span className="seal">권한 관리</span>
                <span className="seal">1회 쿠폰</span>
                <span className="seal">마스킹</span>
                <span className="seal">로그 기록</span>
              </div>
            </div>
          </div>
        </section>

        <section className="sec c">
          <div className="w">
            <h2 className="h2 rv">쓰던 방식 그대로</h2>
            <p className="lede rv d1" style={{ color: "var(--mute)" }}>
              withus는 지금 쓰는 고객 파일과 채널 위에서 바로 동작하고, 필요한 만큼 점점 더 많은
              일을 맡을 수 있어요.
            </p>
          </div>
          <div className="tiles rv">
            <span className="tile">엑셀</span>
            <span className="tile">CSV</span>
            <span className="tile">이메일</span>
            <span className="tile">SMS</span>
          </div>
        </section>

        {/* 마지막 권유: 한 문장 + 버튼 하나. 블러는 히어로와 이 구간 두 곳에만 둔다 */}
        <section className="end">
          <div className="w">
            <div className="endp rv">
              <h2 className="h2">캠페인 운영, 오늘부터 한 화면에서</h2>
              <p className="lede">
                고객 업로드부터 발송, 쿠폰 전환 확인까지. 계정은 조직의 OWNER가 발급해요.
              </p>
              <div className="cta">
                <a href="/login" className="btn k">
                  로그인하고 시작하기
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 푸터: 무엇을 하는 서비스인지 · 어디로 갈 수 있는지 · 어떤 원칙으로 보내는지 */}
      <footer>
        <div className="w">
          <div className="ft">
            <div className="fb">
              <span className="logo">withus</span>
              <p>
                팬 마케팅을 위한 CRM 운영 시스템.
                <br />
                고객 · 세그먼트 · 발송 · 쿠폰 · 성과를 한 곳에서.
              </p>
            </div>
            <nav className="fc" aria-label="둘러보기">
              <b>둘러보기</b>
              <a href="#features">기능</a>
              <a href="#uses">활용 사례</a>
              <a href="#trust">발송 규정</a>
            </nav>
            <div className="fc">
              <b>발송 원칙</b>
              <span>광고 발송은 08:00–20:50</span>
              <span>수신 거부 링크 자동 삽입</span>
              <span>쿠폰은 1회만 사용</span>
            </div>
            <div className="fc">
              <b>관리자</b>
              <a href="/login">로그인</a>
              <span>계정은 조직의 OWNER가 발급해요</span>
            </div>
          </div>
          <div className="fbot">
            <span>© 2026 withus</span>
            <span>고객 연락처는 화면에서 일부만 보여요</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
