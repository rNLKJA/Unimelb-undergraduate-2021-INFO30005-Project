import { ImageResponse } from "next/og";

export const alt = "Snacks in a Van: order coffee from the nearest van";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#fffaf2",
        padding: 72,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{ display: "flex", height: 22, width: "100%", borderRadius: 11, overflow: "hidden" }}
      >
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} style={{ flex: 1, background: i % 2 ? "#fdf3e3" : "#e8462c" }} />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 30, color: "#7a5f4b" }}>
          INFO30005 · University of Melbourne · 2021, revived
        </div>
        <div style={{ fontSize: 96, fontWeight: 700, color: "#241811", lineHeight: 1 }}>
          Snacks in a Van
        </div>
        <div style={{ fontSize: 42, color: "#e8462c" }}>Coffee from the van around the corner.</div>
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 26, color: "#4b3325" }}>
        <span>Nearest-van map</span>
        <span>·</span>
        <span>Order ahead</span>
        <span>·</span>
        <span>Live vendor board</span>
      </div>
    </div>,
    size,
  );
}
