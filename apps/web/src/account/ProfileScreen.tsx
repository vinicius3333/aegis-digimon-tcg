import { useEffect, useState } from "react";
import type { SavedReplay } from "@aegis/shared";
import { Avatar, Badge, Button, Dialog } from "../design/primitives";
import { useTranslation } from "../i18n";
import { accountApi, type AccountProfile, type RemoteAccount } from "./client";
import { AccountPanel } from "./AccountPanel";
import { ReplaySharing } from "../replays/ReplaySharing";
import { ReplayLibraryPanel } from "../replays/ReplayLibraryPanel";
import { downloadSavedReplay, replayApi, replayPath } from "../replays/library";
import "./profile.css";
import "../replays/replays.css";

export function ProfileScreen({
  account,
  onAccountChange,
}: {
  account: RemoteAccount | null | undefined;
  onAccountChange?: (account: RemoteAccount) => void;
}) {
  const { t, locale } = useTranslation();
  const [profile, setProfile] = useState<AccountProfile>();
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [libraryRevision, setLibraryRevision] = useState(0);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<string>();
  useEffect(() => {
    let active = true;
    setProfile(undefined);
    setError(false);
    if (account)
      void accountApi
        .profile()
        .then((next) => {
          if (active) setProfile(next);
        })
        .catch(() => {
          if (active) setError(true);
        });
    return () => {
      active = false;
    };
  }, [account?.id, reload]);
  function changed(replay: SavedReplay) {
    setLibraryRevision((value) => value + 1);
    setProfile((current) =>
      current
        ? {
            ...current,
            matches: current.matches.map((match) => (match.replay?.id === replay.id ? { ...match, replay } : match)),
          }
        : current,
    );
  }
  async function download(replay: SavedReplay) {
    setBusy(replay.id);
    try {
      downloadSavedReplay(replay.id, await replayApi.file(replay.id));
    } catch {
      setError(true);
    } finally {
      setBusy(undefined);
    }
  }
  const matches = profile?.matches.slice(0, 10) ?? [];
  return (
    <main className="profile-page">
      <header className="profile-page__heading">
        <div>
          <span>AEGIS / {t("profile.title")}</span>
          <h1>{t("profile.title")}</h1>
        </div>
        <a href="/settings">{t("settings.title")}</a>
      </header>
      {!account ? (
        <AccountPanel account={account} onAccountChange={onAccountChange} />
      ) : (
        <>
          <section className="profile-identity" aria-label={t("profile.title")}>
            <Avatar
              name={account.displayName}
              avatarId={account.avatarId}
              avatarUrl={account.avatarUrl}
              size={80}
              ring
            />
            <div className="profile-identity__name">
              <Badge tone="success">{t("account.connected")}</Badge>
              <h2>{account.displayName}</h2>
            </div>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              {t("profile.edit")}
            </Button>
            <div className="profile-identity__stats">
              <span>
                <strong>{matches.length}</strong>
                {t("profile.recentPlayed")}
              </span>
              <span>
                <strong>{matches.filter((match) => match.result === "win").length}</strong>
                {t("profile.recentWins")}
              </span>
              <a href="#saved-replays">{t("replay.library")} →</a>
            </div>
          </section>
          <section className="profile-history" aria-labelledby="profile-history-title">
            <header>
              <div>
                <h2 id="profile-history-title">{t("profile.history")}</h2>
                <p>{t("profile.historyHint")}</p>
              </div>
              <span>{matches.length} / 10</span>
            </header>
            {error ? (
              <div role="alert">
                <p>{t("profile.error")}</p>
                <Button variant="secondary" onClick={() => setReload((value) => value + 1)}>
                  {t("replay.retry")}
                </Button>
              </div>
            ) : null}
            {!profile && !error ? <p role="status">{t("account.loading")}</p> : null}
            {profile && !matches.length ? (
              <div className="profile-history__empty">
                <h3>{t("profile.empty")}</h3>
                <p>{t("profile.saveHint")}</p>
                <a href="/play">{t("nav.play")}</a>
              </div>
            ) : null}
            <ol className="profile-matches">
              {matches.map((match) => (
                <li key={match.id} data-result={match.result}>
                  <div className="profile-matches__result">
                    <span>{t(`account.result.${match.result}`)}</span>
                    <small>{t(`replay.mode.${match.mode}`)}</small>
                  </div>
                  <div className="profile-matches__opponent">
                    <Avatar name={match.opponentName} size={36} />
                    <div>
                      <strong>{match.opponentName}</strong>
                      <time dateTime={new Date(match.finishedAt).toISOString()}>
                        {new Date(match.finishedAt).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })}
                      </time>
                    </div>
                  </div>
                  {match.replay ? (
                    <div className="profile-matches__actions">
                      <a className="profile-watch" href={replayPath(match.replay.id)}>
                        {t("replay.watchAction")}
                      </a>
                      <a className="profile-mp4" href={`${replayPath(match.replay.id)}?export=mp4`}>
                        MP4
                      </a>
                      <ReplaySharing replay={match.replay} onChange={changed} />
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy !== undefined}
                        onClick={() => void download(match.replay!)}
                      >
                        {t("replay.download")}
                      </Button>
                    </div>
                  ) : (
                    <span className="profile-matches__missing" title={t("profile.saveHint")}>
                      {t("profile.noReplay")}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </section>
          <div id="saved-replays">
            <ReplayLibraryPanel
              refreshKey={libraryRevision}
              onOpen={async (_file, id) => {
                if (id) location.href = replayPath(id);
              }}
              onChange={() => setReload((value) => value + 1)}
            />
          </div>
          {editing ? (
            <Dialog className="profile-edit" labelledBy="profile-edit-title" onClose={() => setEditing(false)}>
              <header>
                <h2 id="profile-edit-title">{t("profile.edit")}</h2>
                <Button variant="ghost" onClick={() => setEditing(false)}>
                  {t("common.close")}
                </Button>
              </header>
              <AccountPanel account={account} onAccountChange={onAccountChange} />
            </Dialog>
          ) : null}
        </>
      )}
    </main>
  );
}
