import type { Screen } from "./design/primitives";

export type TournamentRoute = { kind: "catalog" } | { kind: "create" } | { kind: "detail"; id: string };

export interface AppRoute {
  screen: Screen;
  tournament?: TournamentRoute;
}

export const SCREEN_PATHS: Record<Screen, string> = {
  home: "/",
  login: "/login",
  lobby: "/play",
  deck: "/decks",
  collection: "/collection",
  tournaments: "/tournaments",
  settings: "/settings",
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
  if (normalized === "/settings") return { screen: "settings" };
  return undefined;
}

export function pathForRoute(route: AppRoute): string {
  if (route.screen !== "tournaments") return SCREEN_PATHS[route.screen];
  if (route.tournament?.kind === "create") return "/tournaments/new";
  if (route.tournament?.kind === "detail") return `/tournaments/${encodeURIComponent(route.tournament.id)}`;
  return SCREEN_PATHS.tournaments;
}
