import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Stage, TopNav, type PlayerIdentity, type Screen } from "./design/primitives";
import { colorKey, type ColorName } from "./design/theme";
import {
  activeCollectionCards,
  copyDeckPreset,
  deckById,
  filterDeckToKnownCards,
  selectableDecks,
  upsertDeck,
  type DeckListing,
} from "./game/decks";
import type { AegisJoinOptions } from "./net/types";
import type { StartMode } from "./screens/Lobby";
import { Settings } from "./screens/Settings";
import { loadIdentity, saveIdentity, loadDecks, saveDecks, loadActiveDeckId, saveActiveDeckId } from "./identity";
import { accentForAvatar } from "./guest";
import { I18nProvider, useTranslation } from "./i18n";
import { accountApi, type RemoteAccount } from "./account/client";
import { BugReportDialog } from "./bugs/BugReportDialog";
import { PlayerMenu } from "./account/PlayerMenu";
import type { DigimonWorldAvatarId } from "./account/avatars";
import { pathForRoute, routeFromPathname, type AppRoute } from "./routes";
import { isBattleLabPath } from "./dev/BattleLab";

const Home = lazy(() => import("./screens/Home").then((m) => ({ default: m.Home })));
const Login = lazy(() => import("./screens/Login").then((m) => ({ default: m.Login })));
const Lobby = lazy(() => import("./screens/Lobby").then((m) => ({ default: m.Lobby })));
const Collection = lazy(() => import("./screens/Collection").then((m) => ({ default: m.Collection })));
const DeckBuilder = lazy(() => import("./screens/DeckBuilder").then((m) => ({ default: m.DeckBuilder })));
const GameScreen = lazy(() => import("./game/GameScreen").then((m) => ({ default: m.GameScreen })));
const CardEffectsDemo = lazy(() => import("./dev/CardEffectsDemo").then((m) => ({ default: m.CardEffectsDemo })));
const BoardShowcase = lazy(() => import("./dev/BoardShowcase").then((m) => ({ default: m.BoardShowcase })));
const BattleLab = lazy(() => import("./dev/BattleLab").then((m) => ({ default: m.BattleLab })));

export function isBoardShowcasePath(pathname: string): boolean {
  return /^\/dev\/board\/?$/i.test(pathname);
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
      <span className="aegis-loading-mark" aria-hidden="true" />
      {t("common.loading")}
    </div>
  );
}

const NAV_SCREENS: Screen[] = ["home", "lobby", "deck", "collection", "settings"];

export function withAccountAvatar(player: PlayerIdentity, account: RemoteAccount | null): PlayerIdentity {
  return {
    ...player,
    avatarId: account?.avatarId ?? null,
    avatarUrl: account?.avatarUrl ?? null,
  };
}

export function App() {
  const pathname = window.location.pathname;
  const labCardId = cardEffectsLabCardId(pathname);
  return (
    <I18nProvider>
      <Suspense fallback={<ScreenFallback />}>
        {labCardId ? (
          <CardEffectsDemo cardId={labCardId} />
        ) : isBoardShowcasePath(pathname) ? (
          <BoardShowcase />
        ) : isBattleLabPath(pathname) ? (
          <BattleLab />
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
  const [dark, setDark] = useState(false);
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
      const localOnly = loadDecks()
        .filter((deck) => !remoteIds.has(deck.id))
        .slice(0, Math.max(0, 100 - remote.length));
      for (const deck of localOnly) await accountApi.saveDeck(deck);
      setDecks((local) => remote.reduce((all, deck) => upsertDeck(all, deck), local));
    })().catch(() => setAccount(null));
  }, []);

  useEffect(() => {
    saveActiveDeckId(activeDeckId);
  }, [activeDeckId]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const saveDeck = (deck: DeckListing, setActive: boolean) => {
    const filtered = filterDeckToKnownCards(deck);
    setDecks((ds) => upsertDeck(ds, filtered));
    void accountApi
      .me()
      .then((remoteAccount) => (remoteAccount ? accountApi.saveDeck(filtered) : undefined))
      .catch(() => undefined);
    if (setActive) setActiveDeckId(deck.id);
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
  dark,
  setDark,
  initialScreen,
}: ClientProps) {
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
  const [route, setRoute] = useState<AppRoute>(() => {
    if (initialScreen) return { screen: initialScreen };
    const directRoute = routeFromPathname(window.location.pathname);
    if (directRoute?.screen === "game") return { screen: "lobby" };
    return directRoute ?? { screen: "home" };
  });
  const [startMode, setStartMode] = useState<StartMode>("casual");
  const [roomCode, setRoomCode] = useState<string>();
  const [botDeckId, setBotDeckId] = useState<string>();
  const [playerMenuOpen, setPlayerMenuOpen] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const screen = route.screen;

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
      setRoute(nextRoute?.screen === "game" ? { screen: "lobby" } : (nextRoute ?? { screen: "home" }));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [initialScreen]);

  const navigate = (nextRoute: AppRoute) => {
    if (!initialScreen) {
      const path = pathForRoute(nextRoute);
      if (window.location.pathname !== path) window.history.pushState(null, "", path);
    }
    setRoute(nextRoute);
  };
  const navigateScreen = (nextScreen: Screen) => navigate({ screen: nextScreen });

  const availableDecks = useMemo(() => selectableDecks(decks), [decks]);
  const activeDeck = deckById(availableDecks, activeDeckId);
  const collectionSize = useMemo(() => activeCollectionCards().length, []);
  const identityColor: ColorName = colorKey(player.color);

  const joinOptions = useMemo<AegisJoinOptions>(
    () => ({
      displayName: effectivePlayer.name,
      deckId: activeDeck?.id,
      deckName: activeDeck?.name,
      deck: { mainDeck: activeDeck?.mainDeck ?? [], eggDeck: activeDeck?.eggDeck ?? [] },
    }),
    [effectivePlayer.name, activeDeck],
  );

  const showNav = NAV_SCREENS.includes(screen);

  const selectAvatar = async (avatarId: DigimonWorldAvatarId) => {
    if (account) {
      const updated = await accountApi.updateAvatar(avatarId).catch(() => undefined);
      if (updated) setAccount?.(updated);
      return;
    }
    setPlayer((p) => ({ ...p, guestAvatarId: avatarId, color: accentForAvatar(avatarId, colorKey(p.color)) }));
  };

  return (
    <Stage>
      {showNav ? (
        <TopNav
          screen={screen}
          onNav={navigateScreen}
          player={effectivePlayer}
          signedIn={!!account}
          onOpenPlayerMenu={() => setPlayerMenuOpen(true)}
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
              onSignIn={() => navigateScreen("login")}
              onReportBug={() => setBugReportOpen(true)}
            />
          )}

          {screen === "login" && <Login onBack={() => navigateScreen("home")} />}

          {screen === "lobby" && (
            <Lobby
              player={effectivePlayer}
              decks={decks}
              activeDeckId={activeDeckId}
              onSelectDeck={setActiveDeckId}
              onCopyDeck={(preset) => {
                const copy = copyDeckPreset(preset, decks);
                saveDeck(copy, true);
                navigateScreen("deck");
              }}
              onNav={navigateScreen}
              onStart={(mode, code, requestedBotDeckId) => {
                setStartMode(mode);
                setRoomCode(code);
                setBotDeckId(requestedBotDeckId);
                navigateScreen("game");
              }}
            />
          )}

          {screen === "deck" && (
            <DeckBuilder
              decks={decks}
              activeDeckId={activeDeckId}
              onSelectDeck={setActiveDeckId}
              onSaveDeck={saveDeck}
              onNav={navigateScreen}
            />
          )}

          {screen === "collection" && <Collection />}

          {screen === "settings" && (
            <Settings
              player={effectivePlayer}
              account={account}
              dark={dark}
              onToggleDark={setDark}
              onRename={(name) => setPlayer((p) => ({ ...p, name }))}
              onSelectAvatar={(avatarId) => setPlayer((p) => ({ ...p, guestAvatarId: avatarId }))}
              onAccountChange={(updated) => setAccount?.(updated)}
            />
          )}

          {screen === "game" && (
            <GameScreen
              joinOptions={joinOptions}
              identityColor={identityColor}
              identityAvatarId={effectivePlayer.avatarId}
              identityAvatarUrl={effectivePlayer.avatarUrl}
              startMode={startMode}
              roomCode={roomCode}
              botDeckId={botDeckId}
              signedIn={!!account}
              onExit={navigateScreen}
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
          onNav={navigateScreen}
          onSignOut={account ? () => void accountApi.logout().then(() => location.reload()) : undefined}
          onReportBug={() => setBugReportOpen(true)}
          onClose={() => setPlayerMenuOpen(false)}
        />
      ) : null}

      {bugReportOpen ? <BugReportDialog signedIn={!!account} onClose={() => setBugReportOpen(false)} /> : null}
    </Stage>
  );
}
