import { ImageResponse } from "next/og";
import { AppMark } from "../../icon";

const size = { width: 192, height: 192 };

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(<AppMark radius={38} />, size);
}
