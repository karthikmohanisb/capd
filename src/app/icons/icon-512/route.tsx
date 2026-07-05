import { ImageResponse } from "next/og";
import { AppMark } from "../../icon";

const size = { width: 512, height: 512 };

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(<AppMark radius={102} />, size);
}
