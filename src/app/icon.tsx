import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<AppMark radius={7} />, { ...size });
}

// Approximates the ISB "waves" mark (three ascending wave bands) in white
// on the institutional navy — not a pixel-exact reproduction of the
// official logo, just evoking the same motif for app icons/favicons.
export function AppMark({ radius }: { radius: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1e2b6c",
        borderRadius: radius,
      }}
    >
      <svg
        width="68%"
        height="68%"
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
  );
}
