import { ImageResponse } from "next/og"

export const alt = "Gang of Wine Moms Book Club"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #5c1a26 0%, #7a2531 50%, #4a1420 100%)",
          color: "#fcf9f5",
          fontFamily: "serif",
          padding: 80,
        }}
      >
        <svg
          width="140"
          height="140"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fcf9f5"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginBottom: 36 }}
        >
          <path d="M8 22h8" />
          <path d="M7 10h10" />
          <path d="M12 15v7" />
          <path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z" />
        </svg>
        <div
          style={{
            fontSize: 92,
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.05,
            marginBottom: 18,
          }}
        >
          Gang of Wine Moms
        </div>
        <div
          style={{
            fontSize: 44,
            fontWeight: 400,
            letterSpacing: 14,
            textAlign: "center",
            marginBottom: 36,
            opacity: 0.92,
          }}
        >
          BOOK CLUB
        </div>
        <div
          style={{
            fontSize: 30,
            opacity: 0.82,
            textAlign: "center",
          }}
        >
          Where book lovers and wine enthusiasts unite
        </div>
      </div>
    ),
    { ...size },
  )
}
