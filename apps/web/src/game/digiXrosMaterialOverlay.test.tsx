// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { digiXrosRequirementFor } from "@aegis/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, translator } from "../i18n";
import { DigiXrosMaterialOverlay } from "./overlay";

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

    expect(screen.getByRole("dialog", { name: "＜DigiXros＞ Dorbickmon" }).getAttribute("aria-modal")).toBe("true");
    expect(screen.getByText(/Accepted: \[Dragon\/saur\/Ceratopsian\] in traits different names\./)).toBeTruthy();

    const material = screen.getByRole("button", { name: "Vorvomon (hand)" });
    expect(material.getAttribute("title")).toBe("Vorvomon (hand)");
    expect(material.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(material);
    expect(material.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "View board" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Return to decision" }));
    expect(screen.getByRole("button", { name: "Vorvomon (hand)" }).getAttribute("aria-pressed")).toBe("true");

    expect(translator("pt-BR")("overlay.xrosTraitContains", { traits: "Dragon/saur/Ceratopsian" })).toBe(
      "[Dragon/saur/Ceratopsian] nas características",
    );
    expect(translator("pt-BR")("overlay.xrosDifferentNames")).toBe("nomes diferentes");
  });

  it("shows Snatchmon trash materials without asking for an expander Tamer", () => {
    render(
      <I18nProvider>
        <DigiXrosMaterialOverlay
          playingCardId="BT18-065"
          requirements={digiXrosRequirementFor("BT18-065")!}
          candidates={[]}
          lockedCandidates={[{ instanceId: "trash-vemmon", cardId: "BT18-060", zone: "trash" }]}
          eligibleExpanders={[]}
          intrinsicTrashMax={4}
          onConfirm={vi.fn<(materialInstanceIds: string[], expanderPermanentIds: string[]) => void>()}
          onSkip={vi.fn<() => void>()}
          onCancel={vi.fn<() => void>()}
        />
      </I18nProvider>,
    );

    expect(screen.queryByText(/Suspend an eligible Tamer/i)).toBeNull();
    expect(screen.getByText(/Accepted: Vemmon\./)).toBeTruthy();
    const material = screen.getByRole("button", { name: "Vemmon (trash)" });
    expect(material.hasAttribute("disabled")).toBe(false);
    fireEvent.click(material);
    expect(screen.getByRole("button", { name: "DigiXros (1 card)" }).hasAttribute("disabled")).toBe(false);
  });

  it("keeps materials visible and disables alternatives that no longer fit", () => {
    render(
      <I18nProvider>
        <DigiXrosMaterialOverlay
          playingCardId="EX12-015"
          requirements={digiXrosRequirementFor("EX12-015")!}
          candidates={[
            { instanceId: "kakamon", cardId: "EX12-006", zone: "hand" },
            { instanceId: "hakubamon", cardId: "EX12-043", zone: "battle" },
          ]}
          lockedCandidates={[]}
          eligibleExpanders={[]}
          onConfirm={vi.fn<(materialInstanceIds: string[], expanderPermanentIds: string[]) => void>()}
          onSkip={vi.fn<() => void>()}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Kakamon (hand)" }));

    expect(screen.getByRole("button", { name: "Kakamon (hand)" }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: "Hakubamon (battle)" }).hasAttribute("disabled")).toBe(true);
  });
});
