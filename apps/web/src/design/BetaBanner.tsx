import { useState } from "react";
import { DISCORD_INVITE_URL } from "../community";
import { useTranslation } from "../i18n";
import { Icons } from "./icons";

const DISMISSED_KEY = "aegis:betaBannerDismissed";

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberDismissal(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // ignore unavailable storage
  }
}

export function BetaBanner() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(wasDismissed);

  if (dismissed) return null;

  return (
    <div className="aegis-beta-banner" role="status">
      <p className="aegis-beta-banner__text">
        <strong>{t("beta.tag")}</strong>
        <span>{t("beta.message")}</span>
        <a href={DISCORD_INVITE_URL} target="_blank" rel="noreferrer">
          {t("beta.reportLink")}
          <Icons.ArrowRight size={14} />
        </a>
      </p>
      <button
        className="aegis-beta-banner__dismiss"
        onClick={() => {
          rememberDismissal();
          setDismissed(true);
        }}
        aria-label={t("beta.dismissAria")}
        title={t("beta.dismiss")}
      >
        <Icons.X size={16} />
      </button>
    </div>
  );
}
