// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n";
import { ReleasesScreen } from "./ReleasesScreen";

describe("release notes screen", () => {
  beforeEach(() => localStorage.clear());

  it("shows the current public beta and its GitHub release", () => {
    render(
      <I18nProvider>
        <ReleasesScreen />
      </I18nProvider>,
    );
    expect(screen.getByRole("heading", { name: "What's new" })).toBeTruthy();
    expect(screen.getByText("v1.0.0-BETA")).toBeTruthy();
    expect(screen.getByRole<HTMLAnchorElement>("link", { name: /View details on GitHub/ }).href).toMatch(
      /v1\.0\.0-BETA$/,
    );
  });

  it("translates the release content through the app i18n", () => {
    localStorage.setItem("aegis:locale", "pt-BR");
    render(
      <I18nProvider>
        <ReleasesScreen />
      </I18nProvider>,
    );
    expect(screen.getByRole("heading", { name: "O que há de novo" })).toBeTruthy();
    expect(screen.getByText(/O primeiro marco oficial do beta do Aegis/)).toBeTruthy();
  });
});
