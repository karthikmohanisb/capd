import { ImageResponse } from "next/og";

const size = { width: 512, height: 512 };

export const dynamic = "force-static";

// Maskable icons must keep the visual mark inside the safe zone (an inner
// circle covering ~80% of the canvas), since the OS applies its own shape
// mask (circle, squircle, etc.) on top of the full-bleed background.
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1e2b6c",
        }}
      >
        <svg
          width="50%"
          height="50%"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2.5 17 Q7 12.5 12.5 14.5 T22 9.5"
            stroke="white"
            strokeWidth={2.1}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M2.5 12.5 Q7 8 12.5 10 T22 5"
            stroke="white"
            strokeWidth={2.1}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M4.5 21 Q9 16.5 14.5 18.5 T22.5 14.5"
            stroke="white"
            strokeWidth={2.1}
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    ),
    size
  );
}
