import { configure, render as testingLibraryRender, type RenderOptions } from "@testing-library/react";
import type { ReactNode } from "react";
import { I18nProvider } from "../../src/i18n";

export * from "@testing-library/react";

// A scenario drives a real server and the full GameScreen, so a step can take longer
// than Testing Library's 1 s default when the machine is busy (a full suite run).
configure({ asyncUtilTimeout: 10_000 });

function ScenarioProviders({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

/** Renders a scenario through the same application providers as production. */
export function render(ui: ReactNode, options?: Omit<RenderOptions, "wrapper">) {
  return testingLibraryRender(ui, { ...options, wrapper: ScenarioProviders });
}
