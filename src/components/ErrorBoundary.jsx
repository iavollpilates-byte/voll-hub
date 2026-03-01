import { Component } from "react";

/**
 * Error Boundary: captura erros de renderização em componentes filhos
 * e exibe uma UI de fallback em vez de tela branca.
 */
export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary:", error, errorInfo);
    this.setState((s) => (s.errorInfo ? null : { errorInfo }));
  }

  render() {
    if (this.state.hasError) {
      const isDark = document.documentElement.style.getPropertyValue("--theme") === "dark" || document.body?.style?.background?.includes("060a09");
      const bg = isDark ? "#060a09" : "#f4f7f6";
      const text = isDark ? "#f0f0f0" : "#1a2e28";
      const muted = isDark ? "#7a8d86" : "#5a7a6e";
      const accent = "#349980";
      const showDebug = typeof window !== "undefined" && window.location.search.includes("debug=1");
      const err = this.state.error;

      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "'Outfit', sans-serif",
          background: bg,
          color: text,
          textAlign: "center"
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Algo deu errado</h1>
          <p style={{ fontSize: 14, color: muted, marginBottom: 24, maxWidth: 320 }}>
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          {err?.message && (
            <p style={{ fontSize: 12, color: muted, marginBottom: 16, maxWidth: 360, wordBreak: "break-word", textAlign: "center" }}>
              {err.message}
            </p>
          )}
          {showDebug && err && (
            <pre style={{ fontSize: 11, color: muted, textAlign: "left", maxWidth: "100%", overflow: "auto", marginBottom: 16, padding: 12, background: "rgba(0,0,0,0.1)", borderRadius: 8 }}>
              {err.message}
              {this.state.errorInfo?.componentStack && "\n\n" + this.state.errorInfo.componentStack}
            </pre>
          )}
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              background: accent,
              color: "#fff",
              fontSize: 16,
              fontWeight: 600,
              border: "none",
              cursor: "pointer"
            }}
          >
            Recarregar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
