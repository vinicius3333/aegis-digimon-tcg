import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ChevronRight,
  Gamepad2,
  House,
  Layers,
  LibraryBig,
  LogIn,
  Menu,
  Moon,
  Settings,
  Sun,
  Swords,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AegisLogo } from "./AegisLogo";
import { PREVIEW_PAGES, type PreviewRoute } from "./routes";

function NavLink({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative rounded-md px-3 py-2 font-display text-xs font-bold tracking-[0.08em] text-ink-nav uppercase transition-colors hover:bg-white/8 hover:text-on-ink",
        active &&
          "text-on-ink after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-signal",
      )}
    >
      {children}
    </button>
  );
}

const PAGE_ICONS: Record<(typeof PREVIEW_PAGES)[number]["page"], LucideIcon> = {
  home: House,
  play: Swords,
  arena: Gamepad2,
  decks: Layers,
  collection: LibraryBig,
  settings: Settings,
};

/* Phones get their own menu: full-width rows with icons, the current page
   marked by a side bar, and the actions the header has no room for. A
   backdrop below it closes the menu, and so does Escape. */
function MobileMenu({
  route,
  go,
  onClose,
}: {
  route: PreviewRoute;
  go: (route: PreviewRoute) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div
        aria-hidden
        className="fixed inset-x-0 top-16 bottom-0 bg-ink/55 backdrop-blur-[2px] lg:hidden"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 top-full border-t border-white/5 bg-ink shadow-[0_20px_40px_rgba(7,21,43,0.45)] animate-in fade-in-0 slide-in-from-top-2 lg:hidden">
        <nav className="grid gap-0.5 px-2 py-2" aria-label="Main">
          {PREVIEW_PAGES.map((page) => {
            const Icon = PAGE_ICONS[page.page];
            const active = route.page === page.page;
            return (
              <button
                key={page.page}
                type="button"
                onClick={() => go({ page: page.page })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-3 text-left text-ink-nav transition-colors hover:bg-white/5 hover:text-on-ink",
                  active &&
                    "bg-white/8 text-on-ink before:absolute before:top-2 before:bottom-2 before:left-0 before:w-[3px] before:rounded-full before:bg-signal",
                )}
              >
                <Icon className={cn("size-5 shrink-0", active ? "text-signal" : "text-on-ink-muted")} aria-hidden />
                <span className="flex-1 font-display text-sm font-bold tracking-[0.08em] uppercase">{page.label}</span>
                <ChevronRight className="size-4 text-on-ink-muted" aria-hidden />
              </button>
            );
          })}
        </nav>
        <div className="grid gap-2 border-t border-white/5 px-4 py-3">
          <Button
            variant="outline"
            className="w-full border-white/15 bg-white/5 text-on-ink hover:bg-white/10 hover:text-on-ink"
          >
            <LogIn />
            Sign in with Discord
          </Button>
          <p className="text-center text-[11px] text-on-ink-muted">Playing as a guest. Decks stay on this device.</p>
        </div>
      </div>
    </>
  );
}

function AnnouncementBar({ onOpen, onDismiss }: { onOpen: () => void; onDismiss: () => void }) {
  return (
    <aside className="relative flex items-center justify-center gap-3 bg-gradient-to-r from-ink via-ink-soft to-ink px-10 py-2 text-xs">
      <span className="hidden h-px flex-1 bg-gradient-to-r from-transparent to-signal/50 sm:block" aria-hidden />
      <span className="rounded-sm bg-warning-surface px-1.5 py-0.5 font-bold tracking-[0.1em] text-warning uppercase">
        Beta
      </span>
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex items-center gap-1.5 font-semibold tracking-[0.12em] text-signal uppercase hover:text-on-ink"
      >
        What's new in 1.6
        <ArrowRight className="size-3.5" aria-hidden />
      </button>
      <span className="hidden h-px flex-1 bg-gradient-to-l from-transparent to-signal/50 sm:block" aria-hidden />
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss announcement"
        className="absolute right-3 rounded p-1 text-on-ink-muted hover:text-on-ink"
      >
        <X className="size-4" />
      </button>
    </aside>
  );
}

export function Shell({
  route,
  navigate,
  dark,
  onToggleDark,
  children,
}: {
  route: PreviewRoute;
  navigate: (route: PreviewRoute) => void;
  dark: boolean;
  onToggleDark: () => void;
  children: ReactNode;
}) {
  const [announcementOpen, setAnnouncementOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const go = (next: PreviewRoute) => {
    setMenuOpen(false);
    navigate(next);
  };

  return (
    <div className="relative min-h-dvh font-sans">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-ink shadow-[0_1px_0_rgba(120,170,255,0.08)]">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-4 px-4 sm:px-6">
          <button type="button" onClick={() => go({ page: "home" })} aria-label="Aegis home">
            <AegisLogo />
          </button>
          <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Main">
            {PREVIEW_PAGES.map((page) => (
              <NavLink key={page.page} active={route.page === page.page} onClick={() => go({ page: page.page })}>
                {page.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleDark}
              aria-label={dark ? "Use light theme" : "Use dark theme"}
              className="text-ink-nav hover:bg-white/8 hover:text-on-ink"
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
            <Button
              variant="outline"
              className="hidden border-white/15 bg-white/5 text-on-ink hover:bg-white/10 hover:text-on-ink sm:inline-flex"
            >
              Sign in
            </Button>
            <Button onClick={() => go({ page: "play" })}>
              Play now
              <ArrowRight />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-on-ink hover:bg-white/8 hover:text-on-ink lg:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
        {menuOpen ? <MobileMenu route={route} go={go} onClose={closeMenu} /> : null}
      </header>
      {announcementOpen ? (
        <AnnouncementBar onOpen={() => go({ page: "home" })} onDismiss={() => setAnnouncementOpen(false)} />
      ) : null}
      <main className="relative z-10 mx-auto grid max-w-[1180px] gap-10 [&>*]:min-w-0 px-4 pt-8 pb-20 sm:px-6">
        {children}
      </main>
      <footer className="relative z-10 border-t bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <span>Aegis is a fan project with no affiliation with Bandai.</span>
          <span className="flex items-center gap-4">
            <button
              type="button"
              className="hover:text-foreground hover:underline"
              onClick={() => go({ page: "brand" })}
            >
              Logo concepts
            </button>
            <span className="font-mono">UI prototype</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
