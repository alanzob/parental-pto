import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Same head-and-rays mark as components/app-logo.tsx / app/icon.tsx, scaled
// up for a social share card, next to the wordmark and tagline.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 72,
          background: "#003d82",
        }}
      >
        <div
          style={{
            position: "relative",
            width: 220,
            height: 220,
            display: "flex",
            border: "4px solid #ffffff",
            borderRadius: 24,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 62,
              top: 84,
              width: 96,
              height: 96,
              borderRadius: 48,
              background: "#ffffff",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 92,
              top: 116,
              width: 12,
              height: 12,
              borderRadius: 6,
              background: "#003d82",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 124,
              top: 116,
              width: 12,
              height: 12,
              borderRadius: 6,
              background: "#003d82",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 95,
              top: 148,
              width: 30,
              height: 8,
              borderRadius: 4,
              background: "#003d82",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 104,
              top: 18,
              width: 12,
              height: 56,
              borderRadius: 6,
              background: "#ffffff",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 150,
              top: 28,
              width: 12,
              height: 62,
              borderRadius: 6,
              background: "#ffffff",
              transform: "rotate(35deg)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 44,
              top: 34,
              width: 12,
              height: 50,
              borderRadius: 6,
              background: "#ffffff",
              transform: "rotate(-35deg)",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
          <div
            style={{
              fontSize: 116,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: -2,
              lineHeight: 1,
            }}
          >
            MyTO
          </div>
          <div
            style={{
              fontSize: 38,
              color: "#bcd4f2",
              fontStyle: "italic",
              marginTop: 12,
            }}
          >
            time to be you
          </div>
          <div
            style={{
              fontSize: 27,
              color: "#e8eef8",
              marginTop: 28,
              lineHeight: 1.4,
            }}
          >
            A shared ledger for two people who trade off — so neither of you has to keep
            score in your head.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
