import { ImageResponse } from "next/og";
import { car } from "@/lib/ogCar";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name}: a red Formula 1 car mid-donut, leaving tyre marks on asphalt`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "linear-gradient(135deg, #3a3c40 0%, #26282b 100%)",
          color: "white",
        }}
      >
        <svg width={1200} height={630} viewBox="0 0 1200 630" style={{ position: "absolute", left: 0, top: 0 }}>
          <g fill="none" stroke="#0b0b0c" strokeOpacity={0.75} strokeWidth={12}>
            <circle cx={850} cy={330} r={150} />
            <circle cx={850} cy={330} r={196} />
            <path d="M700 630 L700 330" />
            <path d="M654 630 L654 330" />
          </g>
          <g transform="translate(951 190) rotate(25) scale(2.7)">
            {car()}
          </g>
        </svg>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 72px",
            width: 640,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 26,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#ff4b4b",
              fontWeight: 700,
            }}
          >
            Interactive lab
          </div>
          <div style={{ display: "flex", fontSize: 148, fontWeight: 800, lineHeight: 1.05, marginTop: 12 }}>
            F1 Lab
          </div>
          <div style={{ display: "flex", fontSize: 36, lineHeight: 1.3, color: "#c4c7cc", marginTop: 20 }}>
            Drive a Formula 1 car around your screen. Burn donuts, crash it, pit for repairs.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
