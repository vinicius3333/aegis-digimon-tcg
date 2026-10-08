import { spectatorCodeFromSearch } from "./roomInvite";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { installAudioLifecycle } from "./design/sound";
import { Stage, TopNav, type PlayerIdentity, type Screen } from "./design/primitives";
import { AegisEmblem } from "./design/AegisLogo";
import { PixelBackdrop } from "./design/PixelBackdrop";
import { colorKey, type ColorName } from "./design/theme";
import {
  activeCollectionCards,
  copyDeckPreset,
  deckById,
  filterDeckToKnownCards,
  removeDeck,
  selectableDecks,
  upsertDeck,
  type DeckListing,
} from "./game/decks";
import type { AegisJoinOptions } from "./net/types";
import type { SeriesGameTicket } from "./net/useRoom";
import type { PrivateRoom, StartMode } from "./screens/Lobby";
import { loadMatchTimerPreference } from "./screens/matchTimerPreference";
import { loadMatchFormatPreference } from "./screens/matchFormatPreference";
import { Settings } from "./screens/Settings";
import { loadIdentity, saveIdentity, loadDecks, saveDecks, loadActiveDeckId, saveActiveDeckId } from "./identity";
import { accentForAvatar } from "./guest";
import { applyDarkMode, setDarkMode, useDarkMode } from "./design/darkMode";
import { setDeckEggSleeveId, setDeckSleeveId } from "./design/sleeve";
import { applyTextScale } from "./design/textScale";
import { InterfaceThemeDialog } from "./design/InterfaceThemePicker";
import { I18nProvider, useTranslation } from "./i18n";
import { accountApi, type RemoteAccount } from "./account/client";
import { communityApi } from "./community/client";
import { communityDeckListing } from "./community/communityDeckListing";
import { usePreferencesSync } from "./account/usePreferencesSync";
import { BugReportDialog } from "./bugs/BugReportDialog";
import { LeaveMatchDialog } from "./game/screen/layout/LeaveMatchDialog";
import { PlayerMenu } from "./account/PlayerMenu";
import type { DigimonWorldAvatarId } from "./account/avatars";
import { pathForRoute, routeFromPathname, type AppRoute } from "./routes";
import { roomCodeFromSearch } from "./roomInvite";
import { isBattleLabPath } from "./dev/BattleLab";
import { isUiPreviewPath } from "./prototype/routes";
import { SEQUENTIAL_PACING_ENABLED } from "./features";
import { clearReconnectSession, loadReconnectSession } from "./net/reconnectSession";

const Home = lazy(() => import("./screens/Home").then((m) => ({ default: m.Home })));
const ReleasesScreen = lazy(() => import("./releases/ReleasesScreen").then((m) => ({ default: m.ReleasesScreen })));
const Login = lazy(() => import("./screens/Login").then((m) => ({ default: m.Login })));
const Lobby = lazy(() => import("./screens/Lobby").then((m) => ({ default: m.Lobby })));
const Collection = lazy(() => import("./screens/Collection").then((m) => ({ default: m.Collection })));
const DeckBuilder = lazy(() => import("./screens/DeckBuilder").then((m) => ({ default: m.DeckBuilder })));
const CommunityScreen = lazy(() =>
  import("./screens/community/CommunityScreen").then((m) => ({ default: m.CommunityScreen })),
);
const GameScreen = lazy(() => import("./game/GameScreen").then((m) => ({ default: m.GameScreen })));
const CardEffectsDemo = lazy(() => import("./dev/CardEffectsDemo").then((m) => ({ default: m.CardEffectsDemo })));
const BoardShowcase = lazy(() => import("./dev/BoardShowcase").then((m) => ({ default: m.BoardShowcase })));
const BattleLab = lazy(() => import("./dev/BattleLab").then((m) => ({ default: m.BattleLab })));
const LiveArenaDemo = lazy(() => import("./dev/LiveArenaDemo").then((m) => ({ default: m.LiveArenaDemo })));
const EffectsLab = lazy(() => import("./dev/EffectsLab").then((m) => ({ default: m.EffectsLab })));
const EffectPromptGallery = lazy(() =>
  import("./dev/EffectPromptGallery").then((m) => ({ default: m.EffectPromptGallery })),
);
const MotionReference = lazy(() => import("./dev/MotionReference").then((m) => ({ default: m.MotionReference })));
const ArenaDemo = lazy(() => import("./dev/ArenaDemo").then((m) => ({ default: m.ArenaDemo })));
const BadgeLayoutLab = lazy(() => import("./dev/BadgeLayoutLab").then((m) => ({ default: m.BadgeLayoutLab })));
const UiPreview = lazy(() => import("./prototype/UiPreview").then((m) => ({ default: m.UiPreview })));
const MobileComponentsLab = lazy(() =>
  import("./dev/MobileComponentsLab").then((m) => ({ default: m.MobileComponentsLab })),
);

export function isBoardShowcasePath(pathname: string): boolean {
  return /^\/dev\/board\/?$/i.test(pathname);
}

export function isEffectsLabPath(pathname: string): boolean {
  return /^\/dev\/effects-lab\/?$/i.test(pathname);
}

export function isMobileComponentsLabPath(pathname: string): boolean {
  return /^\/dev\/mobile\/?$/i.test(pathname);
}

export function cardEffectsLabCardId(pathname: string): string | undefined {
  const match = /^\/dev\/card-effects\/([^/]+)\/?$/i.exec(pathname);
  if (!match?.[1]) return undefined;
  try {
    return decodeURIComponent(match[1]).toUpperCase();
  } catch {
    return match[1].toUpperCase();
  }
}

function ScreenFallback() {
  const { t } = useTranslation();
  return (
    <div className="aegis-screen-fallback" role="status" aria-live="polite">
      <span className="aegis-screen-fallback__mark" aria-hidden="true">
        <span className="aegis-loading-mark" />
        <AegisEmblem size={36} />
      </span>
      {t("common.loading")}
    </div>
  );
}

const NAV_SCREENS: Screen[] = ["home", "lobby", "deck", "community", "collection", "settings", "releases"];

export function withAccountAvatar(player: PlayerIdentity, account: RemoteAccount | null): PlayerIdentity {
  return {
    ...player,
    avatarId: account?.avatarId ?? null,
    avatarUrl: account?.avatarUrl ?? null,
  };
}

export function initialAppRoute({
  pathname,
  invitedRoomCode,
  hasReconnectSession,
  spectatorCode,
}: {
  pathname: string;
  invitedRoomCode: string | undefined;
  hasReconnectSession: boolean;
  spectatorCode?: string;
}): AppRoute {
  if (invitedRoomCode || spectatorCode) return { screen: "lobby" };
  const directRoute = routeFromPathname(pathname);
  if (directRoute?.screen === "game" && !hasReconnectSession) return { screen: "lobby" };
  return directRoute ?? { screen: "home" };
}

export function App() {
  useEffect(installAudioLifecycle, []);
  const pathname = window.location.pathname;
  const labCardId = cardEffectsLabCardId(pathname);
  return (
    <I18nProvider>
      <Suspense fallback={<ScreenFallback />}>
        {import.meta.env.DEV && /^\/dev\/effect-prompts\/?$/i.test(pathname) ? (
          <Stage>
            <EffectPromptGallery />
          </Stage>
        ) : import.meta.env.DEV && /^\/dev\/motion-reference\/?$/i.test(pathname) ? (
          <MotionReference />
        ) : /^\/dev\/badges\/?$/i.test(pathname) ? (
          <BadgeLayoutLab />
        ) : labCardId ? (
          <CardEffectsDemo cardId={labCardId} />
        ) : /^\/dev\/arena\/?$/i.test(pathname) ? (
          <Stage>
            {new URLSearchParams(window.location.search).get("mode") === "visual" ? <ArenaDemo /> : <LiveArenaDemo />}
          </Stage>
        ) : isEffectsLabPath(pathname) ? (
          <Stage>
            <EffectsLab />
          </Stage>
        ) : isBoardShowcasePath(pathname) ? (
          <BoardShowcase />
        ) : isBattleLabPath(pathname) ? (
          <BattleLab />
        ) : isMobileComponentsLabPath(pathname) ? (
          <MobileComponentsLab />
        ) : isUiPreviewPath(pathname) ? (
          <UiPreview />
        ) : (
          <AppShell />
        )}
      </Suspense>
    </I18nProvider>
  );
}

function AppShell() {
  const [player, setPlayer] = useState<PlayerIdentity>(loadIdentity);
  const [decks, setDecks] = useState<DeckListing[]>(loadDecks);
  const [activeDeckId, setActiveDeckId] = useState<string>(() => loadActiveDeckId(selectableDecks(loadDecks())));
  const dark = useDarkMode();
  const setDark = setDarkMode;
  const [account, setAccount] = useState<RemoteAccount | null>();

  useEffect(() => {
    saveIdentity(player);
  }, [player]);

  useEffect(() => {
    saveDecks(decks);
  }, [decks]);

  useEffect(() => {
    void (async () => {
      const remoteAccount = await accountApi.me();
      setAccount(remoteAccount);
      setPlayer((current) => withAccountAvatar(current, remoteAccount));
      if (!remoteAccount) return;
      const remote = await accountApi.decks();
      const remoteIds = new Set(remote.map((deck) => deck.id));
      const localDecks = loadDecks();
      const localOnly = localDecks.filter((deck) => !remoteIds.has(deck.id)).slice(0, Math.max(0, 100 - remote.length));
      for (const deck of localOnly) await accountApi.saveDeck(deck);
      // Decks saved before the api stored covers come back without one; keep the local choice and backfill it.
      const localCovers = new Map(localDecks.map((deck) => [deck.id, deck.coverCardId]));
      const backfilled = remote
        .filter((deck) => !deck.coverCardId && localCovers.get(deck.id))
        .map((deck) => ({ ...deck, coverCardId: localCovers.get(deck.id) }));
      for (const deck of backfilled) await accountApi.saveDeck(deck);
      setDecks((local) => [...remote, ...backfilled].reduce((all, deck) => upsertDeck(all, deck), local));
    })().catch(() => setAccount(null));
  }, []);

  useEffect(() => {
    saveActiveDeckId(activeDeckId);
  }, [activeDeckId]);

  useEffect(applyDarkMode, []);
  useEffect(applyTextScale, []);

  usePreferencesSync({ accountId: account?.id, dark, setDark });

  const saveDeck = (deck: DeckListing, setActive: boolean) => {
    const filtered = { ...filterDeckToKnownCards(deck), updatedAt: Date.now() };
    setDecks((ds) => upsertDeck(ds, filtered));
    void accountApi
      .me()
      .then((remoteAccount) => (remoteAccount ? accountApi.saveDeck(filtered) : undefined))
      .catch(() => undefined);
    if (setActive) setActiveDeckId(deck.id);
  };

  const deleteDeck = (id: string) => {
    const remaining = removeDeck(decks, id);
    setDecks(remaining);
    if (activeDeckId === id) setActiveDeckId(selectableDecks(remaining)[0]?.id ?? "");
    void accountApi
      .me()
      .then((remoteAccount) => (remoteAccount ? accountApi.deleteDeck(id) : undefined))
      .catch(() => undefined);
  };

  const shared = {
    player,
    setPlayer,
    account,
    setAccount,
    decks,
    activeDeckId,
    setActiveDeckId,
    saveDeck,
    deleteDeck,
    dark,
    setDark,
  };

  return <AegisClient {...shared} />;
}

interface ClientProps {
  player: PlayerIdentity;
  setPlayer: (update: (p: PlayerIdentity) => PlayerIdentity) => void;
  account?: RemoteAccount | null;
  setAccount?: (account: RemoteAccount | null) => void;
  decks: DeckListing[];
  activeDeckId: string;
  setActiveDeckId: (id: string) => void;
  saveDeck: (deck: DeckListing, setActive: boolean) => void;
  deleteDeck: (id: string) => void;
  dark: boolean;
  setDark: (v: boolean) => void;
  initialScreen?: Screen;
}

export function AegisClient({
  player,
  setPlayer,
  account = null,
  setAccount,
  decks,
  activeDeckId,
  setActiveDeckId,
  saveDeck,
  deleteDeck,
  dark,
  setDark,
  initialScreen,
}: ClientProps) {
  const { t } = useTranslation();
  const effectivePlayer = useMemo<PlayerIdentity>(
    () =>
      account
        ? {
            ...player,
            name: account.displayName,
            avatarId: account.avatarId,
            avatarUrl: account.avatarUrl,
          }
        : {
            ...player,
            avatarId: player.guestAvatarId ?? null,
            avatarUrl: null,
          },
    [account, player],
  );
  const [invitedRoomCode] = useState(() => (initialScreen ? undefined : roomCodeFromSearch(window.location.search)));
  const [route, setRoute] = useState<AppRoute>(() => {
    if (initialScreen) return { screen: initialScreen };
    return initialAppRoute({
      pathname: window.location.pathname,
      invitedRoomCode,
      spectatorCode: spectatorCodeFromSearch(window.location.search),
      hasReconnectSession: loadReconnectSession() !== undefined,
    });
  });
  const [timerOptions, setTimerOptions] = useState(() => ({
    matchTimer: loadMatchTimerPreference(),
    timerStartSeconds: 300,
    timerRefillSeconds: 60,
  }));
  const [bestOf, setBestOf] = useState(loadMatchFormatPreference);
  /** Set between the games of a best-of-three: the next GameScreen takes this seat. */
  const [seriesGame, setSeriesGame] = useState<SeriesGameTicket>();
  const [startMode, setStartMode] = useState<StartMode>("casual");
  const [editingDeck, setEditingDeck] = useState<DeckListing | null>(null);
  // A community deck picked to play with. It lives for this session only and is never saved.
  const [borrowedDeck, setBorrowedDeck] = useState<DeckListing>();
  const [roomCode, setRoomCode] = useState<string>();
  const [privateRoom, setPrivateRoom] = useState<PrivateRoom>();
  const [botDeckId, setBotDeckId] = useState<string>();
  const [unlimited, setUnlimited] = useState(false);
  const [deckFormat, setDeckFormat] = useState<import("@aegis/shared").DeckFormat>("standard");
  const [betaBattleMode, setBetaBattleMode] = useState(false);
  const [matchDeckId, setMatchDeckId] = useState<string>();
  const [matchNumber, setMatchNumber] = useState(0);
  const [playerMenuOpen, setPlayerMenuOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [leaveMatchPromptOpen, setLeaveMatchPromptOpen] = useState(false);
  const leaveForfeitsMatchRef = useRef(false);
  const leaveMatchConfirmedRef = useRef(false);
  const setLeaveForfeitsMatch = useCallback((forfeits: boolean) => {
    leaveForfeitsMatchRef.current = forfeits;
    if (!forfeits) setLeaveMatchPromptOpen(false);
  }, []);
  const screen = route.screen;
  useEffect(() => {
    if (screen !== "deck") setEditingDeck(null);
  }, [screen]);

  useEffect(() => {
    if (initialScreen) return;
    const expectedPath = pathForRoute(route);
    if (window.location.pathname !== expectedPath) window.history.replaceState(null, "", expectedPath);
  }, []);

  /* Coming back from the Discord round trip lands on /login with a session; there
     is nothing left to sign in to, so the screen hands over to home. */
  useEffect(() => {
    if (initialScreen || !account || screen !== "login") return;
    if (window.location.pathname !== pathForRoute({ screen: "home" })) {
      window.history.replaceState(null, "", pathForRoute({ screen: "home" }));
    }
    setRoute({ screen: "home" });
  }, [account, screen, initialScreen]);

  useEffect(() => {
    if (initialScreen) return;
    const onPopState = () => {
      const nextRoute = routeFromPathname(window.location.pathname);
      const resolvedRoute: AppRoute =
        nextRoute?.screen === "game" && !loadReconnectSession()
          ? { screen: "lobby" }
          : (nextRoute ?? { screen: "home" });
      /* The browser has already moved off the match URL, so the guard restores it and
         asks. Confirming steps back again, which lands on the route the player chose. */
      if (leaveForfeitsMatchRef.current && resolvedRoute.screen !== "game" && !leaveMatchConfirmedRef.current) {
        window.history.pushState(null, "", pathForRoute({ screen: "game" }));
        setLeaveMatchPromptOpen(true);
        return;
      }
      leaveMatchConfirmedRef.current = false;
      setRoute(resolvedRoute);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [initialScreen]);

  const confirmLeaveMatch = () => {
    leaveMatchConfirmedRef.current = true;
    setLeaveMatchPromptOpen(false);
    window.history.back();
  };

  const navigate = (nextRoute: AppRoute) => {
    if (!initialScreen) {
      const path = pathForRoute(nextRoute);
      if (window.location.pathname !== path) window.history.pushState(null, "", path);
    }
    setRoute(nextRoute);
  };
  const navigateScreen = (nextScreen: Screen) => navigate({ screen: nextScreen });

  const availableDecks = useMemo(
    () => (borrowedDeck ? [borrowedDeck, ...selectableDecks(decks)] : selectableDecks(decks)),
    [borrowedDeck, decks],
  );
  const matchDeck = deckById(availableDecks, matchDeckId ?? activeDeckId);
  const matchSleeveId = screen === "game" ? matchDeck?.sleeveId : undefined;
  useEffect(() => setDeckSleeveId(matchSleeveId), [matchSleeveId]);
  const matchEggSleeveId = screen === "game" ? matchDeck?.eggSleeveId : undefined;
  useEffect(() => setDeckEggSleeveId(matchEggSleeveId), [matchEggSleeveId]);
  const collectionSize = useMemo(() => activeCollectionCards().length, []);
  const identityColor: ColorName = colorKey(player.color);

  const customBotDeck =
    startMode === "bot" && botDeckId?.startsWith("mine:")
      ? decks.find((deck) => deck.id === botDeckId.slice(5))
      : undefined;
  const joinOptions = useMemo<AegisJoinOptions>(
    () => ({
      ...timerOptions,
      bestOf,
      format: deckFormat,
      displayName: effectivePlayer.name,
      avatarId: effectivePlayer.avatarId ?? undefined,
      deckId: matchDeck?.id,
      deckName: matchDeck?.name,
      botDeck: customBotDeck
        ? {
            mainDeck: customBotDeck.mainDeck,
            eggDeck: customBotDeck.eggDeck,
            mainDeckArts: customBotDeck.mainDeckArts,
            eggDeckArts: customBotDeck.eggDeckArts,
          }
        : undefined,
      deck: {
        mainDeck: matchDeck?.mainDeck ?? [],
        eggDeck: matchDeck?.eggDeck ?? [],
        mainDeckArts: matchDeck?.mainDeckArts,
        eggDeckArts: matchDeck?.eggDeckArts,
      },
    }),
    [effectivePlayer.name, effectivePlayer.avatarId, matchDeck, timerOptions, bestOf, customBotDeck, deckFormat],
  );

  const showNav = NAV_SCREENS.includes(screen);

  const selectAvatar = async (avatarId: DigimonWorldAvatarId | null) => {
    if (account) {
      const updated = await accountApi.updateAvatar(avatarId);
      if (updated) setAccount?.({ ...account, ...updated });
      return;
    }
    setPlayer((p) => ({ ...p, guestAvatarId: avatarId, color: accentForAvatar(avatarId, colorKey(p.color)) }));
  };

  const refreshDiscordAvatar = async () => {
    const updated = await accountApi.refreshDiscordAvatar();
    if (account) setAccount?.({ ...account, ...updated });
  };

  return (
    <Stage>
      {screen === "game" ? null : <PixelBackdrop />}
      {showNav ? (
        <TopNav
          screen={screen}
          onNav={navigateScreen}
          player={effectivePlayer}
          signedIn={!!account}
          onOpenPlayerMenu={() => setPlayerMenuOpen(true)}
          dark={dark}
          onToggleDark={setDark}
          onOpenTheme={() => setThemeOpen(true)}
          onSendFeedback={() => setBugReportOpen(true)}
        />
      ) : null}

      <div id="aegis-main" className={`aegis-screen-region${showNav ? " aegis-screen-region--nav" : ""}`} tabIndex={-1}>
        <Suspense fallback={<ScreenFallback />}>
          {screen === "home" && (
            <Home
              collectionSize={collectionSize}
              signedIn={!!account}
              onPlay={() => navigateScreen("lobby")}
              onBuildDeck={() => navigateScreen("deck")}
              onOpenCollection={() => navigateScreen("collection")}
              onSignIn={() => navigateScreen("login")}
              onReportBug={() => setBugReportOpen(true)}
              onOpenReleases={() => navigateScreen("releases")}
            />
          )}

          {screen === "login" && <Login onBack={() => navigateScreen("home")} />}

          {screen === "lobby" && (
            <Lobby
              player={effectivePlayer}
              decks={decks}
              borrowedDeck={borrowedDeck}
              onBorrowCommunityDeck={(id) => {
                void communityApi
                  .deck(id)
                  .then((deck) => {
                    const listing = communityDeckListing(deck);
                    setBorrowedDeck(listing);
                    setActiveDeckId(listing.id);
                  })
                  .catch(() => undefined);
              }}
              onOpenCommunityDeck={(id) => navigate({ screen: "community", communityDeckId: id })}
              accountId={account?.id}
              activeDeckId={activeDeckId}
              onSelectDeck={setActiveDeckId}
              onCopyDeck={(preset) => {
                const copy = copyDeckPreset(preset, decks);
                saveDeck(copy, true);
                navigateScreen("deck");
              }}
              onEditDeck={(deck) => {
                setEditingDeck(deck);
                navigateScreen("deck");
              }}
              onNav={navigateScreen}
              timerOptions={timerOptions}
              onTimerOptionsChange={setTimerOptions}
              bestOf={bestOf}
              onBestOfChange={setBestOf}
              invitedRoomCode={invitedRoomCode}
              privateRoom={privateRoom}
              onLeavePrivateRoom={() => setPrivateRoom(undefined)}
              onStart={(
                mode,
                code,
                requestedBotDeckId,
                requestedBetaBattleMode,
                requestedDeckId,
                requestedUnlimited,
                requestedFormat,
              ) => {
                // A lobby start explicitly requests a new match, even if a page
                // reload left a resumable seat from the previous match in storage.
                clearReconnectSession();
                setSeriesGame(undefined);
                if (mode !== "private_host" && mode !== "private_guest") setPrivateRoom(undefined);
                setStartMode(mode);
                setRoomCode(code);
                setBotDeckId(requestedBotDeckId);
                setBetaBattleMode(requestedBetaBattleMode === true);
                setUnlimited(requestedUnlimited === true);
                setDeckFormat(
                  requestedFormat ?? (mode === "unlimited" || requestedUnlimited ? "unlimited" : "standard"),
                );
                setMatchDeckId(requestedDeckId);
                navigateScreen("game");
              }}
            />
          )}

          {screen === "deck" && (
            <DeckBuilder
              initialEditingDeck={editingDeck}
              decks={decks}
              activeDeckId={activeDeckId}
              onSelectDeck={setActiveDeckId}
              onSaveDeck={saveDeck}
              onDeleteDeck={deleteDeck}
              signedIn={!!account}
              onNav={(next) => {
                setEditingDeck(null);
                navigateScreen(next);
              }}
            />
          )}

          {screen === "community" && (
            <CommunityScreen
              deckId={route.communityDeckId}
              signedIn={!!account}
              accountId={account?.id}
              isAdmin={account?.isAdmin === true}
              onOpenDeck={(id) => navigate({ screen: "community", communityDeckId: id })}
              onBack={() => navigate({ screen: "community" })}
              onPlay={(deck) => {
                const listing = communityDeckListing(deck);
                setBorrowedDeck(listing);
                setActiveDeckId(listing.id);
                navigateScreen("lobby");
              }}
              onCopy={(deck) => {
                saveDeck(
                  {
                    ...copyDeckPreset(communityDeckListing(deck), decks),
                    blurb: t("community.byAuthor", { name: deck.author.displayName }),
                  },
                  false,
                );
                if (account) void communityApi.recordCopy(deck.id).catch(() => undefined);
              }}
            />
          )}

          {screen === "collection" && <Collection />}

          {screen === "releases" && <ReleasesScreen />}

          {screen === "settings" && (
            <Settings
              player={effectivePlayer}
              account={account}
              dark={dark}
              onToggleDark={setDark}
              onRename={(name) => setPlayer((p) => ({ ...p, name }))}
              onSelectAvatar={(avatarId) => setPlayer((p) => ({ ...p, guestAvatarId: avatarId }))}
              onAccountChange={(updated) => setAccount?.(updated && { ...account, ...updated })}
            />
          )}

          {screen === "game" && (
            <GameScreen
              key={matchNumber}
              joinOptions={joinOptions}
              identityColor={identityColor}
              identityAvatarId={effectivePlayer.avatarId}
              identityAvatarUrl={effectivePlayer.avatarUrl}
              startMode={startMode}
              roomCode={roomCode}
              waitForHost={startMode === "private_guest" && privateRoom?.code === roomCode}
              botDeckId={botDeckId}
              betaBattleMode={betaBattleMode}
              unlimited={unlimited}
              seriesGame={seriesGame}
              onSeriesNext={(ticket) => {
                clearReconnectSession();
                setSeriesGame(ticket);
                setMatchNumber((current) => current + 1);
              }}
              presentationPacing={SEQUENTIAL_PACING_ENABLED ? "sequential" : "current"}
              signedIn={!!account}
              onLeaveForfeitsChange={setLeaveForfeitsMatch}
              onExit={(next) => {
                setSeriesGame(undefined);
                navigateScreen(next);
              }}
              onRematch={(privateRoomCode, roomUnlimited, roomHost, roomFormat) => {
                clearReconnectSession();
                setSeriesGame(undefined);
                if (privateRoomCode) {
                  setPrivateRoom({
                    code: privateRoomCode,
                    host: roomHost ?? startMode === "private_host",
                    unlimited: roomUnlimited,
                    format: roomFormat,
                  });
                  navigateScreen("lobby");
                  return;
                }
                setMatchNumber((current) => current + 1);
              }}
            />
          )}
        </Suspense>
      </div>

      {playerMenuOpen ? (
        <PlayerMenu
          player={effectivePlayer}
          signedIn={!!account}
          selectedAvatarId={effectivePlayer.avatarId ?? null}
          onSelectAvatar={selectAvatar}
          onRefreshDiscordAvatar={account?.discordLinked ? refreshDiscordAvatar : undefined}
          onNav={navigateScreen}
          onSignOut={account ? () => void accountApi.logout().then(() => location.reload()) : undefined}
          onReportBug={() => setBugReportOpen(true)}
          onClose={() => setPlayerMenuOpen(false)}
        />
      ) : null}

      {themeOpen ? (
        <InterfaceThemeDialog dark={dark} onToggleDark={setDark} onClose={() => setThemeOpen(false)} />
      ) : null}
      {bugReportOpen ? <BugReportDialog signedIn={!!account} onClose={() => setBugReportOpen(false)} /> : null}
      {leaveMatchPromptOpen ? (
        <LeaveMatchDialog onConfirm={confirmLeaveMatch} onClose={() => setLeaveMatchPromptOpen(false)} />
      ) : null}
    </Stage>
  );
}
