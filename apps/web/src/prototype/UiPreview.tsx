import { useEffect, useState } from "react";
import "./prototype.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CircuitBackdrop } from "./CircuitBackdrop";
import { Shell } from "./Shell";
import { previewPathFromRoute, previewRouteFromPath, type PreviewRoute } from "./routes";
import { HomeScreen } from "./screens/HomeScreen";
import { PlayScreen } from "./screens/PlayScreen";
import { ArenaScreen } from "./screens/ArenaScreen";
import { DecksScreen } from "./screens/DecksScreen";
import { CollectionScreen } from "./screens/CollectionScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { BrandScreen } from "./screens/BrandScreen";

function ScreenFor({
  route,
  navigate,
  dark,
  onToggleDark,
}: {
  route: PreviewRoute;
  navigate: (route: PreviewRoute) => void;
  dark: boolean;
  onToggleDark: () => void;
}) {
  switch (route.page) {
    case "home":
      return <HomeScreen navigate={navigate} />;
    case "play":
      return <PlayScreen navigate={navigate} />;
    case "arena":
      return <ArenaScreen navigate={navigate} />;
    case "decks":
      return <DecksScreen navigate={navigate} />;
    case "collection":
      return <CollectionScreen />;
    case "settings":
      return <SettingsScreen dark={dark} onToggleDark={onToggleDark} />;
    case "brand":
      return <BrandScreen />;
  }
}

export function UiPreview() {
  const [route, setRoute] = useState<PreviewRoute>(() => previewRouteFromPath(window.location.pathname));
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const onPopState = () => setRoute(previewRouteFromPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const toggleDark = () => setDark((value) => !value);

  const navigate = (next: PreviewRoute) => {
    window.history.pushState(null, "", previewPathFromRoute(next));
    setRoute(next);
    window.scrollTo({ top: 0 });
  };

  return (
    <TooltipProvider>
      <div className="ui-preview aegis-ui relative min-h-dvh bg-background text-foreground">
        {route.page === "arena" ? null : <CircuitBackdrop />}
        {route.page === "arena" ? (
          <ArenaScreen navigate={navigate} />
        ) : (
          <Shell route={route} navigate={navigate} dark={dark} onToggleDark={toggleDark}>
            <ScreenFor route={route} navigate={navigate} dark={dark} onToggleDark={toggleDark} />
          </Shell>
        )}
      </div>
    </TooltipProvider>
  );
}
