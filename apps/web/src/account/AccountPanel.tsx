import { useEffect, useState, type FormEvent } from "react";
import { Alert, Avatar, Badge, Button, Field } from "../design/primitives";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import { AccountApiError, accountApi, type AccountProfile, type RemoteAccount } from "./client";
import { DigimonAvatarPicker } from "./DigimonAvatarPicker";
import type { DigimonWorldAvatarId } from "./avatars";
import "./AccountPanel.css";

export function AccountPanel({ account, onAccountChange }: { account: RemoteAccount | null | undefined; onAccountChange?: (account: RemoteAccount) => void }) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<AccountProfile>();
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(account?.displayName ?? "");
  const [nameError, setNameError] = useState("");
  const [savingName, setSavingName] = useState(false);
  useEffect(() => { if (account) void accountApi.profile().then(setProfile).catch(() => undefined); }, [account?.id]);
  useEffect(() => setNameInput(account?.displayName ?? ""), [account?.displayName]);
  async function sendLink(event: FormEvent) { event.preventDefault(); await accountApi.magicLink(email); setLinkSent(true); }
  async function selectAvatar(avatarId: DigimonWorldAvatarId) {
    const updated = await accountApi.updateAvatar(avatarId);
    setProfile((current) => current ? { ...current, account: updated } : current);
    onAccountChange?.(updated);
  }
  async function saveDisplayName(event: FormEvent) {
    event.preventDefault();
    setNameError("");
    setSavingName(true);
    try {
      const updated = await accountApi.updateDisplayName(nameInput);
      setProfile((current) => current ? { ...current, account: updated } : current);
      onAccountChange?.(updated);
      setEditingName(false);
    } catch (error) {
      if (error instanceof AccountApiError && error.code === "display_name_taken") setNameError(t("account.nickname.taken"));
      else if (error instanceof AccountApiError && error.code === "too_many_requests") setNameError(t("account.nickname.rateLimit"));
      else if (error instanceof AccountApiError && error.code === "invalid_display_name") setNameError(t("account.nickname.invalid"));
      else setNameError(t("account.nickname.error"));
    } finally { setSavingName(false); }
  }
  if (account === undefined) return <div className="account-panel__loading">{t("account.loading")}</div>;
  if (!account) {
    return (
      <div className="account-panel account-panel--signed-out">
        <div className="account-panel__intro">
          <span className="account-panel__intro-icon"><Icons.UserPlus size={22} /></span>
          <div>
            <strong className="account-panel__intro-title">{t("account.signInTitle")}</strong>
            <p className="account-panel__intro-copy">{t("account.signInCopy")}</p>
          </div>
        </div>
        <Button icon={Icons.Discord} onClick={() => { location.href = `${accountApi.base}/auth/discord`; }}>{t("account.signInDiscord")}</Button>
        <div className="account-panel__or" role="separator"><span>{t("account.orEmail")}</span></div>
        <form className="account-panel__magic-link" onSubmit={(event) => void sendLink(event)}>
          <Field
            required
            type="email"
            label={t("account.emailLabel")}
            name="accountEmail"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("account.emailPlaceholder")}
          />
          <Button type="submit" variant="secondary" icon={Icons.Send}>{t("account.sendMagicLink")}</Button>
        </form>
        {linkSent ? <Alert tone="success">{t("account.magicLinkSent")}</Alert> : null}
      </div>
    );
  }
  const stats = profile?.stats;
  return (
    <div className="account-panel">
      <div className="account-panel__identity">
        <Avatar name={account.displayName} avatarId={account.avatarId} avatarUrl={account.avatarUrl} size={56} ring />
        <div className="account-panel__identity-copy">
          <strong>{account.displayName}</strong>
          <Badge tone="success" className="account-panel__connected"><span className="account-panel__connected-dot" />{t("account.connected")}</Badge>
        </div>
        <Button size="sm" variant="secondary" icon={Icons.LogOut} onClick={() => void accountApi.logout().then(() => location.reload())}>{t("account.signOut")}</Button>
      </div>
      <section className="account-panel__nickname" aria-labelledby="account-nickname-title">
        <div>
          <h3 id="account-nickname-title">{t("account.nickname.title")}</h3>
          <p>{t("account.nickname.copy")}</p>
        </div>
        {editingName ? (
          <form className="account-panel__nickname-form" onSubmit={(event) => void saveDisplayName(event)}>
            <Field
              label={t("account.nickname.label")}
              name="accountDisplayName"
              autoComplete="nickname"
              minLength={3}
              maxLength={32}
              required
              value={nameInput}
              error={nameError || undefined}
              hint={t("account.nickname.hint")}
              onChange={(event) => setNameInput(event.target.value)}
            />
            <div className="account-panel__nickname-actions">
              <Button type="button" size="sm" variant="secondary" disabled={savingName} onClick={() => { setEditingName(false); setNameInput(account.displayName); setNameError(""); }}>{t("common.cancel")}</Button>
              <Button type="submit" size="sm" disabled={savingName || nameInput.trim() === account.displayName}>{savingName ? t("account.nickname.saving") : t("common.save")}</Button>
            </div>
          </form>
        ) : (
          <div className="account-panel__nickname-value">
            <strong>{account.displayName}</strong>
            <Button type="button" size="sm" variant="secondary" onClick={() => setEditingName(true)}>{t("common.edit")}</Button>
          </div>
        )}
      </section>
      {stats ? (
        <div className="account-panel__stats">
          {([
            [t("account.stats.wins"), stats.rankedWins],
            [t("account.stats.losses"), stats.rankedLosses],
            [t("account.stats.draws"), stats.rankedDraws],
            [t("account.stats.dodges"), stats.rankedDodges],
            [t("account.stats.matches"), stats.rankedWins + stats.rankedLosses + stats.rankedDraws],
            [t("account.stats.tournaments"), stats.tournamentsPlayed],
            [t("account.stats.titles"), stats.tournamentsWon],
          ] as const).map(([label, value]) => (
            <div key={label} className="account-panel__stat">
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      ) : null}
      <DigimonAvatarPicker selectedAvatarId={account.avatarId} onSelect={selectAvatar} />
      {profile?.decks.length ? (
        <section className="account-panel__section">
          <h3>{t("account.deckPerformance")}</h3>
          {profile.decks.map((deck) => (
            <div key={deck.snapshotId} className="account-panel__deck">
              <strong>{deck.deckName}</strong>
              <span>
                {t("account.deckLine", {
                  wins: deck.wins,
                  losses: deck.losses,
                  draws: deck.draws,
                  matches: deck.matches,
                  cards: deck.mainDeck.length + deck.eggDeck.length,
                })}
              </span>
            </div>
          ))}
        </section>
      ) : null}
      {profile?.matches.length ? (
        <section className="account-panel__section">
          <h3>{t("account.recentMatches")}</h3>
          {profile.matches.slice(0, 5).map((match) => (
            <div key={match.id} className="account-panel__match" data-result={match.result}>
              <span>{match.opponentName} · {match.mode === "ranked" ? t("account.mode.ranked") : t("account.mode.tournament")}</span>
              <strong>{match.result === "win" ? t("account.result.win") : match.result === "loss" ? t("account.result.loss") : t("account.result.draw")}</strong>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
