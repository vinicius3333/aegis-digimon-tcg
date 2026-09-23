// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n";
import { ReleasesScreen } from "./ReleasesScreen";

describe("release notes screen", () => {
  beforeEach(() => localStorage.clear());

  it("shows the current public beta without a GitHub release link", () => {
    render(
      <I18nProvider>
        <ReleasesScreen />
      </I18nProvider>,
    );
    expect(screen.getByRole("heading", { name: "What's new" })).toBeTruthy();
    expect(screen.getByText("v1.1.3-BETA")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /View details on GitHub/ })).toBeNull();
  });

  it("translates the release content through the app i18n", () => {
    localStorage.setItem("aegis:locale", "pt-BR");
    render(
      <I18nProvider>
        <ReleasesScreen />
      </I18nProvider>,
    );
    expect(screen.getByRole("heading", { name: "O que há de novo" })).toBeTruthy();
    expect(screen.getByText(/Esta atualização corrige efeitos de Uma Vez Por Turno/)).toBeTruthy();
  });
});
