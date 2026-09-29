export const PREVIEW_BASE_PATH = "/dev/ui-preview";

export type PreviewPage = "home" | "play" | "arena" | "decks" | "collection" | "settings" | "brand";

export interface PreviewRoute {
  page: PreviewPage;
}

export const PREVIEW_PAGES: { page: Exclude<PreviewPage, "brand">; label: string }[] = [
  { page: "home", label: "Home" },
  { page: "play", label: "Play" },
  { page: "arena", label: "Arena" },
  { page: "decks", label: "Decks" },
  { page: "collection", label: "Collection" },
  { page: "settings", label: "Settings" },
];

const PAGES = new Set<string>(["home", "play", "arena", "decks", "collection", "settings", "brand"]);

function isPreviewPage(value: string | undefined): value is PreviewPage {
  return value !== undefined && PAGES.has(value);
}

export function isUiPreviewPath(pathname: string): boolean {
  return pathname === PREVIEW_BASE_PATH || pathname.startsWith(`${PREVIEW_BASE_PATH}/`);
}

export function previewRouteFromPath(pathname: string): PreviewRoute {
  const [page] = pathname.slice(PREVIEW_BASE_PATH.length).split("/").filter(Boolean);
  return { page: isPreviewPage(page) ? page : "home" };
}

export function previewPathFromRoute(route: PreviewRoute): string {
  return route.page === "home" ? PREVIEW_BASE_PATH : `${PREVIEW_BASE_PATH}/${route.page}`;
}
