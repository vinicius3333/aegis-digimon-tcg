import type { Screen } from "./design/primitives";

export type TournamentRoute = { kind: "catalog" } | { kind: "create" } | { kind: "detail"; id: string };

export interface AppRoute {
  screen: Screen;
  profile?: boolean;
  replayId?: string;
  tournament?: TournamentRoute;
  /** The public deck open on the community screen; absent on the browse list. */
  communityDeckId?: string;
}

export const SCREEN_PATHS: Record<Screen, string> = {
  home: "/",
  login: "/login",
  lobby: "/play",
  deck: "/decks",
  collection: "/collection",
  community: "/community",
  tournaments: "/tournaments",
  settings: "/settings",
  releases: "/whats-new",
  replays: "/replays",
  game: "/play/game",
};

export function routeFromPathname(pathname: string): AppRoute | undefined {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (normalized === "/") return { screen: "home" };
  if (normalized === "/login") return { screen: "login" };
  if (normalized === "/play") return { screen: "lobby" };
  if (normalized === "/play/game") return { screen: "game" };
  if (normalized === "/decks") return { screen: "deck" };
  if (normalized === "/collection") return { screen: "collection" };
  if (normalized === "/community") return { screen: "community" };
  const communityDeck = /^\/community\/decks\/([^/]+)$/.exec(normalized)?.[1];
  if (communityDeck) return { screen: "community", communityDeckId: safeDecode(communityDeck) };
  if (normalized === "/profile") return { screen: "settings", profile: true };
  const replayId = /^\/replays\/([^/]+)$/.exec(normalized)?.[1];
  if (replayId) return { screen: "replays", replayId: safeDecode(replayId) };
  if (normalized === "/replays") return { screen: "replays" };
  if (normalized === "/settings") return { screen: "settings" };
  if (normalized === "/whats-new") return { screen: "releases" };
  return undefined;
}

export function pathForRoute(route: AppRoute): string {
  if (route.screen === "settings" && route.profile) return "/profile";
  if (route.screen === "replays" && route.replayId) return `/replays/${encodeURIComponent(route.replayId)}`;
  if (route.screen === "community" && route.communityDeckId)
    return `/community/decks/${encodeURIComponent(route.communityDeckId)}`;
  if (route.screen !== "tournaments") return SCREEN_PATHS[route.screen];
  if (route.tournament?.kind === "create") return "/tournaments/new";
  if (route.tournament?.kind === "detail") return `/tournaments/${encodeURIComponent(route.tournament.id)}`;
  return SCREEN_PATHS.tournaments;
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
