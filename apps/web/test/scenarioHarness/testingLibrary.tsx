import { render as testingLibraryRender, type RenderOptions } from "@testing-library/react";
import type { ReactNode } from "react";
import { I18nProvider } from "../../src/i18n";

export * from "@testing-library/react";

function ScenarioProviders({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

/** Renders a scenario through the same application providers as production. */
export function render(ui: ReactNode, options?: Omit<RenderOptions, "wrapper">) {
  return testingLibraryRender(ui, { ...options, wrapper: ScenarioProviders });
}
