import { useState } from "react";
import { Icons } from "@/design/icons";
import { IconButton } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";

type CopyStatus = "idle" | "copied" | "failed";
type Params = { lines: readonly string[] };

export function ReplayLogCopyButton({ lines }: Params) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<CopyStatus>("idle");
  return (
    <div className="replay-history__copy">
      <span className={status === "failed" ? undefined : "aegis-sr-only"} role="status">
        {status === "copied" ? t("common.copied") : status === "failed" ? t("replay.copyLogFailed") : ""}
      </span>
      <IconButton
        size="sm"
        variant="ghost"
        label={t("replay.copyLog")}
        title={t("replay.copyLog")}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(lines.join("\n"));
            setStatus("copied");
          } catch {
            setStatus("failed");
          }
        }}
      >
        {status === "copied" ? <Icons.Check size={16} /> : <Icons.Copy size={16} />}
      </IconButton>
    </div>
  );
}
