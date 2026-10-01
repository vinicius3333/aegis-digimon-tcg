// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n";
import { en } from "../i18n/en";
import { DeckExportModal, DeckImportModal } from "./DeckTextModals";

describe("deck text modals", () => {
  afterEach(() => cleanup());

  it("exposes the import modal as a dialog named by its title", () => {
    render(
      <I18nProvider>
        <DeckImportModal onImport={() => undefined} onClose={() => undefined} />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: en["deck.importTitle"] });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("exposes the export modal as a dialog named by its title", () => {
    render(
      <I18nProvider>
        <DeckExportModal text="4 Agumon BT1-009" onClose={() => undefined} />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: en["deck.exportTitle"] });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });
});
