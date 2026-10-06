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
const END_FROM = 744;
const TOTAL = 900;

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
  const p = frame / END_FROM;
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
// Main composition
// ---------------------------------------------------------------------------
const VO: { file: string; at: number }[] = [
  { file: "vo/l1.wav", at: 10 },
  { file: "vo/l2.wav", at: 113 },
  { file: "vo/l3.wav", at: 280 },
  { file: "vo/l4.wav", at: 433 },
  { file: "vo/l5.wav", at: 615 },
  { file: "vo/l6.wav", at: 750 },
];

const HEADLINES = [
  { from: 4, dur: 101, top: "YOUR WALL.", bottom: "A BLANK CANVAS", color: Y },
  { from: 113, dur: 158, top: "BUILD IT", bottom: "BLOCK BY BLOCK", color: M },
  { from: 281, dur: 143, top: "EVERY TILE", bottom: "SNAPS IN PLACE", color: C },
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

      <Sequence from={0} durationInFrames={END_FROM}>
        <Badge />
        <Progress />
      </Sequence>

      {/* block wipes centred on each cut */}
      {[105, 273, 426, 608, 744].map((cut) => (
        <Sequence key={cut} from={cut - 8} durationInFrames={17}>
          <BlockWipe />
        </Sequence>
      ))}

      {/* Audio */}
      <Audio src={f("music.wav")} volume={0.42} />
      {VO.map((v) => (
        <Sequence key={v.file} from={v.at}>
          <Audio src={f(v.file)} volume={1} />
        </Sequence>
      ))}
      {[105, 273, 426, 608].map((cut) => (
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
      <Sequence from={END_FROM + 60}>
        <Audio src={f("sfx/sparkle.mp3")} volume={0.35} />
      </Sequence>
    </AbsoluteFill>
  );
};
