import { useEffect } from "react";
import { Icons } from "./icons";

export function SuccessToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onDismiss, 3000);
    return () => window.clearTimeout(timeoutId);
  }, [onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        right: 20,
        bottom: "max(20px, env(safe-area-inset-bottom))",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        gap: 10,
        maxWidth: "calc(100% - 40px)",
        padding: "12px 16px",
        border: "1px solid var(--ds-success)",
        borderRadius: 12,
        background: "var(--ds-surface)",
        color: "var(--ds-foreground)",
        boxShadow: "0 18px 40px rgba(15,23,42,0.28)",
        animation: "aegis-rise 200ms ease-out",
      }}
    >
      <Icons.Check size={18} style={{ flexShrink: 0, color: "var(--ds-success)" }} />
      <span style={{ fontSize: 14, fontWeight: 600 }}>{message}</span>
    </div>
  );
}
