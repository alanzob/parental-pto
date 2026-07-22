import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Same bar-chart glyph as components/app-logo.tsx, but filled solid
// (instead of a stroked outline) since a favicon needs to read at 16px
// against an arbitrary browser-tab background.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 2,
          background: "#003d82",
          borderRadius: 4,
          padding: "5px 6px 4px",
        }}
      >
        <div style={{ width: 5, height: 10, background: "#ffffff" }} />
        <div style={{ width: 5, height: 16, background: "#ffffff" }} />
        <div style={{ width: 5, height: 20, background: "#ffffff" }} />
      </div>
    ),
    { ...size },
  );
}
