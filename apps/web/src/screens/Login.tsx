/* Sign-in screen. Discord is the only account provider; "continue as guest" is a
   first-class exit, because playing without an account is the supported default. */

import { useState } from "react";
import { AegisEmblem, AegisLogo } from "../design/AegisLogo";
import { Icons } from "../design/icons";
import { InfoNote, Panel } from "../design/surfaces";
import { accountApi } from "../account/client";
import { useTranslation } from "../i18n";
import "./login.css";

export function Login({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const [redirecting, setRedirecting] = useState(false);

  const signInWithDiscord = () => {
    setRedirecting(true);
    location.href = `${accountApi.base}/auth/discord`;
  };

  return (
    <main className="login-page">
      <header className="login-page__bar">
        <button type="button" className="login-page__brand" onClick={onBack} aria-label={t("nav.home")}>
          <AegisLogo size={32} />
        </button>
        <button type="button" className="login-page__back" onClick={onBack}>
          <Icons.ArrowLeft size={15} />
          {t("login.back")}
        </button>
      </header>

      <div className="login-page__body">
        <Panel className="login-card">
          <div className="login-card__head">
            <span className="login-card__emblem">
              <AegisEmblem size={44} />
            </span>
            <span className="aegis-eyebrow">{t("redesign.home.login.eyebrow")}</span>
            <h1>{t("login.title")}</h1>
            <p className="aegis-hero-panel__muted">{t("login.subtitle")}</p>
          </div>

          <div className="login-card__actions">
            <button type="button" className="login-discord" onClick={signInWithDiscord} disabled={redirecting}>
              <Icons.Discord size={20} />
              {t("login.discord")}
            </button>
            {redirecting ? (
              <p className="login-card__status" role="status">
                {t("login.opening")}
              </p>
            ) : null}

            <div className="login-card__divider">
              <span>{t("login.or")}</span>
            </div>

            <button type="button" className="login-guest" onClick={onBack}>
              <Icons.User size={18} />
              {t("login.guest")}
            </button>
            <InfoNote className="login-card__note">{t("login.guestNote")}</InfoNote>
          </div>

          <ul className="login-card__benefits">
            <li>
              <Icons.Devices size={15} />
              {t("login.benefit.sync")}
            </li>
            <li>
              <Icons.ShieldCheck size={15} />
              {t("login.benefit.privacy")}
            </li>
            <li>
              <Icons.MessageSquare size={15} />
              {t("login.benefit.free")}
            </li>
          </ul>
        </Panel>
      </div>

      <footer className="login-page__legal">
        <p>{t("login.legal")}</p>
      </footer>
    </main>
  );
}
