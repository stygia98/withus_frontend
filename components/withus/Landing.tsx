/* eslint-disable -- 디자인 키트의 시안 움직임 코드를 그대로 옮긴 파일(@ts-nocheck). 수정하지 않고 키트 갱신 때 통째로 교체한다 */
// @ts-nocheck — 원본 시안의 움직임 코드를 그대로 옮겨서 타입 검사는 끕니다.
"use client";
/*
  withus 홈 (서비스 소개) — 시안 withus-home.html 과 똑같은 화면
  · 화면 전환 막 · 부드러운 스크롤 · 줄마다 올라오는 제목 · 흐르는 띠 · 쌓이는 카드 · 옆으로 넘기는 How it works
  · 스타일: styles/withus-landing.css (.wu-landing 안에서만 적용)
*/
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Landing() {
  const router = useRouter();
  const goRef = useRef((href: string) => router.push(href));
  goRef.current = (href: string) => router.push(href);

  useEffect(() => {
    // ---- 화면을 떠날 때 모두 정리되도록 전역 이벤트 · 타이머를 감싸요 ----
    let dead = false;
    const _L: [string, any, any][] = [],
      _D: [string, any][] = [],
      _I: number[] = [],
      _T: number[] = [];
    const addEventListener = (t: string, f: any, o?: any) => {
      window.addEventListener(t, f, o);
      _L.push([t, f, o]);
    };
    const docOn = (t: string, f: any) => {
      document.addEventListener(t, f);
      _D.push([t, f]);
    };
    const requestAnimationFrame = (f: FrameRequestCallback) =>
      dead ? 0 : window.requestAnimationFrame(f);
    const setInterval = (f: () => void, t: number) => {
      const id = window.setInterval(f, t);
      _I.push(id);
      return id;
    };
    const setTimeout = (f: () => void, t?: number) => {
      const id = window.setTimeout(() => {
        if (!dead) f();
      }, t);
      _T.push(id);
      return id;
    };

    const $ = (id) => document.getElementById(id);
    const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pad = (n) => String(n).padStart(2, "0");

    /* 화면 전환 막 */
    const cur = $("curtain");
    setTimeout(() => cur.classList.add("open"), RM ? 0 : 450);
    function transition(label, mid) {
      if (RM) {
        mid();
        return;
      }
      $("cLbl").textContent = label;
      cur.classList.remove("open");
      cur.classList.add("close");
      setTimeout(() => {
        mid();
        cur.classList.remove("close");
        cur.classList.add("open");
      }, 1000);
    }

    /* 부드러운 스크롤 (휠) */
    let target = scrollY,
      curY = scrollY,
      raf = 0;
    const smooth = !RM && matchMedia("(pointer:fine)").matches;
    const maxY = () => document.documentElement.scrollHeight - innerHeight;
    function loop() {
      curY += (target - curY) * 0.1;
      if (Math.abs(target - curY) < 0.5) {
        curY = target;
        raf = 0;
        scrollTo(0, curY);
        return;
      }
      scrollTo(0, curY);
      raf = requestAnimationFrame(loop);
    }
    if (smooth) {
      addEventListener(
        "wheel",
        (e) => {
          if (e.ctrlKey || (e.target.closest("#rail") && Math.abs(e.deltaX) > Math.abs(e.deltaY)))
            return;
          e.preventDefault();
          target = Math.max(0, Math.min(maxY(), target + e.deltaY * (e.deltaMode === 1 ? 32 : 1)));
          if (!raf) {
            curY = scrollY;
            raf = requestAnimationFrame(loop);
          }
        },
        { passive: false },
      );
      addEventListener(
        "scroll",
        () => {
          if (!raf) target = curY = scrollY;
        },
        { passive: true },
      );
      addEventListener("keydown", () => {
        cancelAnimationFrame(raf);
        raf = 0;
        target = curY = scrollY;
      });
    }
    function jump(y) {
      target = curY = Math.max(0, Math.min(maxY(), y));
      cancelAnimationFrame(raf);
      raf = 0;
      scrollTo(0, target);
    }

    const LABEL = {
      top: "withus",
      work: "What we do",
      how: "How it works",
      promise: "Our promise",
    };
    docOn("click", (e) => {
      const a = e.target.closest("[data-go]");
      if (a) {
        e.preventDefault();
        const id = a.dataset.go;
        transition(LABEL[id], () =>
          jump(id === "top" ? 0 : $(id).getBoundingClientRect().top + scrollY - 40),
        );
        return;
      }
      const l = e.target.closest("[data-login]");
      if (l) {
        e.preventDefault();
        transition("Log in", () => goRef.current(l.getAttribute("href")));
      }
    });

    /* 줄마다 올라오기 · 카운트 · 그림 */
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );
    document.querySelectorAll(".rv,.fade").forEach((el) => io.observe(el));
    setTimeout(() => document.querySelector(".hero h1").classList.add("in"), RM ? 0 : 700);
    setTimeout(() => $("heroB").classList.add("in"), RM ? 0 : 1100);
    document.body.classList.add("in-art");
    /* B 다이얼 그리기 */
    (function dial() {
      const svg = $("dial");
      if (!svg) return;
      const C = 250,
        R = 200,
        ang = (m) => (m / 1440) * 360 - 90;
      const pt = (m, r) => {
        const a = (ang(m) * Math.PI) / 180;
        return [C + r * Math.cos(a), C + r * Math.sin(a)];
      };
      const arc = (m1, m2, r) => {
        const [x1, y1] = pt(m1, r),
          [x2, y2] = pt(m2, r),
          big = m2 - m1 > 720 ? 1 : 0;
        return `M${x1} ${y1} A${r} ${r} 0 ${big} 1 ${x2} ${y2}`;
      };
      let h = `<circle cx="${C}" cy="${C}" r="${R}" fill="#ffffff"/><path d="${arc(480, 1250, R - 18)}" fill="none" stroke="#cdbcff" stroke-width="36"/>`;
      for (let i = 0; i < 24; i++) {
        const [x1, y1] = pt(i * 60, R - 2),
          [x2, y2] = pt(i * 60, R - (i % 6 ? 8 : 16));
        h += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111111" stroke-width="${i % 6 ? 1 : 2}"/>`;
      }
      [0, 6, 12, 18].forEach((hh) => {
        const [x, y] = pt(hh * 60, R + 26);
        h += `<text class="dial-n" x="${x}" y="${y + 4}" text-anchor="middle">${String(hh).padStart(2, "0")}</text>`;
      });
      [
        [480, "08:00"],
        [1250, "20:50"],
      ].forEach(([m, t]) => {
        const [x, y] = pt(m, R - 60);
        h += `<text class="dial-n" x="${x}" y="${y + 4}" text-anchor="middle" style="fill:#111111">${t}</text>`;
      });
      h += `<g class="dial-hand" id="hand"><line x1="${C}" y1="${C}" x2="${C}" y2="${C - R + 40}" stroke="#111111" stroke-width="4" stroke-linecap="round"/><circle cx="${C}" cy="${C - R + 40}" r="9" fill="#111111"/></g><circle cx="${C}" cy="${C}" r="92" fill="#111111"/>`;
      h += `<text class="dial-big" id="dT" x="${C}" y="${C + 14}" text-anchor="middle" style="fill:#ffffff;font-size:52px">00:00</text><text class="dial-s" id="dS" x="${C}" y="${C + 44}" text-anchor="middle" style="fill:#cdbcff">보낼 수 있어요</text>`;
      svg.innerHTML = h;
      const tick = () => {
        const n = new Date(),
          m = n.getHours() * 60 + n.getMinutes(),
          ok = m >= 480 && m <= 1250;
        $("hand").style.transform = `rotate(${(m / 1440) * 360}deg)`;
        $("dT").textContent =
          `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
        $("dS").textContent = ok ? "보낼 수 있어요" : "쉬는 시간";
      };
      tick();
      setInterval(tick, 15000);
    })();
    /* F 종이비행기 */
    (function planes() {
      const g = $("planes");
      if (!g) return;
      const P =
        '<path d="M0 0 L26 10 L0 20 L6 10 Z" fill="#111111"/><path d="M6 10 L26 10" stroke="#cdbcff" stroke-width="2"/>';
      g.innerHTML = ["t1", "t2", "t3"]
        .map(
          (t, i) =>
            `<g>${P}<animateMotion dur="${4 + i}s" begin="${i * 1.3}s" repeatCount="indefinite" rotate="auto"><mpath href="#${t}"/></animateMotion></g>`,
        )
        .join("");
      let n = 1180;
      const el = $("fCnt");
      const up = () => {
        n += 1 + Math.floor(Math.random() * 3);
        el.textContent = n.toLocaleString("ko-KR");
      };
      up();
      setInterval(up, 1300);
    })();
    /* G 고객 점 무리 */
    (function dots() {
      const cv = $("gCv");
      if (!cv) return;
      const ctx = cv.getContext("2d");
      let W,
        H,
        D = [],
        mx = -999,
        my = -999,
        stage = 0;
      function size() {
        const r = cv.getBoundingClientRect();
        W = r.width;
        H = r.height;
        cv.width = W * devicePixelRatio;
        cv.height = H * devicePixelRatio;
        ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        if (!D.length) seed();
      }
      function seed() {
        const cols = 30,
          rows = 16;
        for (let y = 0; y < rows; y++)
          for (let x = 0; x < cols; x++) {
            const r = Math.random();
            D.push({
              gx: (x + 0.5) / cols,
              gy: (y + 0.5) / rows,
              x: 0,
              y: 0,
              a: r < 0.55,
              b: r < 0.22,
              c: r < 0.128,
            });
          }
      }
      const COUNT = ["10,000", "5,512", "2,207", "1,284"],
        LBL = ["전체 고객", "서울", "+ 한 달째 조용한", "+ 수신 동의 = 보낼 사람"];
      function step() {
        stage = (stage + 1) % 4;
        [...$("gCond").children].forEach((c, i) => c.classList.toggle("on", i < stage));
        $("gN").textContent = COUNT[stage];
        $("gL").textContent = LBL[stage];
      }
      setInterval(step, 2200);
      cv.addEventListener("mousemove", (e) => {
        const r = cv.getBoundingClientRect();
        mx = e.clientX - r.left;
        my = e.clientY - r.top;
      });
      cv.addEventListener("mouseleave", () => {
        mx = my = -999;
      });
      (function f() {
        if (document.body.dataset.hero === "g") {
          ctx.clearRect(0, 0, W, H);
          const top = 60,
            bot = 110,
            h = H - top - bot;
          D.forEach((d) => {
            let tx = d.gx * W,
              ty = top + d.gy * h;
            const on =
              stage === 0 || (stage === 1 && d.a) || (stage === 2 && d.b) || (stage === 3 && d.c);
            const dx = tx - mx,
              dy = ty - my,
              dist = Math.hypot(dx, dy);
            if (dist < 70) {
              tx += (dx / dist) * (70 - dist) * 0.6;
              ty += (dy / dist) * (70 - dist) * 0.6;
            }
            d.x += ((d.x ? tx : tx) - d.x) * 0.15;
            d.y += (ty - d.y) * 0.15;
            ctx.beginPath();
            ctx.arc(d.x, d.y, on && stage ? 6 : 3.4, 0, 7);
            ctx.fillStyle = stage === 0 ? "#111111" : on ? "#cdbcff" : "rgba(17, 17, 17,.18)";
            ctx.fill();
            if (on && stage) {
              ctx.lineWidth = 1.5;
              ctx.strokeStyle = "#111111";
              ctx.stroke();
            }
          });
        }
        requestAnimationFrame(f);
      })();
      addEventListener("resize", size);
      size();
    })();
    /* I 스티커 끌기 */
    document.querySelectorAll(".sk").forEach((el) => {
      let sx,
        sy,
        ox,
        oy,
        on = false;
      el.addEventListener("pointerdown", (e) => {
        on = true;
        el.setPointerCapture(e.pointerId);
        sx = e.clientX;
        sy = e.clientY;
        ox = el.offsetLeft;
        oy = el.offsetTop;
        el.style.zIndex = 9;
      });
      el.addEventListener("pointermove", (e) => {
        if (!on) return;
        el.style.left = ox + e.clientX - sx + "px";
        el.style.top = oy + e.clientY - sy + "px";
        el.style.right = "auto";
        el.style.bottom = "auto";
      });
      el.addEventListener("pointerup", () => {
        on = false;
        el.style.zIndex = "";
      });
    });
    /* ===== 3D 만들기 ===== */
    function face(w, h, tf, cls, html) {
      const d = document.createElement("div");
      d.className = "f3 " + (cls || "");
      d.style.cssText = `width:${w}px;height:${h}px;margin:${-h / 2}px 0 0 ${-w / 2}px;transform:${tf}`;
      if (html) d.innerHTML = html;
      return d;
    }
    function box(w, h, d, c) {
      // c: {front,back,left,right,top,bottom} -> [cls, html]
      const g = document.createElement("div");
      g.className = "f3";
      g.style.cssText = "width:0;height:0";
      const F = {
        front: [w, h, `translateZ(${d / 2}px)`],
        back: [w, h, `rotateY(180deg) translateZ(${d / 2}px)`],
        right: [d, h, `rotateY(90deg) translateZ(${w / 2}px)`],
        left: [d, h, `rotateY(-90deg) translateZ(${w / 2}px)`],
        top: [w, d, `rotateX(90deg) translateZ(${h / 2}px)`],
        bottom: [w, d, `rotateX(-90deg) translateZ(${h / 2}px)`],
      };
      Object.keys(F).forEach((k) => {
        if (c[k]) g.appendChild(face(F[k][0], F[k][1], F[k][2], c[k][0], c[k][1]));
      });
      return g;
    }
    function spinner(stageId, objId, base, auto, sway) {
      const st = $(stageId),
        o = $(objId);
      let rx = base[0],
        ry = base[1],
        vx = 0,
        vy = auto,
        drag = false,
        px,
        py;
      st.addEventListener("pointerdown", (e) => {
        drag = true;
        px = e.clientX;
        py = e.clientY;
        st.setPointerCapture(e.pointerId);
      });
      st.addEventListener("pointermove", (e) => {
        if (!drag) return;
        vy = (e.clientX - px) * 0.4;
        vx = -(e.clientY - py) * 0.3;
        px = e.clientX;
        py = e.clientY;
        ry += vy;
        rx = Math.max(-60, Math.min(60, rx + vx));
      });
      st.addEventListener("pointerup", () => {
        drag = false;
      });
      (function f(t) {
        if (!drag) {
          if (sway) {
            ry += (base[1] + Math.sin((t || 0) / 1400) * sway - ry) * 0.04;
          } else {
            vy += (auto - vy) * 0.03;
            ry += vy;
          }
          rx += (base[0] - rx) * 0.03;
        }
        o.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
        requestAnimationFrame(f);
      })();
    }
    /* K 쿠폰 카드 */
    (function () {
      const o = $("o3k");
      if (!o) return;
      const W = 340,
        H = 480,
        D = 18;
      o.appendChild(
        box(W, H, D, {
          front: [
            "k-front",
            '<div class="t"><span>COUPON</span><span>재방문</span></div><div><p class="v">20<small>%</small></p><p style="font-size:15px;margin-top:14px">최대 10,000원 할인</p></div><div class="b"><span>하은님</span><span>~ 11.06</span></div>',
          ],
          back: ["k-back", '<p class="lg">withus</p><div class="bc"></div><p>WU7K3PQ9</p>'],
          left: ["k-edge"],
          right: ["k-edge"],
          top: ["k-edge v"],
          bottom: ["k-edge v"],
        }),
      );
      o.querySelectorAll(".k-front,.k-back").forEach((e) => (e.style.borderRadius = "20px"));
      spinner("s3k", "o3k", [-8, -24], 0.35);
    })();
    /* J 봉투 + 튀어나오는 편지 */
    (function () {
      const o = $("o3j");
      if (!o) return;
      const W = 440,
        H = 290;
      o.appendChild(face(W, H, "translateZ(-14px)", "j-back"));
      o.appendChild(face(W, H, "rotateY(180deg) translateZ(14px)", "j-back"));
      o.appendChild(face(28, H, `rotateY(90deg) translateZ(${W / 2}px)`, "j-side"));
      o.appendChild(face(28, H, `rotateY(-90deg) translateZ(${W / 2}px)`, "j-side"));
      const L = face(
        W - 50,
        H - 30,
        "translateZ(-2px) translateY(0px)",
        "j-letter",
        '<p class="k">WITHUS · 재방문</p><h5>하은님, 다시 와줘서<br>고마워요</h5><span class="cp">20% 쿠폰</span>',
      );
      o.appendChild(L);
      o.appendChild(face(W, H, "translateZ(12px)", "j-pocket"));
      const fl = face(W, ((H * 0.62) / 0.62) * 0.62, "", "j-flap");
      fl.style.height = H + "px";
      fl.style.marginTop = -H / 2 + "px";
      o.appendChild(fl);
      const seal = document.createElement("div");
      seal.className = "j-seal";
      seal.textContent = "w.";
      seal.style.transform = "translateZ(14px) translateY(30px)";
      o.appendChild(seal);
      let t0 = performance.now();
      (function f(t) {
        const p = ((t - t0) / 6000) % 1,
          e = (x) => (x < 0 ? 0 : x > 1 ? 1 : 1 - Math.pow(1 - x, 3));
        const open = p < 0.5 ? e((p - 0.05) / 0.2) : 1 - e((p - 0.8) / 0.15);
        const rise = p < 0.6 ? e((p - 0.25) / 0.25) : 1 - e((p - 0.68) / 0.14);
        fl.style.transform = `translateZ(13px) rotateX(${open * 172}deg)`;
        fl.style.zIndex = open > 0.5 ? 0 : 3;
        seal.style.opacity = 1 - open * 1.4;
        L.style.transform = `translateZ(${rise > 0.05 ? 1 : -2}px) translateY(${-rise * 190}px)`;
        requestAnimationFrame(f);
      })(t0);
      spinner("s3j", "o3j", [-12, -14], 0, 22);
    })();
    /* L 블록 쌓기 */
    (function () {
      const o = $("o3l");
      if (!o) return;
      const S = 230,
        T = 64;
      const rows = [
        ["REPORTS", "리포트", "#cdbcff", "#b6a2f5", "#a48ef0", "#111111"],
        ["CAMPAIGNS", "캠페인 · 자동 흐름", "#ffffff", "#f1f0eb", "#e4e1d8", "#111111"],
        ["SEGMENTS", "세그먼트", "#2c3852", "#22304a", "#1a263c", "#ffffff"],
        ["CUSTOMERS", "고객 1만 명", "#111111", "#000000", "#000000", "#cdbcff"],
      ];
      const slabs = rows.map((r, i) => {
        const b = box(S, T, S, {
          top: ["l-top", r[0]],
          front: ["l-front", r[1]],
          right: ["l-right", String(i + 1).padStart(2, "0")],
          left: [""],
          back: [""],
          bottom: [""],
        });
        b.querySelectorAll(".f3").forEach((fc) => {
          fc.style.background = r[3];
          fc.style.color = r[5];
        });
        b.querySelector(".l-top").style.background = r[2];
        b.querySelector(".l-right").style.background = r[4];
        o.appendChild(b);
        return b;
      });
      const t0 = performance.now();
      (function f(t) {
        const k = (Math.sin((t - t0) / 900) + 1) / 2;
        slabs.forEach((b, i) => {
          b.style.transform = `translateY(${(i - 1.5) * (T + 10 + k * 34)}px)`;
        });
        requestAnimationFrame(f);
      })(t0);
      spinner("s3l", "o3l", [-28, 45], 0.22);
    })();
    /* D 마우스 따라 기울기 */
    if (matchMedia("(pointer:fine)").matches && !RM)
      addEventListener("mousemove", (e) => {
        const s = $("scr");
        if (!s || document.body.dataset.hero !== "d") return;
        const x = e.clientX / innerWidth - 0.5,
          y = e.clientY / innerHeight - 0.5;
        s.style.transform = `rotateY(${-14 + x * 10}deg) rotateX(${6 - y * 8}deg) rotate(-1deg)`;
      });
    function countUp(el) {
      const to = +el.dataset.count,
        t0 = performance.now(),
        d = 1400;
      (function f(t) {
        const p = Math.min(1, (t - t0) / d);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 4))).toLocaleString("ko-KR");
        if (p < 1) requestAnimationFrame(f);
      })(t0);
    }
    const AI =
      "열람은 지난주보다 3.4%p 늘었어요. 저녁 7시에 보낸 메일 반응이 제일 좋았고, 쿠폰은 30대가 가장 많이 썼어요.";
    function typeAI() {
      const el = $("aiTx");
      let i = 0;
      (function f() {
        el.textContent = AI.slice(0, i++);
        if (i <= AI.length) setTimeout(f, RM ? 0 : 26);
      })();
    }
    const vo = new IntersectionObserver(
      (es) =>
        es.forEach((en) => {
          if (!en.isIntersecting) return;
          const v = en.target;
          v.classList.add("on");
          vo.unobserve(v);
          v.querySelectorAll("[data-count]").forEach((c, i) =>
            setTimeout(() => countUp(c), 300 + i * 120),
          );
          if (v.querySelector("#aiTx")) setTimeout(typeAI, 900);
        }),
      { threshold: 0.35 },
    );
    document.querySelectorAll("[data-vis]").forEach((v) => vo.observe(v));

    /* 발송 가능 시계 */
    function clock() {
      const n = new Date(),
        m = n.getHours() * 60 + n.getMinutes(),
        ok = m >= 480 && m <= 1250;
      $("clk").textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}`;
      const st = $("clkSt");
      st.className = ok ? "on" : "off";
      st.textContent = ok ? "지금 보낼 수 있어요" : "지금은 쉬는 시간";
      const left = ok ? 1250 - m : m < 480 ? 480 - m : 1440 - m + 480,
        h = Math.floor(left / 60),
        mm = left % 60;
      $("clkTx").textContent = ok
        ? `광고 마감 20:50까지 ${h ? h + "시간 " : ""}${mm}분`
        : `아침 8시에 다시 열려요 · ${h ? h + "시간 " : ""}${mm}분 뒤`;
    }
    clock();
    setInterval(clock, 15000);

    /* How it works — 옆으로 밀기 (끌기 · 화살표 · 키보드 · 터치) */
    const rail = $("rail"),
      steps = [...rail.children];
    const stepW = () => steps[0].getBoundingClientRect().width + 24;
    function idx() {
      return Math.min(steps.length - 1, Math.round(rail.scrollLeft / stepW()));
    }
    function sync() {
      const max = rail.scrollWidth - rail.clientWidth,
        i = rail.scrollLeft > max - 4 ? steps.length - 1 : idx();
      $("pg").textContent = `${i + 1} / ${steps.length}`;
      $("prev").disabled = rail.scrollLeft < 4;
      $("next").disabled = rail.scrollLeft > max - 4;
      const vis = rail.clientWidth / rail.scrollWidth,
        p = max ? rail.scrollLeft / max : 0;
      $("progI").style.width = vis * 100 + "%";
      $("progI").style.transform = `translateX(${p * (1 / vis - 1) * 100}%)`;
    }
    function go(d) {
      rail.scrollBy({ left: d * stepW(), behavior: RM ? "auto" : "smooth" });
    }
    $("prev").onclick = () => go(-1);
    $("next").onclick = () => go(1);
    rail.addEventListener("scroll", sync, { passive: true });
    addEventListener("resize", sync);
    sync();
    rail.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
    });
    let down = false,
      sx = 0,
      sl = 0,
      moved = 0;
    rail.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      down = true;
      moved = 0;
      sx = e.clientX;
      sl = rail.scrollLeft;
    });
    addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - sx;
      moved = Math.abs(dx);
      if (moved > 4) rail.classList.add("drag");
      rail.scrollLeft = sl - dx;
    });
    addEventListener("pointerup", () => {
      if (!down) return;
      down = false;
      rail.classList.remove("drag");
      const i = idx();
      rail.scrollTo({ left: i * stepW(), behavior: "smooth" });
    });

    /* 스크롤 연동: 헤더 · 마키 · 카드 */
    const hd = $("hd"),
      mq = $("mq"),
      cards = [...document.querySelectorAll("[data-card]")];
    let lastY = scrollY,
      mqX = 0,
      vel = 0;
    (function frame() {
      const y = scrollY,
        dy = y - lastY;
      lastY = y;
      hd.classList.toggle("solid", y > 40);
      if (y > 500 && dy > 2) hd.classList.add("hide");
      else if (dy < -2 || y < 500) hd.classList.remove("hide");
      vel += (dy - vel) * 0.1;
      mqX -= 0.7 + Math.abs(vel) * 0.4;
      const half = mq.scrollWidth / 2;
      if (-mqX > half) mqX += half;
      mq.style.transform = `translate3d(${mqX}px,0,0)`;
      if (innerWidth > 1080)
        cards.forEach((c, i) => {
          const nx = cards[i + 1];
          if (!nx) return;
          const r = nx.getBoundingClientRect(),
            p = Math.min(1, Math.max(0, 1 - (r.top - 160) / innerHeight));
          c.style.transform = `scale(${1 - p * 0.05})`;
          c.style.filter = `brightness(${1 - p * 0.06})`;
          c.style.setProperty("--cover", Math.max(0, (p - 0.55) / 0.45).toFixed(3));
        });
      requestAnimationFrame(frame);
    })();

    /* 커서 · 자석 버튼 */
    const dot = $("dot");
    if (matchMedia("(pointer:fine)").matches && !RM) {
      let dx = 0,
        dy = 0,
        tx = 0,
        ty = 0;
      addEventListener("mousemove", (e) => {
        tx = e.clientX;
        ty = e.clientY;
        dot.style.opacity = 1;
      });
      (function f() {
        dx += (tx - dx) * 0.2;
        dy += (ty - dy) * 0.2;
        dot.style.transform = `translate3d(${dx}px,${dy}px,0)`;
        requestAnimationFrame(f);
      })();
      document.querySelectorAll("a,button,.rule,.step").forEach((el) => {
        el.addEventListener("mouseenter", () => dot.classList.add("big"));
        el.addEventListener("mouseleave", () => dot.classList.remove("big"));
      });
      document.querySelectorAll(".mag").forEach((b) => {
        b.addEventListener("mousemove", (e) => {
          const r = b.getBoundingClientRect();
          b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px,${(e.clientY - r.top - r.height / 2) * 0.32}px)`;
        });
        b.addEventListener("mouseleave", () => {
          b.style.transition = "transform .5s cubic-bezier(.16,1,.3,1),background .25s,color .25s";
          b.style.transform = "";
          setTimeout(() => (b.style.transition = ""), 500);
        });
      });
    }
    function toast(m) {
      const t = $("toast");
      t.textContent = m;
      t.classList.add("on");
      clearTimeout(toast.t);
      toast.t = setTimeout(() => t.classList.remove("on"), 2200);
    }

    return () => {
      dead = true;
      _L.forEach(([t, f, o]) => window.removeEventListener(t, f, o));
      _D.forEach(([t, f]) => document.removeEventListener(t, f));
      _I.forEach(clearInterval);
      _T.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="wu-landing" data-hero="none">
      <div className="curtain" id="curtain" aria-hidden="true">
        <i></i>
        <i></i>
        <i></i>
        <i></i>
        <i></i>
        <span className="cl" id="cLbl">
          withus
        </span>
      </div>
      <div className="dot" id="dot" aria-hidden="true"></div>

      <header className="hd" id="hd">
        <a href="#top" className="logo" data-go="top" aria-label="withus 처음으로">
          with<span>us</span>
        </a>
        <nav aria-label="주요 메뉴">
          <a href="#work" data-go="work">
            <span>What we do</span>
            <span>What we do</span>
          </a>
          <a href="#how" data-go="how">
            <span>How it works</span>
            <span>How it works</span>
          </a>
          <a href="#promise" data-go="promise">
            <span>Our promise</span>
            <span>Our promise</span>
          </a>
        </nav>
        <a href="/login" className="cta mag" data-login>
          로그인 <span className="ar">→</span>
        </a>
      </header>

      <main>
        {/* ============ HERO ============ */}
        <section className="hero" id="top">
          <div className="hero-top">
            <h1 className="rv" aria-label="Send it when it matters.">
              <span className="ln">
                <span>Send it</span>
              </span>
              <span className="ln ind">
                <span>
                  <span className="o">when</span> it
                </span>
              </span>
              <span className="ln">
                <span>
                  <span className="mark">matters.</span>
                </span>
              </span>
            </h1>
          </div>
          <div className="hero-b fade" id="heroB">
            <p>
              명단 정리부터 쿠폰 발송, 결과 확인까지.
              <br />
              마케터 혼자서도 다 할 수 있게 만든 도구예요.
            </p>
            <div className="clock" aria-live="off">
              <span className="t" id="clk">
                12:00
              </span>
              <span className="s">
                <b className="on" id="clkSt">
                  지금 보낼 수 있어요
                </b>
                <small id="clkTx">광고는 08:00–20:50에만 나가요</small>
              </span>
            </div>
            <a href="#work" className="cta ghost lg mag" data-go="work">
              둘러보기 <span className="ar">↓</span>
            </a>
          </div>
        </section>

        <div className="mq" aria-hidden="true">
          <div className="mq-in" id="mq">
            <span>Customers</span>
            <span>Segments</span>
            <span>Templates</span>
            <span>Campaigns</span>
            <span>Workflows</span>
            <span>Coupons</span>
            <span>Reports</span>
            <span>Customers</span>
            <span>Segments</span>
            <span>Templates</span>
            <span>Campaigns</span>
            <span>Workflows</span>
            <span>Coupons</span>
            <span>Reports</span>
          </div>
        </div>

        {/* ============ WHAT WE DO ============ */}
        <section className="sec" id="work">
          <div className="sh rv">
            <h2>
              <span className="ln">
                <span>What</span>
              </span>
              <span className="ln">
                <span>we do</span>
              </span>
            </h2>
            <p className="side">
              <span className="lbl">01 / 03</span>모으고, 보내고, 확인하는 일. withus가 하는 건 이
              세 가지가 전부예요.
            </p>
          </div>

          <div className="stack">
            <article className="card" data-card>
              <div>
                <div className="top">
                  <span className="no">
                    <b>01</b>Collect
                  </span>
                </div>
                <h3 className="rv">
                  <span className="ln">
                    <span>Collect</span>
                  </span>
                </h3>
                <h4>엑셀 한 번이면 명단 정리 끝</h4>
                <p className="d">
                  파일을 끌어다 놓으면 한 번에 1만 줄까지 들어가요. 전화번호가 빠졌거나 형식이 틀린
                  줄은 몇 번째 줄인지 바로 알려 줘요.
                </p>
                <dl>
                  <div>
                    <dt>나누는 기준</dt>
                    <dd>지역 · 나이 · 가입일 · 누적 구매액 · 수신 동의 · 휴면</dd>
                  </div>
                  <div>
                    <dt>조건 잇기</dt>
                    <dd>그리고 / 또는</dd>
                  </div>
                </dl>
              </div>
              <div className="vis" data-vis>
                <div className="v1">
                  <div className="up">
                    <span className="f">10월_고객명단.xlsx</span>
                    <span className="bar">
                      <i></i>
                    </span>
                    <b data-count="10000">0</b>
                  </div>
                  <p className="sent">
                    <span className="chip">서울</span>에 살고{" "}
                    <span className="chip">한 달째 조용한</span>
                    <span className="chip op">그리고</span>{" "}
                    <span className="chip">수신 동의한</span> 사람
                  </p>
                  <div className="res">
                    <span>보낼 사람</span>
                    <b data-count="1284">0</b>
                  </div>
                </div>
              </div>
            </article>

            <article className="card" data-card>
              <div>
                <div className="top">
                  <span className="no">
                    <b>02</b>Send
                  </span>
                </div>
                <h3 className="rv">
                  <span className="ln">
                    <span>Send</span>
                  </span>
                </h3>
                <h4>규칙 하나로 알아서 나가게</h4>
                <p className="d">
                  “사고 나서 3일 뒤, 메일을 안 열었으면 문자로.” 이런 규칙을 한 번 만들어 두면 매번
                  날짜를 고를 필요가 없어요.
                </p>
                <dl>
                  <div>
                    <dt>문구</dt>
                    <dd>템플릿에 이름 자동 넣기 · AI 초안 3개</dd>
                  </div>
                  <div>
                    <dt>자동 흐름</dt>
                    <dd>갈림길 2번까지 · 단계 15개까지</dd>
                  </div>
                  <div>
                    <dt>보낼 시간</dt>
                    <dd>AI가 반응 좋은 시간을 추천</dd>
                  </div>
                </dl>
              </div>
              <div className="vis" data-vis>
                <div className="v2">
                  <svg
                    viewBox="0 0 560 320"
                    role="img"
                    aria-label="자동 흐름 예시: 구매 후 3일, 메일을 열었으면 쿠폰 메일, 안 열었으면 문자"
                  >
                    <path className="ed" d="M280 62 V108" />
                    <path className="ed" d="M280 156 C280 190 140 180 140 220" />
                    <path className="ed" d="M280 156 C280 190 420 180 420 220" />
                    <g className="nd start">
                      <rect x="180" y="12" width="200" height="50" rx="12" />
                      <text x="280" y="35" textAnchor="middle">
                        구매 완료
                      </text>
                      <text className="s" x="280" y="53" textAnchor="middle">
                        1,284명
                      </text>
                    </g>
                    <g className="nd" style={{ transitionDelay: ".3s" }}>
                      <rect x="180" y="108" width="200" height="48" rx="12" />
                      <text x="280" y="130" textAnchor="middle">
                        3일 기다리기
                      </text>
                      <text className="s" x="280" y="147" textAnchor="middle">
                        추천 시간 · 저녁 7시
                      </text>
                    </g>
                    <g className="nd send" style={{ transitionDelay: ".6s" }}>
                      <rect x="40" y="220" width="200" height="58" rx="12" />
                      <text x="140" y="245" textAnchor="middle">
                        메일 · 재방문 쿠폰
                      </text>
                      <text
                        className="s"
                        x="140"
                        y="264"
                        textAnchor="middle"
                        style={{ fill: "#2c3852" }}
                      >
                        지난 메일을 열었으면
                      </text>
                    </g>
                    <g className="nd send" style={{ transitionDelay: ".75s" }}>
                      <rect x="320" y="220" width="200" height="58" rx="12" />
                      <text x="420" y="245" textAnchor="middle">
                        문자 · 안부
                      </text>
                      <text
                        className="s"
                        x="420"
                        y="264"
                        textAnchor="middle"
                        style={{ fill: "#2c3852" }}
                      >
                        안 열었으면
                      </text>
                    </g>
                    <circle className="pulse" r="6">
                      <animateMotion
                        dur="3.2s"
                        repeatCount="indefinite"
                        path="M280 62 V108 V156 C280 190 140 180 140 220"
                      />
                    </circle>
                  </svg>
                  <p className="tip">광고 시간(08:00–20:50)을 넘기면 다음 날 아침으로 미뤄져요.</p>
                </div>
              </div>
            </article>

            <article className="card" data-card>
              <div>
                <div className="top">
                  <span className="no">
                    <b>03</b>Report
                  </span>
                </div>
                <h3 className="rv">
                  <span className="ln">
                    <span>Report</span>
                  </span>
                </h3>
                <h4>숫자가 많으면 세 줄로</h4>
                <p className="d">
                  몇 명이 열고, 누르고, 쿠폰을 썼는지 한 화면에 보여 줘요. 읽을 시간이 없을 땐 AI
                  요약만 봐도 돼요.
                </p>
                <dl>
                  <div>
                    <dt>보는 순서</dt>
                    <dd>발송 → 도착 → 열람 → 클릭 → 구매</dd>
                  </div>
                  <div>
                    <dt>쿠폰</dt>
                    <dd>금액 할인 · 비율 할인(최대 금액 설정)</dd>
                  </div>
                </dl>
              </div>
              <div className="vis" data-vis>
                <div className="v3">
                  <div className="fn">
                    <div>
                      <span>발송</span>
                      <i style={{ "--w": "1" }}></i>
                      <b data-count="12480">0</b>
                    </div>
                    <div>
                      <span>도착</span>
                      <i style={{ "--w": ".97" }}></i>
                      <b data-count="12106">0</b>
                    </div>
                    <div>
                      <span>열람</span>
                      <i style={{ "--w": ".41" }}></i>
                      <b data-count="5120">0</b>
                    </div>
                    <div>
                      <span>클릭</span>
                      <i style={{ "--w": ".13" }}></i>
                      <b data-count="1597">0</b>
                    </div>
                    <div>
                      <span>구매</span>
                      <i style={{ "--w": ".064" }}></i>
                      <b data-count="799">0</b>
                    </div>
                  </div>
                  <div className="ai">
                    <small>AI 요약</small>
                    <br />
                    <span id="aiTx"></span>
                    <span className="cur"></span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* ============ HOW IT WORKS : 옆으로 밀기 ============ */}
        <section className="sec how" id="how">
          <div className="sh rv">
            <h2>
              <span className="ln">
                <span>How it</span>
              </span>
              <span className="ln">
                <span>works</span>
              </span>
            </h2>
            <div className="ctrl">
              <button type="button" id="prev" aria-label="이전 단계">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span className="pg" id="pg">
                1 / 5
              </span>
              <button type="button" id="next" aria-label="다음 단계">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>
          <div
            className="rail"
            id="rail"
            tabIndex="0"
            aria-label="사용 순서 다섯 단계, 옆으로 밀어 보세요"
          >
            <article className="step">
              <span className="step-n">01</span>
              <div>
                <h3>Upload</h3>
                <h4>명단 올리기</h4>
                <p>엑셀이나 CSV를 끌어다 놓아요. 틀린 줄만 따로 모아 보여 줘요.</p>
                <span className="tg">고객</span>
              </div>
            </article>
            <article className="step">
              <span className="step-n">02</span>
              <div>
                <h3>Pick</h3>
                <h4>받을 사람 고르기</h4>
                <p>“서울에 사는, 한 달째 조용한” 처럼 조건을 이어 붙여요.</p>
                <span className="tg">세그먼트</span>
              </div>
            </article>
            <article className="step">
              <span className="step-n">03</span>
              <div>
                <h3>Write</h3>
                <h4>문구 쓰기</h4>
                <p>템플릿에서 고르거나 AI 초안으로 시작해요. 나한테 먼저 보내 볼 수 있어요.</p>
                <span className="tg">템플릿</span>
              </div>
            </article>
            <article className="step">
              <span className="step-n">04</span>
              <div>
                <h3>Send</h3>
                <h4>보내기</h4>
                <p>지금 한 번 보내거나, 규칙을 켜 두고 잊어버려도 돼요.</p>
                <span className="tg">캠페인 · 자동 흐름 · 쿠폰</span>
              </div>
            </article>
            <article className="step last">
              <span className="step-n">05</span>
              <div>
                <h3>Check</h3>
                <h4>결과 보기</h4>
                <p>열람 · 클릭 · 쿠폰 사용까지. 대시보드는 10초마다 새로 고쳐져요.</p>
                <span className="tg">대시보드 · 리포트</span>
              </div>
            </article>
          </div>
          <div className="prog" aria-hidden="true">
            <i id="progI"></i>
          </div>
        </section>

        {/* ============ OUR PROMISE ============ */}
        <section className="sec" id="promise">
          <div className="sh rv">
            <h2>
              <span className="ln">
                <span>Our</span>
              </span>
              <span className="ln">
                <span>promise</span>
              </span>
            </h2>
            <p className="side">
              <span className="lbl">받는 사람 입장에서</span>보내는 쪽이 편하자고 받는 사람을 귀찮게
              하지 않아요.
            </p>
          </div>
          <div className="rules">
            <div className="rule fade">
              <span className="n">01</span>
              <h3>
                광고는 <span className="en mark">08:00–20:50</span>
              </h3>
              <p>
                밤늦게나 새벽에는 광고를 보내지 않아요. 시간을 넘긴 발송은 다음 날 아침으로
                미뤄져요.
              </p>
            </div>
            <div className="rule fade">
              <span className="n">02</span>
              <h3>
                그만 받기는 <span className="mark">링크 한 번</span>
              </h3>
              <p>
                모든 메일과 문자 끝에 수신 거부 링크가 붙어요. 이메일과 문자를 따로 끌 수도 있어요.
              </p>
            </div>
            <div className="rule fade">
              <span className="n">03</span>
              <h3>
                쿠폰은 <span className="mark">한 장에 한 번</span>
              </h3>
              <p>한 번 쓴 쿠폰은 다시 쓸 수 없고, 언제 썼는지 기록이 남아요.</p>
            </div>
          </div>
        </section>

        {/* ============ END ============ */}
        <section className="end">
          <h2 className="rv">
            <span className="ln">
              <span>Ready</span>
            </span>
            <span className="ln">
              <span>
                when <span className="y">you are.</span>
              </span>
            </span>
          </h2>
          <div className="row fade">
            <a href="/login" className="cta lg mag" data-login>
              로그인하기 <span className="ar">→</span>
            </a>
            <p>계정은 우리 조직 관리자(OWNER)가 만들어 줘요.</p>
          </div>
          <footer className="ft">
            <span>© 2026 withus</span>
            <span>[회사 이름] · [문의 메일]</span>
          </footer>
        </section>
      </main>

      <div className="toast" id="toast" role="status"></div>
    </div>
  );
}
