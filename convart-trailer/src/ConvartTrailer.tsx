import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { POPPINS } from "./convart-fonts";

// Poppins (ConvArt's site font), inlined as data URLs so rendering works offline
const fontFamily = "ConvartPoppins";
const FONT_CSS = Object.entries(POPPINS)
  .map(
    ([w, url]) =>
      `@font-face{font-family:${fontFamily};font-weight:${w};font-style:normal;font-display:block;src:url(${url}) format("woff2");}`
  )
  .join("\n");

// ConvArt brand palette (from convart.in)
const C = "#00E5FF";
const M = "#FF00CC";
const Y = "#FFE500";
const INK = "#0A0A0A";
const CMYK = [C, M, Y];

const f = (p: string) => staticFile(`convart/${p}`);

type Scene = {
  from: number;
  dur: number;
  src: string;
};

// Cut list (frames @30fps)
const SCENES: Scene[] = [
  { from: 0, dur: 105, src: "a_tile.mp4" },
  { from: 105, dur: 168, src: "b_build.mp4" },
  { from: 273, dur: 153, src: "c_snap.mp4" },
  { from: 426, dur: 182, src: "d_swap.mp4" },
  { from: 608, dur: 136, src: "e_hand.mp4" },
];
const TOUR_FROM = 744;
const END_FROM = 1340;
const TOTAL = 1500;

// ---------------------------------------------------------------------------
// Footage with slow push-in
// ---------------------------------------------------------------------------
const Footage: React.FC<{ src: string; dur: number }> = ({ src, dur }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, dur], [1.0, 1.07]);
  return (
    <AbsoluteFill style={{ transform: `scale(${scale})` }}>
      <OffthreadVideo src={f(src)} muted />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// CMYK block wipe — "block by block" transition centred on a cut
// ---------------------------------------------------------------------------
const BlockWipe: React.FC = () => {
  const frame = useCurrentFrame(); // 0..16, cut happens at 8
  const cols = 4;
  const rows = 7;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const order = (r + c) * 0.55;
      const inT = interpolate(frame - order, [0, 4], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      const outT = interpolate(frame - 8 - order, [0, 4], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      const s = inT * (1 - outT);
      cells.push(
        <div
          key={`${r}-${c}`}
          style={{
            position: "absolute",
            left: (c * 1080) / cols,
            top: (r * 1920) / rows,
            width: 1080 / cols + 1,
            height: 1920 / rows + 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              background: (r + c) % 4 === 3 ? INK : CMYK[(r * 2 + c) % 3],
              transform: `scale(${s})`,
            }}
          />
        </div>
      );
    }
  }
  return <AbsoluteFill>{cells}</AbsoluteFill>;
};

// ---------------------------------------------------------------------------
// Kinetic headline: two lines, second word highlighted with a colour block
// ---------------------------------------------------------------------------
const Headline: React.FC<{
  top: string;
  bottom: string;
  color: string;
  delay?: number;
  dur: number;
  y?: number;
}> = ({ top, bottom, color, delay = 0, dur, y = 1480 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s1 = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 160 } });
  const s2 = spring({ frame: frame - delay - 7, fps, config: { damping: 14, stiffness: 160 } });
  const bar = spring({ frame: frame - delay - 10, fps, config: { damping: 18, stiffness: 120 } });
  const out = interpolate(frame, [dur - 10, dur - 2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
        fontFamily,
        opacity: 1 - out,
        transform: `translateY(${out * -40}px)`,
      }}
    >
      <div style={{ overflow: "hidden", padding: "0 10px" }}>
        <div
          style={{
            background: INK,
            color: "white",
            fontWeight: 800,
            fontSize: 92,
            letterSpacing: -2,
            padding: "6px 34px 10px",
            transform: `translateY(${(1 - s1) * 140}%)`,
            lineHeight: 1.1,
          }}
        >
          {top}
        </div>
      </div>
      <div style={{ position: "relative", overflow: "hidden", padding: "0 10px" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            margin: "0 10px",
            background: color,
            transform: `scaleX(${bar})`,
            transformOrigin: "left",
          }}
        />
        <div
          style={{
            position: "relative",
            color: INK,
            fontWeight: 900,
            fontSize: 100,
            letterSpacing: -3,
            padding: "4px 38px 12px",
            transform: `translateY(${(1 - s2) * 140}%)`,
            lineHeight: 1.1,
          }}
        >
          {bottom}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// "No nails / no drilling / no damage" checklist
// ---------------------------------------------------------------------------
const Checklist: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = ["NO NAILS", "NO DRILLING", "NO DAMAGE"];
  const out = interpolate(frame, [dur - 10, dur - 2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 1180,
        left: 90,
        display: "flex",
        flexDirection: "column",
        gap: 26,
        fontFamily,
        opacity: 1 - out,
      }}
    >
      {items.map((t, i) => {
        const s = spring({ frame: frame - 6 - i * 22, fps, config: { damping: 13, stiffness: 170 } });
        return (
          <div
            key={t}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 26,
              transform: `translateX(${(1 - s) * -700}px)`,
            }}
          >
            <div
              style={{
                width: 96,
                height: 96,
                background: CMYK[i],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 64,
                fontWeight: 900,
                color: INK,
                transform: `rotate(${(1 - s) * -90}deg)`,
              }}
            >
              ✓
            </div>
            <div
              style={{
                background: INK,
                color: "white",
                fontWeight: 800,
                fontSize: 78,
                letterSpacing: -1.5,
                padding: "4px 30px 8px",
              }}
            >
              {t}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Brand badge shown over the footage
// ---------------------------------------------------------------------------
const Badge: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [8, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        top: 90,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: o,
      }}
    >
      <div
        style={{
          background: "rgba(10,10,10,0.88)",
          borderRadius: 999,
          padding: "10px 34px 10px 18px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily,
          color: "white",
          fontWeight: 700,
          fontSize: 30,
          letterSpacing: 6,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {CMYK.map((c) => (
            <div key={c} style={{ width: 16, height: 16, background: c }} />
          ))}
        </div>
        <span style={{ marginLeft: 8 }}>CONVART · NOW LIVE</span>
      </div>
    </div>
  );
};

// Thin CMYK progress bar along the bottom
const Progress: React.FC = () => {
  const frame = useCurrentFrame();
  const p = frame / TOUR_FROM;
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, height: 12, width: `${p * 100}%`, display: "flex" }}>
      {CMYK.map((c) => (
        <div key={c} style={{ flex: 1, background: c }} />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// End card
// ---------------------------------------------------------------------------
const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = spring({ frame, fps, config: { damping: 16, stiffness: 90 } });
  const logo = spring({ frame: frame - 14, fps, config: { damping: 12, stiffness: 110 } });
  const tag = spring({ frame: frame - 30, fps, config: { damping: 16, stiffness: 120 } });
  const url = spring({ frame: frame - 62, fps, config: { damping: 12, stiffness: 140 } });
  const glow = 0.6 + 0.4 * Math.sin(frame / 6);

  const cardScale = interpolate(card, [0, 1], [1.9, 1]);
  const cardY = interpolate(card, [0, 1], [0, -380]);

  return (
    <AbsoluteFill style={{ background: INK, fontFamily }}>
      {/* drifting CMYK blocks */}
      {Array.from({ length: 14 }).map((_, i) => {
        const x = (i * 263) % 1080;
        const y0 = (i * 431) % 1920;
        const size = 40 + ((i * 37) % 70);
        const y = (y0 - frame * (1.2 + (i % 4) * 0.6) + 1920) % 1920;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              background: CMYK[i % 3],
              opacity: 0.16,
              transform: `rotate(${frame * (i % 2 ? 0.6 : -0.6)}deg)`,
            }}
          />
        );
      })}

      {/* hero artwork card */}
      <div
        style={{
          position: "absolute",
          left: 340,
          top: 530,
          width: 400,
          height: 711,
          overflow: "hidden",
          borderRadius: 24,
          transform: `translateY(${cardY}px) scale(${cardScale})`,
          boxShadow: `0 0 0 6px ${INK}, 0 0 0 12px ${M}, 0 30px 80px rgba(0,0,0,0.6)`,
        }}
      >
        <OffthreadVideo
          src={f("f_hero.mp4")}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.55)" }}
        />
      </div>

      {/* logo */}
      <div
        style={{
          position: "absolute",
          top: 930,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: logo,
          transform: `scale(${interpolate(logo, [0, 1], [0.6, 1])})`,
        }}
      >
        <Img src={f("logo_1200.png")} style={{ width: 560, height: 560, margin: "-110px 0" }} />
      </div>

      {/* tagline */}
      <div
        style={{
          position: "absolute",
          top: 1400,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "white",
          fontWeight: 700,
          fontSize: 54,
          lineHeight: 1.25,
          opacity: tag,
          transform: `translateY(${(1 - tag) * 40}px)`,
        }}
      >
        Custom Art, Built <span style={{ color: M }}>Block by Block</span>
        <div style={{ color: Y, fontSize: 40, fontWeight: 600, marginTop: 10, letterSpacing: 2 }}>
          NO NAILS · NO LIMITS
        </div>
      </div>

      {/* URL pill */}
      <div
        style={{
          position: "absolute",
          top: 1630,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          transform: `scale(${url})`,
        }}
      >
        <div
          style={{
            border: `4px solid ${C}`,
            color: C,
            borderRadius: 999,
            padding: "16px 56px 20px",
            fontSize: 60,
            fontWeight: 800,
            letterSpacing: 1,
            textShadow: `0 0 ${18 * glow}px ${C}`,
            boxShadow: `0 0 ${36 * glow}px rgba(0,229,255,0.55), inset 0 0 ${24 * glow}px rgba(0,229,255,0.25)`,
          }}
        >
          www.convart.in
        </div>
      </div>
    </AbsoluteFill>
  );
};


// ---------------------------------------------------------------------------
// Website tour — convart.in inside a phone mockup with callouts
// ---------------------------------------------------------------------------
const SCREEN_W = 600;
const SCREEN_H = 1300;
const PX = SCREEN_W / 1075; // screenshot px -> screen px
const STATUS = 60; // phone status bar height

type TourScreen = {
  from: number; // relative to tour start
  dur: number;
  img: string;
  h: number; // screenshot height in px
  header: boolean;
  pan: [number, number];
  tap?: { x: number; y: number; at: number };
  highlight?: { x: number; y: number; w: number; h: number; at: number };
  callouts: { text: string; side: "l" | "r"; y: number; at: number; color: string }[];
};

const TOUR_LEN = 596;
const TOUR: TourScreen[] = [
  {
    from: 0, dur: 106, img: "web/hero.png", h: 2330, header: false, pan: [0, 0],
    tap: { x: 300, y: 666, at: 70 },
    callouts: [{ text: "Art Beyond the Frame", side: "r", y: 1120, at: 30, color: M }],
  },
  {
    from: 106, dur: 125, img: "web/browse.png", h: 5750, header: true, pan: [0, -1650],
    callouts: [
      { text: "16+ curated artworks", side: "l", y: 520, at: 18, color: C },
      { text: "Spiritual · Abstract · Portrait", side: "r", y: 820, at: 42, color: Y },
      { text: "From ₹7,999", side: "l", y: 1120, at: 66, color: M },
    ],
  },
  {
    from: 231, dur: 115, img: "web/custom.png", h: 3750, header: true, pan: [0, -900],
    callouts: [
      { text: "01  Share your wall", side: "r", y: 520, at: 14, color: C },
      { text: "02  Tell us your mood", side: "l", y: 800, at: 40, color: M },
      { text: "03  We design it", side: "r", y: 1080, at: 66, color: Y },
    ],
  },
  {
    from: 346, dur: 95, img: "web/visualizer.png", h: 2495, header: true, pan: [0, -40],
    tap: { x: 300, y: 1000, at: 40 },
    callouts: [
      { text: "Upload your design", side: "l", y: 640, at: 14, color: C },
      { text: "Instant pricing", side: "r", y: 1000, at: 50, color: Y },
    ],
  },
  {
    from: 441, dur: 155, img: "web/services.png", h: 4500, header: true, pan: [0, -1290],
    highlight: { x: 50, y: 718, w: 495, h: 66, at: 112 },
    callouts: [
      { text: "6×6\" premium blocks", side: "l", y: 520, at: 30, color: C },
      { text: "UV-printed HD art", side: "r", y: 930, at: 52, color: M },
      { text: "Ready in 1 week", side: "l", y: 1150, at: 74, color: Y },
    ],
  },
];

const PhoneScreen: React.FC<{ s: TourScreen; first: boolean }> = ({ s, first }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = first ? 1 : interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const pan = interpolate(frame, [12, s.dur - 6], s.pan, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const headerH = s.header ? 165 * PX : 0;
  const top = STATUS;
  const tapT = s.tap ? frame - s.tap.at : -1;
  const hl = s.highlight ? spring({ frame: frame - s.highlight.at, fps, config: { damping: 14 } }) : 0;
  return (
    <AbsoluteFill style={{ transform: `translateY(${(1 - enter) * 100}%)`, background: "#F8F6F2", overflow: "hidden" }}>
      <Img src={f(s.img)} style={{ position: "absolute", top: top + headerH, left: 0, width: SCREEN_W, height: s.h * PX, transform: `translateY(${pan}px)` }} />
      {s.header && <Img src={f("web/header.png")} style={{ position: "absolute", top, left: 0, width: SCREEN_W, height: headerH }} />}
      {s.highlight && (
        <div
          style={{
            position: "absolute",
            left: s.highlight.x - 10,
            top: top + s.highlight.y - 10,
            width: s.highlight.w + 20,
            height: s.highlight.h + 20,
            border: `6px solid ${M}`,
            borderRadius: 18,
            opacity: hl,
            transform: `scale(${interpolate(hl, [0, 1], [1.25, 1])})`,
            boxShadow: `0 0 30px ${M}`,
          }}
        />
      )}
      {s.tap && tapT >= 0 && tapT < 24 && (
        <div
          style={{
            position: "absolute",
            left: s.tap.x - 60,
            top: top + s.tap.y - 60,
            width: 120,
            height: 120,
            borderRadius: 999,
            border: `5px solid ${C}`,
            background: "rgba(0,229,255,0.25)",
            transform: `scale(${interpolate(tapT, [0, 24], [0.3, 1.6])})`,
            opacity: interpolate(tapT, [0, 24], [1, 0]),
          }}
        />
      )}
    </AbsoluteFill>
  );
};

const Callout: React.FC<{ text: string; side: "l" | "r"; y: number; color: string; dur: number }> = ({ text, side, y, color, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 13, stiffness: 150 } });
  const out = interpolate(frame, [dur - 8, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dir = side === "l" ? -1 : 1;
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        [side === "l" ? "left" : "right"]: 40,
        display: "flex",
        alignItems: "stretch",
        fontFamily,
        opacity: s * (1 - out),
        transform: `translateX(${(1 - s) * dir * 120}px) scale(${interpolate(s, [0, 1], [0.8, 1])})`,
        boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
        flexDirection: side === "l" ? "row" : "row-reverse",
      }}
    >
      <div style={{ width: 16, background: color }} />
      <div style={{ background: "white", color: INK, fontWeight: 800, fontSize: 40, letterSpacing: -0.5, padding: "16px 26px 18px" }}>{text}</div>
    </div>
  );
};

const WebTour: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phoneIn = spring({ frame, fps, config: { damping: 16, stiffness: 80 } });
  const titleIn = spring({ frame: frame - 6, fps, config: { damping: 14 } });
  const url = "www.convart.in";
  const typed = Math.max(0, Math.min(url.length, Math.floor((frame - 12) / 1.6)));
  const caret = Math.floor(frame / 8) % 2 === 0;
  const floatY = Math.sin(frame / 22) * 8;
  const stepIdx = TOUR.findIndex((t) => frame >= t.from && frame < t.from + t.dur);
  return (
    <AbsoluteFill style={{ background: INK, fontFamily, overflow: "hidden" }}>
      {/* soft CMYK light */}
      {[C, M, Y].map((c, i) => (
        <div
          key={c}
          style={{
            position: "absolute",
            width: 900,
            height: 900,
            borderRadius: 999,
            background: c,
            opacity: 0.16,
            filter: "blur(160px)",
            left: [-300, 500, 100][i] + Math.sin(frame / 50 + i * 2) * 80,
            top: [200, 700, 1300][i] + Math.cos(frame / 60 + i) * 80,
          }}
        />
      ))}

      {/* title */}
      <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center", opacity: titleIn, transform: `translateY(${(1 - titleIn) * -40}px)` }}>
        <div style={{ color: Y, fontWeight: 700, fontSize: 34, letterSpacing: 10 }}>WEBSITE TOUR</div>
        <div
          style={{
            margin: "22px auto 0",
            display: "inline-flex",
            alignItems: "center",
            gap: 18,
            background: "rgba(255,255,255,0.08)",
            border: "2px solid rgba(255,255,255,0.18)",
            borderRadius: 999,
            padding: "14px 40px 16px 26px",
            color: "white",
            fontSize: 54,
            fontWeight: 700,
          }}
        >
          <div style={{ width: 22, height: 22, borderRadius: 999, background: C, boxShadow: `0 0 16px ${C}` }} />
          <span>
            {url.slice(0, typed)}
            <span style={{ opacity: caret && typed < url.length ? 1 : 0, color: C }}>|</span>
          </span>
        </div>
      </div>

      {/* phone */}
      <div
        style={{
          position: "absolute",
          left: (1080 - 640) / 2,
          top: 430,
          width: 640,
          height: 1340,
          borderRadius: 74,
          background: "#16161A",
          boxShadow: `0 0 0 3px #2A2A30, 0 50px 120px rgba(0,0,0,0.7), 0 0 80px rgba(255,0,204,0.18)`,
          transform: `translateY(${(1 - phoneIn) * 1500 + floatY}px) rotate(${(1 - phoneIn) * 8}deg)`,
        }}
      >
        <div style={{ position: "absolute", left: 20, top: 20, width: SCREEN_W, height: SCREEN_H, borderRadius: 54, overflow: "hidden", background: "#F8F6F2" }}>
          {TOUR.map((t, i) => (
            <Sequence key={t.img} from={t.from} durationInFrames={i === TOUR.length - 1 ? TOUR_LEN - t.from : t.dur + 14} layout="none">
              <PhoneScreen s={t} first={i === 0} />
            </Sequence>
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            left: 20,
            top: 20,
            width: SCREEN_W,
            height: STATUS,
            borderRadius: "54px 54px 0 0",
            background: "#F8F6F2",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 52px 0",
            boxSizing: "border-box",
            fontSize: 24,
            fontWeight: 700,
            color: INK,
          }}
        >
          <span>9:41</span>
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ display: "flex", gap: 3, alignItems: "flex-end" }}>
              {[8, 12, 16, 20].map((h) => (
                <span key={h} style={{ width: 5, height: h, background: INK, borderRadius: 2 }} />
              ))}
            </span>
            <span style={{ width: 38, height: 18, border: `2.5px solid ${INK}`, borderRadius: 6, padding: 2, boxSizing: "border-box" }}>
              <span style={{ display: "block", width: "80%", height: "100%", background: INK, borderRadius: 2 }} />
            </span>
          </span>
        </div>
        <div style={{ position: "absolute", top: 34, left: 260, width: 120, height: 34, borderRadius: 999, background: "#0A0A0A" }} />
      </div>

      {/* callouts */}
      {TOUR.map((t) =>
        t.callouts.map((c) => (
          <Sequence key={t.img + c.text} from={t.from + c.at} durationInFrames={t.dur - c.at} layout="none">
            <Callout text={c.text} side={c.side} y={c.y + 430} color={c.color} dur={t.dur - c.at} />
          </Sequence>
        ))
      )}

      {/* step dots */}
      <div style={{ position: "absolute", bottom: 60, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 14 }}>
        {TOUR.map((t, i) => (
          <div
            key={t.img}
            style={{
              width: i === stepIdx ? 54 : 16,
              height: 16,
              borderRadius: 999,
              background: i === stepIdx ? [C, M, Y][i % 3] : "rgba(255,255,255,0.3)",
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Main composition
// ---------------------------------------------------------------------------
const VO: { file: string; at: number }[] = [
  { file: "vo2/l1.wav", at: 10 },
  { file: "vo2/l2.wav", at: 113 },
  { file: "vo2/l3.wav", at: 280 },
  { file: "vo2/l4.wav", at: 433 },
  { file: "vo2/l5.wav", at: 615 },
  { file: "vo2/t1.wav", at: 752 },
  { file: "vo2/t2.wav", at: 858 },
  { file: "vo2/t3.wav", at: 980 },
  { file: "vo2/t4.wav", at: 1094 },
  { file: "vo2/t5.wav", at: 1190 },
  { file: "vo2/l6.wav", at: 1344 },
];

const HEADLINES = [
  { from: 4, dur: 101, top: "YOUR WALL.", bottom: "A BLANK CANVAS", color: Y },
  { from: 113, dur: 158, top: "BUILD IT", bottom: "BLOCK BY BLOCK", color: M },
  { from: 281, dur: 143, top: "EVERY BLOCK", bottom: "SNAPS IN PLACE", color: C },
  { from: 434, dur: 172, top: "SWAP THE ART.", bottom: "KEEP THE WALL.", color: Y },
];

export const ConvartTrailer: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: INK }}>
      <style>{FONT_CSS}</style>
      {SCENES.map((s) => (
        <Sequence key={s.src} from={s.from} durationInFrames={s.dur}>
          <Footage src={s.src} dur={s.dur} />
        </Sequence>
      ))}

      <Sequence from={TOUR_FROM} durationInFrames={END_FROM - TOUR_FROM}>
        <WebTour />
      </Sequence>

      <Sequence from={END_FROM} durationInFrames={TOTAL - END_FROM}>
        <EndCard />
      </Sequence>

      {HEADLINES.map((h) => (
        <Sequence key={h.top} from={h.from} durationInFrames={h.dur}>
          <Headline top={h.top} bottom={h.bottom} color={h.color} dur={h.dur} />
        </Sequence>
      ))}

      <Sequence from={612} durationInFrames={130}>
        <Checklist dur={130} />
      </Sequence>

      <Sequence from={0} durationInFrames={TOUR_FROM}>
        <Badge />
        <Progress />
      </Sequence>

      {/* block wipes centred on each cut */}
      {[105, 273, 426, 608, TOUR_FROM, END_FROM].map((cut) => (
        <Sequence key={cut} from={cut - 8} durationInFrames={17}>
          <BlockWipe />
        </Sequence>
      ))}

      {/* Audio */}
      <Audio src={f("music50.wav")} volume={0.4} />
      {VO.map((v) => (
        <Sequence key={v.file} from={v.at}>
          <Audio src={f(v.file)} volume={1} />
        </Sequence>
      ))}
      {[105, 273, 426, 608, TOUR_FROM].map((cut) => (
        <Sequence key={`w${cut}`} from={cut - 9}>
          <Audio src={f("sfx/whoosh-short.mp3")} volume={0.35} />
        </Sequence>
      ))}
      {[624, 646, 668].map((t) => (
        <Sequence key={`p${t}`} from={t}>
          <Audio src={f("sfx/pop.mp3")} volume={0.4} />
        </Sequence>
      ))}
      <Sequence from={END_FROM - 8}>
        <Audio src={f("sfx/whoosh.mp3")} volume={0.4} />
      </Sequence>
      {/* tour: swipes between screens, taps */}
      {[850, 975, 1090, 1185].map((t) => (
        <Sequence key={`s${t}`} from={t - 2}>
          <Audio src={f("sfx/whoosh-short.mp3")} volume={0.22} />
        </Sequence>
      ))}
      {[TOUR_FROM + 70, TOUR_FROM + 346 + 40].map((t) => (
        <Sequence key={`c${t}`} from={t}>
          <Audio src={f("sfx/click-soft.mp3")} volume={0.5} />
        </Sequence>
      ))}
      <Sequence from={END_FROM + 60}>
        <Audio src={f("sfx/sparkle.mp3")} volume={0.35} />
      </Sequence>
    </AbsoluteFill>
  );
};
