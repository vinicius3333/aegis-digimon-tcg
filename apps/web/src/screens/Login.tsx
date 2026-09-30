/* Sign-in screen. Discord and an emailed magic link are the account providers;
   "continue as guest" is a first-class exit, because playing without an account
   is the supported default. */

import { useState, type FormEvent } from "react";
import { AegisEmblem, AegisLogo } from "../design/AegisLogo";
import { Icons } from "../design/icons";
import { Alert, Button, Field } from "../design/primitives";
import { InfoNote, Panel } from "../design/surfaces";
import { accountApi } from "../account/client";
import { useTranslation } from "../i18n";
import "./login.css";

export function Login({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const [redirecting, setRedirecting] = useState(false);
  const [email, setEmail] = useState("");
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const signInWithDiscord = () => {
    setRedirecting(true);
    location.href = `${accountApi.base}/auth/discord`;
  };

  const sendMagicLink = async (event: FormEvent) => {
    event.preventDefault();
    setSendingLink(true);
    try {
      await accountApi.magicLink(email);
      setLinkSent(true);
    } finally {
      setSendingLink(false);
    }
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
              <span>{t("account.orEmail")}</span>
            </div>

            <form className="login-email" onSubmit={(event) => void sendMagicLink(event)}>
              <Field
                required
                type="email"
                label={t("account.emailLabel")}
                name="loginEmail"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("account.emailPlaceholder")}
              />
              <Button type="submit" variant="secondary" icon={Icons.Send} disabled={sendingLink}>
                {t("account.sendMagicLink")}
              </Button>
            </form>
            {linkSent ? <Alert tone="success">{t("account.magicLinkSent")}</Alert> : null}

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
