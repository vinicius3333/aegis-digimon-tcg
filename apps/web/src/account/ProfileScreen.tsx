import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { SavedReplay } from "@aegis/shared";
import { Avatar, Badge, Button, type PlayerIdentity } from "../design/primitives";
import { useTranslation } from "../i18n";
import { accountApi, type AccountProfile, type RemoteAccount } from "./client";
import { AccountPanel } from "./AccountPanel";
import { ProfileCustomize } from "./ProfileCustomize";
import type { DigimonWorldAvatarId } from "./avatars";
import { ReplaySharing } from "../replays/ReplaySharing";
import { ReplayLibraryPanel } from "../replays/ReplayLibraryPanel";
import { downloadSavedReplay, replayApi, replayPath } from "../replays/library";
import "./profile.css";
import "../replays/replays.css";

export function ProfileScreen({
  account,
  onAccountChange,
  player,
  tab = "matches",
  onTabChange,
  onGuestChange,
  onRefreshDiscordAvatar,
}: {
  account: RemoteAccount | null | undefined;
  onAccountChange?: (account: RemoteAccount) => void;
  player: PlayerIdentity;
  tab?: "matches" | "replays" | "customize";
  onTabChange: (tab: "matches" | "replays" | "customize") => void;
  onGuestChange?: (name: string, avatarId: DigimonWorldAvatarId | null) => void;
  onRefreshDiscordAvatar?: () => Promise<void>;
}) {
  const { t, locale } = useTranslation();
  const [profile, setProfile] = useState<AccountProfile>();
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [libraryRevision, setLibraryRevision] = useState(0);
  const [quota, setQuota] = useState<{ count: number; limit: number }>();
  const page = useRef<HTMLElement>(null);
  const positions = useRef({ matches: 0, replays: 0, customize: 0 });
  useLayoutEffect(() => {
    const element = page.current;
    if (!element) return;
    element.scrollTop = positions.current[tab];
    return () => {
      positions.current[tab] = element.scrollTop;
    };
  }, [tab]);
  useEffect(() => {
    let active = true;
    setQuota(undefined);
    if (account)
      void replayApi
        .list()
        .then((list) => {
          if (active && list.enabled) setQuota({ count: list.replays.length, limit: list.limit });
        })
        .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [account?.id, reload, libraryRevision]);
  function tabLink(next: "matches" | "replays" | "customize", label: string) {
    return (
      <a
        href={next === "matches" ? "/profile" : `/profile/${next}`}
        data-profile-tab={next}
        aria-current={tab === next ? "page" : undefined}
        onClick={(event) => {
          if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
            event.preventDefault();
            if (next !== tab) onTabChange(next);
          }
        }}
      >
        {label}
      </a>
    );
  }
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
    <main ref={page} className="profile-page">
      <header className="profile-page__heading">
        <div>
          <span>AEGIS / {t("profile.title")}</span>
          <h1>{t("profile.title")}</h1>
        </div>
        <a href="/settings">{t("settings.title")}</a>
      </header>
      <section className="profile-identity" aria-label={t("profile.title")}>
        <Avatar
          name={account?.displayName ?? player.name}
          avatarId={account ? account.avatarId : (player.guestAvatarId ?? player.avatarId)}
          avatarUrl={account?.avatarUrl}
          color={player.color}
          size={64}
          ring
        />
        <div className="profile-identity__name">
          <Badge tone={account ? "success" : "neutral"}>{t(account ? "account.connected" : "playerMenu.guest")}</Badge>
          <h2>{account?.displayName ?? player.name}</h2>
        </div>
        {tab !== "customize" ? tabLink("customize", t("profile.edit")) : null}
        {account && tab === "matches" ? (
          <div className="profile-identity__stats">
            <span>
              <strong>{matches.length}</strong>
              {t("profile.recentPlayed")}
            </span>
            <span>
              <strong>{matches.filter((match) => match.result === "win").length}</strong>
              {t("profile.recentWins")}
            </span>
          </div>
        ) : null}
      </section>
      <nav className="profile-tabs" aria-label={t("profile.navigation")}>
        {tabLink("matches", t("profile.matches"))}
        {tabLink("replays", `${t("replay.title")}${quota ? ` ${quota.count}/${quota.limit}` : ""}`)}
        {tabLink("customize", t("profile.customize"))}
      </nav>
      {account === undefined ? (
        <p role="status">{t("account.loading")}</p>
      ) : tab === "customize" ? (
        <>
          {!account ? (
            <p className="profile-guest-hint">
              {t("profile.guestHint")} <a href="/login">{t("nav.signIn")}</a>
            </p>
          ) : null}
          <ProfileCustomize
            key={account?.id ?? "guest"}
            account={account}
            player={player}
            onAccountChange={onAccountChange}
            onGuestChange={onGuestChange}
            onRefreshDiscordAvatar={onRefreshDiscordAvatar}
          />
        </>
      ) : !account ? (
        <AccountPanel account={account} onAccountChange={onAccountChange} />
      ) : (
        <>
          <div hidden={tab !== "matches"}>
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
                          {new Date(match.finishedAt).toLocaleString(locale, {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
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
          </div>
          <div id="saved-replays" hidden={tab !== "replays"}>
            <ReplayLibraryPanel
              refreshKey={libraryRevision}
              onOpen={async (_file, id) => {
                if (id) location.href = replayPath(id);
              }}
              onChange={() => setReload((value) => value + 1)}
            />
          </div>
        </>
      )}
    </main>
  );
}
