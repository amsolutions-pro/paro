import { ImageResponse } from "next/og";

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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f0e8",
          fontFamily: "serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Fond décoratif — cercles doux */}
        <div style={{
          position: "absolute", top: -120, right: -120,
          width: 500, height: 500, borderRadius: "50%",
          background: "rgba(139,90,143,0.08)",
          display: "flex",
        }} />
        <div style={{
          position: "absolute", bottom: -80, left: -80,
          width: 360, height: 360, borderRadius: "50%",
          background: "rgba(139,90,143,0.06)",
          display: "flex",
        }} />

        {/* Rose SVG — icône */}
        <div style={{ display: "flex", marginBottom: 32 }}>
          <svg width="96" height="96" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 92 Q48 80 50 68" stroke="#2e7d32" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
            <path d="M50 78 Q38 70 36 58 Q44 66 50 78" fill="#4caf50"/>
            <path d="M50 74 Q62 66 64 54 Q56 62 50 74" fill="#4caf50"/>
            <ellipse cx="50" cy="64" rx="12" ry="7" fill="#388e3c"/>
            <ellipse cx="50" cy="36" rx="14" ry="20" fill="#e8294a" transform="rotate(0,50,52)"/>
            <ellipse cx="50" cy="36" rx="14" ry="20" fill="#e8294a" transform="rotate(72,50,52)"/>
            <ellipse cx="50" cy="36" rx="14" ry="20" fill="#e8294a" transform="rotate(144,50,52)"/>
            <ellipse cx="50" cy="36" rx="14" ry="20" fill="#e8294a" transform="rotate(216,50,52)"/>
            <ellipse cx="50" cy="36" rx="14" ry="20" fill="#e8294a" transform="rotate(288,50,52)"/>
            <ellipse cx="50" cy="40" rx="10" ry="14" fill="#c01030" transform="rotate(36,50,52)"/>
            <ellipse cx="50" cy="40" rx="10" ry="14" fill="#c01030" transform="rotate(108,50,52)"/>
            <ellipse cx="50" cy="40" rx="10" ry="14" fill="#c01030" transform="rotate(180,50,52)"/>
            <ellipse cx="50" cy="40" rx="10" ry="14" fill="#c01030" transform="rotate(252,50,52)"/>
            <ellipse cx="50" cy="40" rx="10" ry="14" fill="#c01030" transform="rotate(324,50,52)"/>
            <circle cx="50" cy="52" r="12" fill="#9a0820"/>
            <circle cx="47" cy="49" r="3" fill="rgba(255,100,130,0.4)"/>
          </svg>
        </div>

        {/* Titre principal */}
        <div style={{
          fontSize: 72,
          fontWeight: 700,
          color: "#2a2520",
          letterSpacing: "-1px",
          display: "flex",
          marginBottom: 16,
        }}>
          Paronymes
        </div>

        {/* Sous-titre bilingue */}
        <div style={{
          fontSize: 32,
          color: "#6b5ea8",
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 12,
        }}>
          <span>français</span>
          <span style={{ color: "#c0a070" }}>·</span>
          <span style={{ color: "#1f6b5c" }}>հայերեն</span>
        </div>

        {/* Niveau */}
        <div style={{
          marginTop: 8,
          padding: "8px 28px",
          background: "#6b5ea8",
          borderRadius: 999,
          color: "white",
          fontSize: 22,
          display: "flex",
        }}>
          niveau B2
        </div>

        {/* URL */}
        <div style={{
          position: "absolute",
          bottom: 32,
          fontSize: 18,
          color: "#8a7a6a",
          display: "flex",
        }}>
          paro-xi.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
