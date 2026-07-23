import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Same head-and-rays glyph as components/app-logo.tsx (solid fills instead
// of a stroked outline, since a favicon needs to read at 16px against an
// arbitrary browser-tab background).
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#003d82",
          borderRadius: 4,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 9,
            top: 15,
            width: 14,
            height: 14,
            borderRadius: 7,
            background: "#ffffff",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 13,
            top: 20,
            width: 1.6,
            height: 1.6,
            borderRadius: 0.8,
            background: "#003d82",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 17.4,
            top: 20,
            width: 1.6,
            height: 1.6,
            borderRadius: 0.8,
            background: "#003d82",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 14,
            top: 24,
            width: 4,
            height: 1.4,
            borderRadius: 1,
            background: "#003d82",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 14.5,
            top: 3,
            width: 3,
            height: 8,
            borderRadius: 1.5,
            background: "#ffffff",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 22,
            top: 5,
            width: 3,
            height: 9,
            borderRadius: 1.5,
            background: "#ffffff",
            transform: "rotate(35deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 5,
            top: 6,
            width: 3,
            height: 7,
            borderRadius: 1.5,
            background: "#ffffff",
            transform: "rotate(-35deg)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
