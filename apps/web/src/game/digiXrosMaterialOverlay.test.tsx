// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, translator } from "../i18n";
import { DigiXrosMaterialOverlay } from "./overlays";

afterEach(() => cleanup());

describe("DigiXrosMaterialOverlay accessibility", () => {
  it("names the modal and exposes material buttons as localized toggles", () => {
    render(
      <I18nProvider>
        <DigiXrosMaterialOverlay
          playingCardId="EX3-014"
          requirements={[
            {
              count: 2,
              maxMaterials: 5,
              materials: [
                {
                  traitContains: ["Dragon", "saur", "Ceratopsian"],
                  differentNames: true,
                },
              ],
            },
          ]}
          candidates={[{ instanceId: "vorvomon", cardId: "EX3-005", zone: "hand" }]}
          lockedCandidates={[]}
          eligibleExpanders={[]}
          onConfirm={vi.fn<(materialInstanceIds: string[], expanderPermanentIds: string[]) => void>()}
          onSkip={vi.fn<() => void>()}
          onCancel={vi.fn<() => void>()}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: "＜DigiXros＞ — Dorbickmon" }).getAttribute("aria-modal")).toBe("true");
    expect(screen.getByText(/Accepted: \[Dragon\/saur\/Ceratopsian\] in traits different names\./)).toBeTruthy();

    const material = screen.getByRole("button", { name: "Vorvomon (hand)" });
    expect(material.getAttribute("title")).toBe("Vorvomon (hand)");
    expect(material.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(material);
    expect(material.getAttribute("aria-pressed")).toBe("true");

    expect(translator("pt-BR")("overlay.xrosTraitContains", { traits: "Dragon/saur/Ceratopsian" })).toBe(
      "[Dragon/saur/Ceratopsian] nas características",
    );
    expect(translator("pt-BR")("overlay.xrosDifferentNames")).toBe("nomes diferentes");
  });
});
