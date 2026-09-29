import { useEffect, useState } from "react";
import { Button } from "../design/primitives";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import { accountApi } from "./client";
import "./RankedStart.css";

const CONFIRMATION_KEY = "aegis-ranked-confirmed";

export function RankedStart({
  disabled,
  buttonLabel,
  actionClassName,
  onOpenSettings,
  onStart,
}: {
  disabled: boolean;
  buttonLabel: string;
  actionClassName?: string;
  onOpenSettings: () => void;
  onStart: (ranked: boolean) => void;
}) {
  const { t } = useTranslation();
  const [ranked, setRanked] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [skipNextTime, setSkipNextTime] = useState(false);
  const [error, setError] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean>();
  useEffect(() => {
    let active = true;
    void accountApi
      .me()
      .then((account) => {
        if (active) setAuthenticated(account !== null);
      })
      .catch(() => {
        if (active) setAuthenticated(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function begin() {
    setError(false);
    if (ranked) {
      const account = await accountApi.me().catch(() => null);
      if (!account) {
        setError(true);
        return;
      }
    }
    if (ranked && localStorage.getItem(CONFIRMATION_KEY) !== "1") setConfirming(true);
    else onStart(ranked);
  }
  function confirm() {
    if (skipNextTime) localStorage.setItem(CONFIRMATION_KEY, "1");
    setConfirming(false);
    onStart(true);
  }
  return (
    <>
      <div className="ranked-start">
        <label className="ranked-start__option" data-disabled={!authenticated || undefined}>
          <input
            type="checkbox"
            disabled={!authenticated}
            checked={ranked}
            onChange={(event) => setRanked(event.target.checked)}
          />
          <span>
            <strong>{t("ranked.checkboxTitle")}</strong>
            <span className="ranked-start__description">{t("ranked.checkboxDescription")}</span>
          </span>
        </label>
        {authenticated === false ? (
          <button type="button" className="ranked-start__sign-in" onClick={onOpenSettings}>
            <Icons.LogIn size={16} />
            {t("ranked.signInToEnable")}
          </button>
        ) : null}
      </div>
      <div className={actionClassName}>
        <Button size="lg" full icon={Icons.Swords} disabled={disabled} onClick={() => void begin()}>
          {buttonLabel}
        </Button>
      </div>
      {error ? (
        <div role="alert" className="ranked-start__error">
          {t("ranked.signInFirst")}
        </div>
      ) : null}
      {confirming ? (
        <div role="dialog" aria-modal="true" aria-labelledby="ranked-title" className="ranked-confirm">
          <div className="ranked-confirm__dialog aegis-dialog">
            <header className="aegis-dialog__header">
              <span className="aegis-dialog__eyebrow">{t("redesign.shell.ranked.eyebrow")}</span>
              <strong id="ranked-title" className="aegis-dialog__title">
                {t("ranked.confirmTitle")}
              </strong>
            </header>
            <p className="ranked-confirm__body">{t("ranked.confirmBody")}</p>
            <label className="ranked-confirm__skip">
              <input
                type="checkbox"
                checked={skipNextTime}
                onChange={(event) => setSkipNextTime(event.target.checked)}
              />
              {t("ranked.dontShowAgain")}
            </label>
            <div className="ranked-confirm__actions">
              <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
                {t("common.cancel")}
              </Button>
              <Button size="sm" onClick={confirm}>
                {t("common.confirm")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
