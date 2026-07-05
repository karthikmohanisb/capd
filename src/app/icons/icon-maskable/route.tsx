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
          background: "#4338ca",
        }}
      >
        <svg
          width="46%"
          height="46%"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 12.5L9.5 18L20 6"
            stroke="white"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    size
  );
}
