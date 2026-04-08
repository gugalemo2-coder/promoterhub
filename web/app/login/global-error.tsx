"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ padding: 40, textAlign: "center", fontFamily: "sans-serif" }}>
          <h2 style={{ fontSize: 20, color: "#111827" }}>Algo deu errado</h2>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "8px 0 16px" }}>{error.message}</p>
          <button
            onClick={() => reset()}
            style={{
              padding: "10px 20px", borderRadius: 8, border: "none",
              background: "#1A56DB", color: "white", fontSize: 14,
              fontWeight: 600, cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
