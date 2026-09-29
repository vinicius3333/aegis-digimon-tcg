import { useEffect } from "react";
import { Icons } from "./icons";
import "./SuccessToast.css";

export function SuccessToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onDismiss, 3000);
    return () => window.clearTimeout(timeoutId);
  }, [onDismiss]);

  return (
    <div className="aegis-success-toast" role="status" aria-live="polite">
      <span className="aegis-success-toast__icon" aria-hidden="true">
        <Icons.Check size={16} />
      </span>
      <span className="aegis-success-toast__message">{message}</span>
    </div>
  );
}
