import { ImageResponse } from "next/og";

export const alt = "ALCL - independent community tournament platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#f4f7f2",
          background:
            "radial-gradient(circle at 82% 25%, #213214 0, #0a0d0c 38%, #07090c 75%)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              width: 64,
              height: 64,
              alignItems: "center",
              justifyContent: "center",
              background: "#b7ff3c",
              color: "#081008",
              fontWeight: 900,
              fontSize: 34,
            }}
          >
            A
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>ALCL</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ color: "#b7ff3c", fontSize: 22, letterSpacing: 4 }}>
            COMMUNITY COMPETITION
          </div>
          <div style={{ fontSize: 78, lineHeight: 1, fontWeight: 800, maxWidth: 900 }}>
            WHERE COMMUNITIES COMPETE.
          </div>
          <div style={{ fontSize: 27, color: "#a9b2aa" }}>
            Independent community tournaments for Apex Legends
          </div>
        </div>
      </div>
    ),
    size,
  );
}
