import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Same glyph as icon.tsx, scaled up. No border radius — iOS applies its
// own rounded-square mask to home-screen icons automatically.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 10,
          background: "#003d82",
          padding: "26px 30px 22px",
        }}
      >
        <div style={{ width: 28, height: 56, background: "#ffffff" }} />
        <div style={{ width: 28, height: 90, background: "#ffffff" }} />
        <div style={{ width: 28, height: 113, background: "#ffffff" }} />
      </div>
    ),
    { ...size },
  );
}
