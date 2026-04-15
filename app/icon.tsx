import { ImageResponse } from "next/og"

export const size = { width: 64, height: 64 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a1f2e 0%, #2a3145 100%)",
          color: "#c9a96e",
          fontSize: 38,
          fontWeight: 700,
          fontFamily: "Georgia, serif",
          letterSpacing: "-0.02em",
          borderRadius: 12,
        }}
      >
        L
      </div>
    ),
    { ...size }
  )
}
