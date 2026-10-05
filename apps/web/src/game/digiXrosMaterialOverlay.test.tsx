// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CardInstance, PlayerState, digiXrosRequirementFor } from "@aegis/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, translator } from "../i18n";
import { DigiXrosMaterialOverlay } from "./overlay";
import { prePlayPromptFor } from "./screen/model/prePlayPrompt";

afterEach(() => cleanup());

describe("DigiXrosMaterialOverlay accessibility", () => {
  it.each([
    ["trash-merva", "Mervamon"],
    ["trash-ignite", "Ignitemon"],
  ])("Discord 1556119607822254110: offers %s from trash when playing Mervamon", (materialId, name) => {
    const viewer = new PlayerState();
    const played = Object.assign(new CardInstance(), { instanceId: "played-merva", cardId: "BT11-086" });
    viewer.hand.push(played);
    viewer.trash.push(
      Object.assign(new CardInstance(), { instanceId: "trash-merva", cardId: "BT11-086" }),
      Object.assign(new CardInstance(), { instanceId: "trash-ignite", cardId: "BT11-076" }),
      Object.assign(new CardInstance(), { instanceId: "trash-agumon", cardId: "BT1-010" }),
    );
    const prompt = prePlayPromptFor({
      entry: {
        instanceId: played.instanceId,
        cardId: played.cardId,
        activatableEffectsJson: "",
        playableFromHand: true,
        projectedPlayCost: 11,
        digivolveTargetPermanentIds: [],
        linkTargetPermanentIds: [],
      },
      viewer,
      confirmDrop: false,
      actionConfirmationsEnabled: false,
    });
    if (prompt?.kind !== "digiXros") throw new Error("Expected a DigiXros preparation");
    const onConfirm = vi.fn<(materialInstanceIds: string[], expanderPermanentIds: string[]) => void>();
    render(
      <I18nProvider>
        <DigiXrosMaterialOverlay
          {...prompt}
          playingCardId={prompt.cardId}
          onConfirm={onConfirm}
          onSkip={vi.fn<() => void>()}
        />
      </I18nProvider>,
    );
    const material = screen.getByRole("button", { name: `${name} (trash)` });
    expect(material.hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: "Agumon (trash)" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(material);
    const otherName = name === "Mervamon" ? "Ignitemon" : "Mervamon";
    expect(screen.getByRole("button", { name: `${otherName} (trash)` }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "DigiXros (1 card)" }));
    expect(onConfirm).toHaveBeenCalledWith([materialId], []);
  });

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

function renderTamerChoice(expanderIds = ["taiki"]) {
  const onConfirm = vi.fn<(materials: string[], expanders: string[]) => void>();
  const onSkip = vi.fn<() => void>();
  const onCancel = vi.fn<() => void>();
  render(
    <I18nProvider>
      <DigiXrosMaterialOverlay
        playingCardId="BT10-024"
        requirements={digiXrosRequirementFor("BT10-024")!}
        candidates={[{ instanceId: "mail", cardId: "BT10-021", zone: "hand" }]}
        lockedCandidates={[{ instanceId: "grey", cardId: "BT10-019", zone: "underTamer" }]}
        eligibleExpanders={expanderIds.map((permanentId) => ({
          permanentId,
          cardId: "BT10-087",
          underTamerMax: 100,
          trashMax: 0,
        }))}
        onConfirm={onConfirm}
        onSkip={onSkip}
        onCancel={onCancel}
      />
    </I18nProvider>,
  );
  return { onConfirm, onSkip, onCancel };
}

describe("DigiXros Tamer effect choice", () => {
  it("asks on the left before materials and reserves the accepted Tamer until confirmation", () => {
    const { onConfirm } = renderTamerChoice();
    expect(
      screen.getByRole("dialog", { name: "Taiki Kudo · effect" }).classList.contains("decision-overlay--side"),
    ).toBe(true);
    expect(screen.getByRole("heading", { name: "Use Taiki Kudo's effect?" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Greymon (under Tamer)" })).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Yes, activate" }));
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Greymon (under Tamer)" }));
    fireEvent.click(screen.getByRole("button", { name: "MailBirdramon (hand)" }));
    fireEvent.click(screen.getByRole("button", { name: "DigiXros (2 cards)" }));
    expect(onConfirm).toHaveBeenCalledWith(["grey", "mail"], ["taiki"]);
  });

  it("declines the Tamer while keeping ordinary DigiXros materials available", () => {
    const { onConfirm } = renderTamerChoice();
    fireEvent.click(screen.getByRole("button", { name: "No, decline" }));
    expect(screen.queryByRole("button", { name: "Greymon (under Tamer)" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "MailBirdramon (hand)" }));
    fireEvent.click(screen.getByRole("button", { name: "DigiXros (1 card)" }));
    expect(onConfirm).toHaveBeenCalledWith(["mail"], []);
  });

  it("keeps the chosen copy separate when two Taikis can use their effects", () => {
    const { onConfirm } = renderTamerChoice(["first", "second"]);
    expect(screen.getByRole("heading", { name: "Use Taiki Kudo (copy 1 of 2)'s effect?" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Yes, activate" }));
    expect(screen.getByRole("heading", { name: "Use Taiki Kudo (copy 2 of 2)'s effect?" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "No, decline" }));
    fireEvent.click(screen.getByRole("button", { name: "Greymon (under Tamer)" }));
    fireEvent.click(screen.getByRole("button", { name: "DigiXros (1 card)" }));
    expect(onConfirm).toHaveBeenCalledWith(["grey"], ["first"]);
  });

  it("removes locked picks when changing to decline and can cancel without paying the cost", () => {
    const { onConfirm, onCancel } = renderTamerChoice();
    fireEvent.click(screen.getByRole("button", { name: "Yes, activate" }));
    fireEvent.click(screen.getByRole("button", { name: "Greymon (under Tamer)" }));
    fireEvent.click(screen.getByRole("button", { name: "Change Tamer effects" }));
    fireEvent.click(screen.getByRole("button", { name: "No, decline" }));
    expect(screen.getByText("No materials selected.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
