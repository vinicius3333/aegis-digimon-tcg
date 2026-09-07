// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { buildTriggerKey, type DecisionRequest, type DecisionResponse } from "@aegis/shared";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, translator } from "../i18n";
import { AllianceOverlay, BlockOverlay, DecisionOverlay, EvoCostChoiceOverlay, WaitingOverlay } from "./overlays";
import { CardOpenerProvider } from "./cardLinks";

afterEach(() => cleanup());

const optionalDecision: DecisionRequest = {
  decisionId: "decision-1",
  seat: 0,
  kind: "optional",
  promptText: "Activate the effect?",
};

function renderDecision(request: DecisionRequest = optionalDecision) {
  const onRespond = vi.fn();
  const result = render(
    <I18nProvider>
      <DecisionOverlay
        request={request}
        sourceCardId={request.sourceCardId}
        candidates={[]}
        picks={[]}
        onTogglePick={vi.fn()}
        onRespond={onRespond}
      />
    </I18nProvider>,
  );
  return { ...result, onRespond };
}

it("uses authoritative trigger card ids for order-trigger labels and art", () => {
  renderDecision({
    decisionId: "garurumon-attack-order",
    seat: 0,
    kind: "orderTriggers",
    promptText: "Choose the next pending effect to resolve.",
    options: {
      triggerKeys: [
        buildTriggerKey("garurumon-source", "P-008/ir-6-0"),
        buildTriggerKey("x-antibody-source", "BT9-109/when-attacking-digivolve"),
      ],
      triggerCardIds: ["P-007", "BT9-109"],
    },
  });

  expect(screen.getByRole("button", { name: "Garurumon" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "X Antibody" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "WereGarurumon" })).toBeNull();
  expect(screen.getByRole("img", { name: "Garurumon" })).toBeTruthy();
});

describe("order-trigger chooser identity", () => {
  /**
   * One Megadramon (EX12-064) played onto a base fires its [On Play] and its
   * [When Digivolving] at once. Both entries carry the same permanent, so the
   * chooser once numbered them "copy 1"/"copy 2" and claimed a second Megadramon
   * that was never on the board.
   */
  it("names two effects of ONE permanent by their firing window, never as copies", () => {
    renderDecision({
      decisionId: "megadramon-two-timings",
      seat: 0,
      kind: "orderTriggers",
      promptText: "Choose the next pending effect to resolve.",
      options: {
        triggerKeys: [
          buildTriggerKey("megadramon-permanent", "EX12-064/on-play"),
          buildTriggerKey("megadramon-permanent", "EX12-064/when-digivolving"),
        ],
        triggerCardIds: ["EX12-064", "EX12-064"],
        triggerTimings: ["OnPlay", "WhenDigivolving"],
      },
    });

    expect(screen.getByRole("button", { name: "[On Play], Megadramon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "[When Digivolving], Megadramon" })).toBeTruthy();
    expect(screen.queryByText(/copy/i)).toBeNull();
  });

  it("still numbers two DIFFERENT permanents of the same card", () => {
    renderDecision({
      decisionId: "two-megadramon",
      seat: 0,
      kind: "orderTriggers",
      promptText: "Choose the next pending effect to resolve.",
      options: {
        triggerKeys: [
          buildTriggerKey("megadramon-a", "EX12-064/on-play"),
          buildTriggerKey("megadramon-b", "EX12-064/on-play"),
        ],
        triggerCardIds: ["EX12-064", "EX12-064"],
        triggerTimings: ["OnPlay", "OnPlay"],
      },
    });

    expect(screen.getByRole("button", { name: "[On Play], Megadramon (copy 1)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "[On Play], Megadramon (copy 2)" })).toBeTruthy();
  });

  it("drops a per-option clause that every option repeats", () => {
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "identical-summaries",
            seat: 0,
            kind: "orderTriggers",
            promptText: "Choose the next pending effect to resolve.",
            options: {
              triggerKeys: [
                buildTriggerKey("megadramon-permanent", "EX12-064/on-play"),
                buildTriggerKey("megadramon-permanent", "EX12-064/when-digivolving"),
              ],
              triggerCardIds: ["EX12-064", "EX12-064"],
              triggerTimings: ["OnPlay", "WhenDigivolving"],
            },
          }}
          candidates={[]}
          picks={[]}
          triggerDetails={[
            { sourceLabel: "Field: 1", summary: "Delete 1 of your opponent's level 4 or lower Digimon…" },
            { sourceLabel: "Field: 1", summary: "Delete 1 of your opponent's level 4 or lower Digimon…" },
          ]}
          onTogglePick={vi.fn()}
          onRespond={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.queryByText(/Delete 1 of your opponent/)).toBeNull();
    expect(screen.getAllByText("Field: 1")).toHaveLength(2);
  });

  it("keeps a per-option clause when the options say different things", () => {
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "differing-summaries",
            seat: 0,
            kind: "orderTriggers",
            promptText: "Choose the next pending effect to resolve.",
            options: {
              triggerKeys: [
                buildTriggerKey("permanent-a", "EX12-064/on-play"),
                buildTriggerKey("permanent-b", "P-008/ir-6-0"),
              ],
              triggerCardIds: ["EX12-064", "P-007"],
            },
          }}
          candidates={[]}
          picks={[]}
          triggerDetails={[{ summary: "Delete 1 Digimon" }, { summary: "Draw 1 card" }]}
          onTogglePick={vi.fn()}
          onRespond={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText("Delete 1 Digimon")).toBeTruthy();
    expect(screen.getByText("Draw 1 card")).toBeTruthy();
  });
});

it("distinguishes duplicate card candidates accessibly while preserving unique names", () => {
  render(
    <I18nProvider>
      <DecisionOverlay
        request={{
          decisionId: "duplicate-copies",
          seat: 0,
          kind: "selectCards",
          promptText: "Choose a card",
          options: { candidateInstanceIds: ["trial-1", "trial-2"], min: 1, max: 1 },
        }}
        candidates={[
          { instanceId: "trial-1", cardId: "EX3-069" },
          { instanceId: "trial-2", cardId: "EX3-069" },
          { instanceId: "agumon", cardId: "BT1-010", selectable: false },
        ]}
        picks={[]}
        onTogglePick={vi.fn<(instanceId: string) => void>()}
        onRespond={vi.fn<(response: DecisionResponse) => void>()}
      />
    </I18nProvider>,
  );

  expect(screen.getByRole("button", { name: "Trial of the Four Great Dragons, copy 1 of 2" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Trial of the Four Great Dragons, copy 2 of 2" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Agumon" })).toBeTruthy();
  expect(translator("pt-BR")("overlay.cardCopy", { index: 2, total: 3 })).toBe("cópia 2 de 3");
});

describe("connection error action", () => {
  it("shows an explicit way back to the lobby and invokes it", () => {
    const onAction = vi.fn<() => void>();
    render(
      <I18nProvider>
        <WaitingOverlay
          spinner={false}
          title="Não foi possível conectar o bot"
          detail="Volte ao lobby e tente iniciar outra partida contra o bot."
          actionLabel="Voltar ao lobby"
          onAction={onAction}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Voltar ao lobby" }));

    expect(onAction).toHaveBeenCalledOnce();
  });
});

describe("generic engine selection prompts", () => {
  it.each(["Choose targets", "Select cards"])("replaces %s with the localized decision title", (promptText) => {
    renderDecision({
      decisionId: `generic-${promptText}`,
      seat: 0,
      kind: promptText.startsWith("Choose") ? "chooseTargets" : "selectCards",
      promptText,
      options: { min: 1, max: 1 },
    });

    expect(screen.getByText("Resolve effect")).toBeTruthy();
    expect(screen.queryByText(promptText)).toBeNull();
  });

  it("replaces the generic modal prompt with a friendly localized instruction", () => {
    renderDecision({
      decisionId: "generic-modal",
      seat: 0,
      kind: "chooseOption",
      promptText: "Choose one effect to activate",
      options: { choices: ["Draw 1", "Gain 1 memory"] },
    });

    expect(screen.getByText("Choose an effect")).toBeTruthy();
    expect(screen.queryByText("Choose one effect to activate")).toBeNull();
  });

  it("renders the executable EX3-008 modal labels without card-specific UI", () => {
    const { onRespond } = renderDecision({
      decisionId: "flamedramon-modal",
      seat: 0,
      kind: "chooseOption",
      promptText: "Choose one effect to activate",
      sourceCardId: "EX3-008",
      options: {
        choices: [
          "Digivolve 1 of your other Digimon into a purple level 4 [Free] Digimon from your trash",
          "DNA digivolve this Digimon and 1 of your other Digimon into a Digimon in your hand",
        ],
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "DNA digivolve this Digimon and 1 of your other Digimon into a Digimon in your hand",
      }),
    );
    expect(onRespond).toHaveBeenCalledWith({ kind: "chooseOption", optionIndex: 1 });
  });
});

describe("EX3-058 Shadramon decisions", () => {
  it("shows friendly labels for both branches and returns the selected DNA branch", () => {
    const { onRespond } = renderDecision({
      decisionId: "shadramon-modal",
      seat: 0,
      kind: "chooseOption",
      promptText: "Choose one effect to activate",
      sourceCardId: "EX3-058",
      options: {
        choices: ["Digivolve", "DNA digivolve"],
        timing: "WhenDigivolving",
      },
    });

    expect(screen.getByRole("button", { name: "Digivolve" })).toBeTruthy();
    const dna = screen.getByRole("button", { name: "DNA digivolve" });
    expect(dna).toBeTruthy();
    expect(screen.queryByText("Dna digivolve")).toBeNull();
    fireEvent.click(dna);
    expect(onRespond).toHaveBeenCalledWith({ kind: "chooseOption", optionIndex: 1 });
  });

  it("offers explicit accept and decline actions for its optional evolution", () => {
    renderDecision({
      decisionId: "shadramon-optional",
      seat: 0,
      kind: "optional",
      promptText: "Digivolve another Digimon from your trash?",
      sourceCardId: "EX3-058",
      options: { timing: "WhenDigivolving" },
    });

    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
  });
});

describe("EX3-059 DarkTyrannomon decisions", () => {
  it("names each opposing target and exposes a clear confirmation action", () => {
    const onRespond = vi.fn<(response: DecisionResponse) => void>();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "darktyrannomon-target",
            seat: 0,
            kind: "chooseTargets",
            promptText: "Choose an opponent's Digimon to suspend",
            sourceCardId: "EX3-059",
            options: {
              candidateInstanceIds: ["elecmon", "gabumon"],
              min: 1,
              max: 1,
              timing: "OnDeletion",
              effectText: "[On Deletion] Suspend 1 of your opponent's Digimon.",
            },
          }}
          sourceCardId="EX3-059"
          candidates={[
            { instanceId: "elecmon", cardId: "BT1-028" },
            { instanceId: "gabumon", cardId: "BT1-029" },
          ]}
          picks={["elecmon"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );

    expect(screen.getByText("[On Deletion] Suspend 1 of your opponent's Digimon.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Elecmon/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Gabumon" })).toBeTruthy();
    const confirm = screen.getByRole("button", { name: "Confirm targets" });
    expect(confirm).toBeTruthy();
    fireEvent.click(confirm);
    expect(onRespond).toHaveBeenCalledWith({ kind: "chooseTargets", instanceIds: ["elecmon"] });
  });
});

describe("EX3-061 Dinobeemon decisions", () => {
  it.each([
    [
      "WhenDigivolving",
      "DNA Digivolution: 0 from purple Lv.4 + red Lv.4[When Digivolving] When DNA digivolving, you may play 1 [Paildramon] from your trash without paying the cost.[On Deletion] You may play 1 [Wormmon] from your trash without paying the cost.",
      "Paildramon",
    ],
    [
      "OnDeletion",
      "DNA Digivolution: 0 from purple Lv.4 + red Lv.4[When Digivolving] When DNA digivolving, you may play 1 [Paildramon] from your trash without paying the cost.[On Deletion] You may play 1 [Wormmon] from your trash without paying the cost.",
      "Wormmon",
    ],
  ])("shows a friendly %s activation with the relevant %s clause", (timing, effectText, cardName) => {
    renderDecision({
      decisionId: `dinobeemon-${timing}`,
      seat: 0,
      kind: "optional",
      promptText: "Play without paying the cost",
      sourceCardId: "EX3-061",
      options: { timing, effectText },
    });

    expect(screen.getByText(new RegExp(`play 1 \\[${cardName}\\]`, "i"))).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
    expect(screen.queryByText("PlayWithoutCost")).toBeNull();
  });

  it("names both Paildramon choices and sends the selected card instance", () => {
    const onRespond = vi.fn<(response: DecisionResponse) => void>();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "dinobeemon-paildramon",
            seat: 0,
            kind: "selectCards",
            promptText: "Select cards",
            sourceCardId: "EX3-061",
            options: {
              candidateInstanceIds: ["ex3-paildramon", "st9-paildramon"],
              min: 1,
              max: 1,
              timing: "WhenDigivolving",
              effectText:
                "[When Digivolving] When DNA digivolving, you may play 1 [Paildramon] from your trash without paying the cost.",
            },
          }}
          sourceCardId="EX3-061"
          candidates={[
            { instanceId: "ex3-paildramon", cardId: "EX3-010" },
            { instanceId: "st9-paildramon", cardId: "ST9-05" },
          ]}
          picks={["ex3-paildramon"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );

    expect(screen.getAllByRole("button", { name: /Paildramon/ })).toHaveLength(2);
    const confirm = screen.getByRole("button", { name: "Confirm targets" });
    fireEvent.click(confirm);
    expect(onRespond).toHaveBeenCalledWith({ kind: "selectCards", instanceIds: ["ex3-paildramon"] });
  });

  it("names Wormmon in the On Deletion selection and confirms the chosen instance", () => {
    const onRespond = vi.fn<(response: DecisionResponse) => void>();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "dinobeemon-wormmon",
            seat: 0,
            kind: "selectCards",
            promptText: "Select cards",
            sourceCardId: "EX3-061",
            options: {
              candidateInstanceIds: ["stack-wormmon", "trash-wormmon"],
              min: 1,
              max: 1,
              timing: "OnDeletion",
              effectText: "[On Deletion] You may play 1 [Wormmon] from your trash without paying the cost.",
            },
          }}
          sourceCardId="EX3-061"
          candidates={[
            { instanceId: "stack-wormmon", cardId: "EX3-055" },
            { instanceId: "trash-wormmon", cardId: "BT3-047" },
          ]}
          picks={["stack-wormmon"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );

    expect(screen.getAllByRole("button", { name: /Wormmon/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));
    expect(onRespond).toHaveBeenCalledWith({ kind: "selectCards", instanceIds: ["stack-wormmon"] });
  });
});

describe("EX3-062 WarGrowlmon decisions", () => {
  const effectText =
    "[When Digivolving] Trash the top 3 cards of both players' decks. Then, if either player has 5 or more cards in their trash, you may play 1 [Guilmon] or [Takato Matsuki] from your hand or trash without paying the cost.";

  it("explains the post-mill optional play and exposes clear accept and decline actions", () => {
    renderDecision({
      decisionId: "wargrowlmon-optional",
      seat: 0,
      kind: "optional",
      promptText: "Play without paying the cost",
      sourceCardId: "EX3-062",
      options: { timing: "WhenDigivolving", effectText },
    });

    expect(screen.getByText(effectText)).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
    expect(screen.queryByText("PlayWithoutCost")).toBeNull();
  });

  it("names Guilmon and Takato, confirms the selected instance, and never exposes a Cyborg peer", () => {
    const onRespond = vi.fn<(response: DecisionResponse) => void>();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "wargrowlmon-target",
            seat: 0,
            kind: "selectCards",
            promptText: "Select cards",
            sourceCardId: "EX3-062",
            options: {
              candidateInstanceIds: ["guilmon", "takato"],
              min: 1,
              max: 1,
              timing: "WhenDigivolving",
              effectText,
            },
          }}
          sourceCardId="EX3-062"
          candidates={[
            { instanceId: "guilmon", cardId: "EX3-056" },
            { instanceId: "takato", cardId: "EX2-056" },
          ]}
          picks={["takato"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: "Guilmon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Takato Matsuki/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /MetalGreymon/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));
    expect(onRespond).toHaveBeenCalledWith({ kind: "selectCards", instanceIds: ["takato"] });
  });
});

describe("EX3-063 Imperialdramon: Dragon Mode decisions", () => {
  const dnaText =
    "[When Digivolving] When DNA digivolving, your opponent chooses 1 of their Digimon. Delete all of their other Digimon. Then, ＜Blitz＞.";

  it("shows the opponent every possible survivor and submits the chosen permanent", () => {
    const onRespond = vi.fn<(response: DecisionResponse) => void>();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "dragon-mode-survivor",
            seat: 1,
            kind: "chooseTargets",
            promptText: "Choose targets",
            sourceCardId: "EX3-063",
            options: {
              candidateInstanceIds: ["elecmon", "gabumon", "monodramon"],
              min: 1,
              max: 1,
              timing: "WhenDigivolving",
              effectText: dnaText,
            },
          }}
          sourceCardId="EX3-063"
          candidates={[
            { instanceId: "elecmon", cardId: "BT1-028" },
            { instanceId: "gabumon", cardId: "BT1-029" },
            { instanceId: "monodramon", cardId: "BT1-030" },
          ]}
          picks={["gabumon"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(dnaText)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Elecmon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Gabumon, selected" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Gomamon" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));
    expect(onRespond).toHaveBeenCalledWith({ kind: "chooseTargets", instanceIds: ["gabumon"] });
  });

  it("explains the optional Fighter Mode evolution with explicit accept and decline actions", () => {
    const attackText =
      "[When Attacking][Once Per Turn] This Digimon gets +2000 DP for the turn. Then, this Digimon may digivolve into [Imperialdramon: Fighter Mode] in your hand for its digivolution cost.";
    renderDecision({
      decisionId: "dragon-mode-fighter",
      seat: 0,
      kind: "optional",
      promptText: "Digivolve into Imperialdramon: Fighter Mode?",
      sourceCardId: "EX3-063",
      options: { timing: "WhenAttacking", effectText: attackText },
    });

    expect(screen.getByText(attackText)).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
  });

  it("uses the friendly Blitz question and activates it from Dragon Mode", () => {
    const { onRespond } = renderDecision({
      decisionId: "dragon-mode-blitz",
      seat: 0,
      kind: "optional",
      promptText: "Activate Blitz?",
      sourceCardId: "EX3-063",
      options: { promptKey: "activateBlitz", timing: "WhenDigivolving", effectText: dnaText },
    });

    expect(screen.getByText("Do you want to activate Blitz?")).toBeTruthy();
    expect(screen.getByText(dnaText)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Yes, activate" }));
    expect(onRespond).toHaveBeenCalledWith({ kind: "optional", accept: true });
  });
});

describe("EX3-064 Megidramon decisions", () => {
  const deletionText =
    "[On Deletion] If you don't have a [Trial of the Four Great Dragons] in play, you may place 1 [Trial of the Four Great Dragons] from your hand in your battle area.";

  it("presents the errata placement as a clear optional action", () => {
    renderDecision({
      decisionId: "megidramon-place-trial",
      seat: 0,
      kind: "optional",
      promptText: "Place Trial of the Four Great Dragons?",
      sourceCardId: "EX3-064",
      options: { timing: "OnDeletion", effectText: deletionText },
    });

    expect(screen.getByText(deletionText)).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
  });

  it("names Trial and submits the chosen Option card", () => {
    const onRespond = vi.fn<(response: DecisionResponse) => void>();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "megidramon-select-trial",
            seat: 0,
            kind: "selectCards",
            promptText: "Select cards",
            sourceCardId: "EX3-064",
            options: {
              candidateInstanceIds: ["trial"],
              min: 1,
              max: 1,
              timing: "OnDeletion",
              effectText: deletionText,
            },
          }}
          sourceCardId="EX3-064"
          candidates={[{ instanceId: "trial", cardId: "EX3-069" }]}
          picks={["trial"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: /Trial of the Four Great Dragons, selected/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));
    expect(onRespond).toHaveBeenCalledWith({ kind: "selectCards", instanceIds: ["trial"] });
  });
});

describe("EX3-065 Hina Kurihara decisions", () => {
  it("explains the Dragon watcher as an optional Tamer suspension with clear actions", () => {
    const effectText =
      "[Your Turn] When one of your Digimon digivolves into a Digimon with [Rock Dragon], " +
      "[Earth Dragon], [Machine Dragon], or [Sky Dragon] in its traits, by suspending this Tamer, " +
      "activate 1 of that Digimon's [On Play] effects.";
    const { onRespond } = renderDecision({
      decisionId: "hina-dragon-on-play",
      seat: 0,
      kind: "optional",
      promptText: "Activate Hina Kurihara's effect?",
      sourceCardId: "EX3-065",
      options: { timing: "OnEnterFieldAnyone", effectText },
    });

    expect(screen.getByText(effectText)).toBeTruthy();
    expect(screen.getByText("Activate Hina Kurihara's effect?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Yes, activate" }));
    expect(onRespond).toHaveBeenCalledWith({ kind: "optional", accept: true });
  });
});

describe("EX3-066 Hyper Infinity Cannon decisions", () => {
  const mainText =
    "[Main] ＜De-Digivolve 3＞ 1 of your opponent's Digimon. Then, by placing 1 card with [Cyborg] " +
    "in its traits from your hand or trash under 1 of your level 6 Digimon with [Machine] in its " +
    "traits as its bottom digivolution card, delete 1 of your opponent's Digimon with 6000 DP or less.";

  it("explains the optional Cyborg cost with explicit decline and activation actions", () => {
    renderDecision({
      decisionId: "cannon-cyborg-cost",
      seat: 0,
      kind: "optional",
      promptText: "Pay the Cyborg placement cost?",
      sourceCardId: "EX3-066",
      options: { timing: "Main", effectText: mainText },
    });

    expect(screen.getByText(mainText)).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
  });

  it("names eligible Cyborg cards and submits the selected cost card", () => {
    const onRespond = vi.fn<(response: DecisionResponse) => void>();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "cannon-select-cyborg",
            seat: 0,
            kind: "selectCards",
            promptText: "Select cards",
            sourceCardId: "EX3-066",
            options: {
              candidateInstanceIds: ["metalgreymon", "metaltyrannomon"],
              min: 1,
              max: 1,
              timing: "Main",
              effectText: mainText,
            },
          }}
          sourceCardId="EX3-066"
          candidates={[
            { instanceId: "metalgreymon", cardId: "BT1-021" },
            { instanceId: "metaltyrannomon", cardId: "BT1-024" },
          ]}
          picks={["metalgreymon"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: /MetalGreymon, selected/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "MetalTyrannomon" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));
    expect(onRespond).toHaveBeenCalledWith({ kind: "selectCards", instanceIds: ["metalgreymon"] });
  });
});

describe("EX3-067 Sourai decisions", () => {
  const mainText =
    "[Main] Trash the top 4 digivolution cards of 1 of your opponent's Digimon. Then, until the end " +
    "of your opponent's turn, all of your opponent's Digimon with no digivolution cards can't attack.";

  it("shows the complete consequence while naming and submitting the chosen opposing Digimon", () => {
    const onRespond = vi.fn<(response: DecisionResponse) => void>();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "sourai-target",
            seat: 0,
            kind: "chooseTargets",
            promptText: "Choose targets",
            sourceCardId: "EX3-067",
            options: {
              candidateInstanceIds: ["machinedramon", "metalgreymon"],
              min: 1,
              max: 1,
              timing: "Main",
              effectText: mainText,
            },
          }}
          sourceCardId="EX3-067"
          candidates={[
            { instanceId: "machinedramon", cardId: "EX1-073", sourceCount: 5 },
            { instanceId: "metalgreymon", cardId: "BT1-021", sourceCount: 2 },
          ]}
          picks={["machinedramon"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(mainText)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Machinedramon, 5 source.*, selected/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /MetalGreymon, 2 source/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));
    expect(onRespond).toHaveBeenCalledWith({ kind: "chooseTargets", instanceIds: ["machinedramon"] });
  });
});

describe("EX3-068 God Flame decisions", () => {
  const mainText =
    "[Main] 1 of your opponent's Digimon gets -6000 DP for the turn. Then, you may return 1 card " +
    "with the [Four Great Dragons] trait from your trash to your hand.";

  it("shows the complete effect while naming and submitting the DP-reduction target", () => {
    const onRespond = vi.fn<(response: DecisionResponse) => void>();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "god-flame-target",
            seat: 0,
            kind: "chooseTargets",
            promptText: "Choose targets",
            sourceCardId: "EX3-068",
            options: {
              candidateInstanceIds: ["target"],
              min: 1,
              max: 1,
              timing: "Main",
              effectText: mainText,
            },
          }}
          sourceCardId="EX3-068"
          candidates={[{ instanceId: "target", cardId: "EX3-064", currentDP: 12_000 }]}
          picks={["target"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(mainText)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Megidramon, 12,000 DP, selected/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));
    expect(onRespond).toHaveBeenCalledWith({ kind: "chooseTargets", instanceIds: ["target"] });
  });

  it("explains that recovery is optional and exposes clear decline and activation actions", () => {
    renderDecision({
      decisionId: "god-flame-recovery",
      seat: 0,
      kind: "optional",
      promptText: "Return 1 to hand?",
      sourceCardId: "EX3-068",
      options: { timing: "Main", effectText: mainText },
    });

    expect(screen.getByText(mainText)).toBeTruthy();
    expect(screen.getByText("Return 1 to hand?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
  });

  it("names Four Great Dragons recovery candidates and submits exactly the selected card", () => {
    const onRespond = vi.fn<(response: DecisionResponse) => void>();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "god-flame-recovery-card",
            seat: 0,
            kind: "selectCards",
            promptText: "Select cards",
            sourceCardId: "EX3-068",
            options: {
              candidateInstanceIds: ["azulongmon", "trial"],
              min: 1,
              max: 1,
              timing: "Main",
              effectText: mainText,
            },
          }}
          sourceCardId="EX3-068"
          candidates={[
            { instanceId: "azulongmon", cardId: "EX3-025" },
            { instanceId: "trial", cardId: "EX3-069" },
          ]}
          picks={["trial"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: "Azulongmon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Trial of the Four Great Dragons, selected/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));
    expect(onRespond).toHaveBeenCalledWith({ kind: "selectCards", instanceIds: ["trial"] });
  });
});

describe("EX3-069 Trial of the Four Great Dragons decisions", () => {
  const delayText =
    "[Main] ＜Delay＞ Play 1 Digimon card with [Four Great Dragons] in its traits from your hand " +
    "without paying the cost. The Digimon played by this effect can't digivolve to level 7, and " +
    "at the next end of your opponent's turn, delete that Digimon.";

  it("shows the complete Delay consequence and submits the named Four Great Dragons choice", () => {
    const onRespond = vi.fn<(response: DecisionResponse) => void>();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "trial-four-dragons",
            seat: 0,
            kind: "selectCards",
            promptText: "Select cards",
            sourceCardId: "EX3-069",
            options: {
              candidateInstanceIds: ["azulongmon", "magnadramon"],
              min: 1,
              max: 1,
              timing: "Main",
              effectText: delayText,
            },
          }}
          sourceCardId="EX3-069"
          candidates={[
            { instanceId: "azulongmon", cardId: "EX3-025" },
            { instanceId: "magnadramon", cardId: "EX3-036" },
          ]}
          picks={["azulongmon"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(delayText)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Azulongmon, selected/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Magnadramon" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));
    expect(onRespond).toHaveBeenCalledWith({ kind: "selectCards", instanceIds: ["azulongmon"] });
  });
});

describe("EX3-070 Avalon's Gate decisions", () => {
  it("shows the complete printed effect and names every action in each modal branch", () => {
    const effectText =
      "[Main] Activate 1 of the effects below. If you have a Digimon with [Examon] in its name in play, " +
      "activate all of the effects below instead.・Suspend 1 of your opponent's Digimon, and 1 of your Digimon " +
      "gains ＜Piercing＞ for the turn.・Unsuspend 1 of your Digimon.";
    const { onRespond } = renderDecision({
      decisionId: "avalons-gate-modal",
      seat: 0,
      kind: "chooseOption",
      promptText: "Choose one effect to activate",
      sourceCardId: "EX3-070",
      options: {
        choices: ["Suspend 1 target(s) · Gain ＜Piercing＞", "Unsuspend 1 target(s)"],
        timing: "Main",
        effectText,
      },
    });

    expect(screen.getByText(effectText)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Suspend 1 target(s) · Gain ＜Piercing＞" })).toBeTruthy();
    const unsuspend = screen.getByRole("button", { name: "Unsuspend 1 target(s)" });
    fireEvent.click(unsuspend);
    expect(onRespond).toHaveBeenCalledWith({ kind: "chooseOption", optionIndex: 1 });
  });
});

describe("EX3-071 Laser Cannon decisions", () => {
  it("shows the complete sequence while selecting the cost-5 deletion target", () => {
    const effectText =
      "[Main] ＜De-Digivolve 1＞ 1 of your opponent's Digimon. (Trash 1 card from the top of 1 of your " +
      "opponent's Digimon. Stop trashing when you would trash a level 3 card or the Digimon's last card.) " +
      "Then, delete 1 of your opponent's Digimon with a play cost of 5 or less.";
    const onRespond = vi.fn<(response: DecisionResponse) => void>();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "laser-cannon-delete",
            seat: 0,
            kind: "chooseTargets",
            promptText: "Choose targets",
            sourceCardId: "EX3-071",
            options: {
              candidateInstanceIds: ["sealsdramon"],
              min: 1,
              max: 1,
              timing: "Main",
              effectText,
            },
          }}
          sourceCardId="EX3-071"
          candidates={[{ instanceId: "sealsdramon", cardId: "EX3-049" }]}
          picks={["sealsdramon"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(effectText)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Sealsdramon, selected/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));
    expect(onRespond).toHaveBeenCalledWith({ kind: "chooseTargets", instanceIds: ["sealsdramon"] });
  });
});

describe("EX3-072 Megiddo Flame decisions", () => {
  const mainText =
    "[Main] Delete 1 of your opponent's level 4 or lower Digimon. By deleting 1 of your Digimon, " +
    "delete 1 of your opponent's level 6 or lower Digimon instead.";

  it("presents the two mutually exclusive Main branches with their complete consequences", () => {
    const { onRespond } = renderDecision({
      decisionId: "megiddo-flame-modal",
      seat: 0,
      kind: "chooseOption",
      promptText: "Choose one effect to activate",
      sourceCardId: "EX3-072",
      options: {
        choices: [
          "Delete 1 opponent's level 4 or lower Digimon",
          "Delete 1 of your Digimon to delete 1 opponent's level 6 or lower Digimon instead",
        ],
        timing: "Main",
        effectText: mainText,
      },
    });

    expect(screen.getByText(mainText)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete 1 opponent's level 4 or lower Digimon" })).toBeTruthy();
    const instead = screen.getByRole("button", {
      name: "Delete 1 of your Digimon to delete 1 opponent's level 6 or lower Digimon instead",
    });
    fireEvent.click(instead);
    expect(onRespond).toHaveBeenCalledWith({ kind: "chooseOption", optionIndex: 1 });
  });

  it("shows the Security Guilmon clause and the named family candidates", () => {
    const securityText = "[Security] You may play 1 [Guilmon] from your trash without paying the cost.";
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "megiddo-flame-security",
            seat: 0,
            kind: "selectCards",
            promptText: "Select cards",
            sourceCardId: "EX3-072",
            options: {
              candidateInstanceIds: ["guilmon", "guilmon-x"],
              min: 1,
              max: 1,
              timing: "Security",
              effectText: securityText,
            },
          }}
          sourceCardId="EX3-072"
          candidates={[
            { instanceId: "guilmon", cardId: "EX3-056" },
            { instanceId: "guilmon-x", cardId: "BT9-009" },
          ]}
          picks={["guilmon"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={vi.fn<(response: DecisionResponse) => void>()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(securityText)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Guilmon, selected/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guilmon (X Antibody)" })).toBeTruthy();
  });
});

describe("EX3-074 Examon decisions", () => {
  const whenDigivolvingText =
    "[When Digivolving] You may place 1 green or blue Digimon card with [Dramon] in its name from your hand " +
    "under this Digimon as its bottom digivolution card. When DNA digivolving, you may play 1 green or blue " +
    "Digimon card with [Dramon] in its name and 12000 DP or less from your hand without paying the cost.";

  it("explains bottom placement and exposes the eligible Dramon family choices", () => {
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "examon-place-bottom",
            seat: 0,
            kind: "selectCards",
            promptText: "Select cards",
            sourceCardId: "EX3-074",
            options: {
              candidateInstanceIds: ["slayerdramon", "breakdramon"],
              min: 1,
              max: 1,
              timing: "WhenDigivolving",
              effectText: whenDigivolvingText,
            },
          }}
          sourceCardId="EX3-074"
          candidates={[
            { instanceId: "slayerdramon", cardId: "EX3-024" },
            { instanceId: "breakdramon", cardId: "EX3-044" },
          ]}
          picks={["slayerdramon"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={vi.fn<(response: DecisionResponse) => void>()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(whenDigivolvingText)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Slayerdramon, selected/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Breakdramon" })).toBeTruthy();
  });

  it("shows the DNA-only free-play limit beside its playable Dramon candidates", () => {
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "examon-play-dramon",
            seat: 0,
            kind: "selectCards",
            promptText: "Select cards",
            sourceCardId: "EX3-074",
            options: {
              candidateInstanceIds: ["slayerdramon", "breakdramon"],
              min: 1,
              max: 1,
              timing: "WhenDigivolving",
              effectText: whenDigivolvingText,
            },
          }}
          sourceCardId="EX3-074"
          candidates={[
            { instanceId: "slayerdramon", cardId: "EX3-024" },
            { instanceId: "breakdramon", cardId: "EX3-044" },
          ]}
          picks={[]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={vi.fn<(response: DecisionResponse) => void>()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(/When DNA digivolving.*12000 DP or less.*without paying the cost/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Slayerdramon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Breakdramon" })).toBeTruthy();
  });

  it("shows the complete Once Per Turn consequence while selecting the opposing Digimon", () => {
    const allTurnsText =
      "[All Turns][Once Per Turn] When this Digimon becomes suspended, unsuspend it, and suspend 1 of your opponent's Digimon.";
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "examon-suspend-opponent",
            seat: 0,
            kind: "chooseTargets",
            promptText: "Choose targets",
            sourceCardId: "EX3-074",
            options: {
              candidateInstanceIds: ["opponent-digimon"],
              min: 1,
              max: 1,
              timing: "AllTurns",
              effectText: allTurnsText,
            },
          }}
          sourceCardId="EX3-074"
          candidates={[{ instanceId: "opponent-digimon", cardId: "BT1-028" }]}
          picks={["opponent-digimon"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={vi.fn<(response: DecisionResponse) => void>()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(allTurnsText)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Elecmon, selected/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm targets" })).toBeTruthy();
  });
});

describe("EX3-040 Parasaurmon decisions", () => {
  it("explains the optional suspend-cost reduction and exposes clear accept/decline actions", () => {
    const effectText =
      "[Your Turn] When you would play a green Digimon card, by suspending this Digimon, reduce the cost by 1.";
    renderDecision({
      decisionId: "parasaurmon-reducer",
      seat: 0,
      kind: "optional",
      promptText: "Suspend Parasaurmon to reduce this green Digimon's play cost by 1?",
      sourceCardId: "EX3-040",
      options: { timing: "YourTurn", effectText },
    });

    expect(screen.getByText("Suspend Parasaurmon to reduce this green Digimon's play cost by 1?")).toBeTruthy();
    expect(screen.getByText(effectText)).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
  });

  it("shows the inherited clause and a clear confirmation for the opposing Digimon target", () => {
    const effectText =
      "[Your Turn][Once Per Turn] When an effect suspends one of your Digimon, suspend 1 of your opponent's Digimon.";
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "parasaurmon-inherited-target",
            seat: 0,
            kind: "chooseTargets",
            promptText: "Parasaurmon",
            sourceCardId: "EX3-040",
            options: {
              candidateInstanceIds: ["opponent-digimon"],
              min: 1,
              max: 1,
              timing: "YourTurn",
              effectText,
            },
          }}
          sourceCardId="EX3-040"
          candidates={[{ instanceId: "opponent-digimon", cardId: "BT1-028" }]}
          picks={["opponent-digimon"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={vi.fn<(response: DecisionResponse) => void>()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(effectText)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Elecmon/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm targets" })).toBeTruthy();
  });
});

describe("EX3-054 Darkdramon decisions", () => {
  const reducerText =
    "When you would digivolve into this card, by returning up to 5 cards with [D-Brigade] in their traits from your trash to the top of your deck, reduce the digivolution cost by 1 for each returned card.";

  it("presents the reducer as a clear choice with explicit decline and activate actions", () => {
    renderDecision({
      decisionId: "darkdramon-reducer",
      seat: 0,
      kind: "optional",
      promptText: "Return D-Brigade cards to reduce the digivolution cost?",
      sourceCardId: "EX3-054",
      options: { timing: "Static", effectText: reducerText },
    });

    expect(screen.getByText(reducerText)).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
  });

  it("shows eligible D-Brigade cards and explains their deck-top order", () => {
    const candidates = [
      { instanceId: "commandramon", cardId: "EX3-046" },
      { instanceId: "sealsdramon", cardId: "EX3-049" },
    ];
    const { rerender } = render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "darkdramon-select",
            seat: 0,
            kind: "selectCards",
            promptText: "Darkdramon",
            sourceCardId: "EX3-054",
            options: { min: 1, max: 5, timing: "Static", effectText: reducerText },
          }}
          sourceCardId="EX3-054"
          candidates={candidates}
          picks={[]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={vi.fn<(response: DecisionResponse) => void>()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(reducerText)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Commandramon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sealsdramon" })).toBeTruthy();

    rerender(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "darkdramon-order",
            seat: 0,
            kind: "orderCards",
            promptText: "Choose the card order",
            sourceCardId: "EX3-054",
            options: { orderDestination: "deckTop", timing: "Static", effectText: reducerText },
          }}
          sourceCardId="EX3-054"
          candidates={candidates}
          picks={[]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={vi.fn<(response: DecisionResponse) => void>()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(/Number 1 will be nearest the top/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm order" })).toBeTruthy();
  });
});

describe("EX3-055 Wormmon errata decisions", () => {
  const effectText =
    "[On Play] Reveal the top 3 cards of your deck. Add 1 purple or red card with [Imperialdramon] in its name or [Free] in its traits among them to your hand, and trash 1 purple or red card with [Imperialdramon] in its name or [Free] in its traits among them. Place the rest at the bottom of your deck in any order.";
  const revealed = [
    { instanceId: "dinobeemon", cardId: "EX3-061" },
    { instanceId: "imperialdramon", cardId: "EX3-063" },
    { instanceId: "agumon", cardId: "BT1-010", selectable: false },
  ];

  it("shows the full reveal, disables the ineligible card, and offers a clear confirmation", () => {
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "wormmon-add",
            seat: 0,
            kind: "selectCards",
            promptText: "Wormmon",
            sourceCardId: "EX3-055",
            options: {
              candidateInstanceIds: ["dinobeemon", "imperialdramon"],
              visibleInstanceIds: ["dinobeemon", "imperialdramon", "agumon"],
              min: 1,
              max: 1,
              timing: "OnPlay",
              effectText,
            },
          }}
          sourceCardId="EX3-055"
          candidates={revealed}
          picks={["dinobeemon"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={vi.fn<(response: DecisionResponse) => void>()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(effectText)).toBeTruthy();
    expect((screen.getByRole("button", { name: /Dinobeemon/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: /Imperialdramon: Dragon Mode/ }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect((screen.getByRole("button", { name: "Agumon" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Confirm targets" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("labels the remaining-card order as deck bottom and exposes reorder controls", () => {
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "wormmon-bottom-order",
            seat: 0,
            kind: "orderCards",
            promptText: "Choose the card order",
            sourceCardId: "EX3-055",
            options: { orderDestination: "deckBottom", timing: "OnPlay", effectText },
          }}
          sourceCardId="EX3-055"
          candidates={revealed.slice(1)}
          picks={[]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={vi.fn<(response: DecisionResponse) => void>()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(/Arrange the cards in deck order/)).toBeTruthy();
    expect(screen.getByText(/Number 1 will be nearest the top/)).toBeTruthy();
    expect((screen.getAllByRole("button", { name: /Move card down/ })[0] as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Confirm order" }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("EX3-056 Guilmon On Deletion decision", () => {
  it("shows the complete consequence, eligible targets, and a friendly confirmation", () => {
    const onRespond = vi.fn<(response: DecisionResponse) => void>();
    const onTogglePick = vi.fn<(instanceId: string) => void>();
    const effectText =
      "[On Deletion] Delete 1 of your opponent's Digimon with 3000 DP or less. If no Digimon is deleted by this effect, trash the top 2 cards of both players' decks.";
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "guilmon-delete",
            seat: 0,
            kind: "chooseTargets",
            promptText: "Choose 1 Digimon to delete",
            sourceCardId: "EX3-056",
            options: {
              candidateInstanceIds: ["agumon", "guilmon"],
              min: 1,
              max: 1,
              timing: "OnDeletion",
              effectText,
            },
          }}
          sourceCardId="EX3-056"
          candidates={[
            { instanceId: "agumon", cardId: "BT1-010", sourceCount: 0 },
            { instanceId: "guilmon", cardId: "EX3-056", sourceCount: 1 },
          ]}
          picks={["agumon"]}
          onTogglePick={onTogglePick}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(effectText)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Agumon/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Guilmon.*1 source/ })).toBeTruthy();
    const confirm = screen.getByRole("button", { name: "Confirm targets" });
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(confirm);
    expect(onRespond).toHaveBeenCalledWith({ kind: "chooseTargets", instanceIds: ["agumon"] });
  });
});

describe("EX3-057 Growlmon decisions", () => {
  const inheritedText =
    "[When Attacking][Once Per Turn] By deleting 1 of your other Digimon, this Digimon gains ＜Security Attack +1＞ for the turn. (This Digimon checks 1 additional security card.)";

  it("offers one clear accept/decline prompt for the inherited attack effect", () => {
    const onRespond = vi.fn<(response: DecisionResponse) => void>();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "growlmon-optional",
            seat: 0,
            kind: "optional",
            promptText: "Activate Growlmon's inherited effect?",
            sourceCardId: "EX3-057",
            options: { timing: "WhenAttacking", effectText: inheritedText },
          }}
          sourceCardId="EX3-057"
          candidates={[]}
          picks={[]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(inheritedText)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Yes, activate" }));
    expect(onRespond).toHaveBeenCalledWith({ kind: "optional", accept: true });
  });

  it("shows distinguishable other-Digimon cost targets and confirms the chosen one", () => {
    const onRespond = vi.fn<(response: DecisionResponse) => void>();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "growlmon-cost",
            seat: 0,
            kind: "chooseTargets",
            promptText: "Choose 1 of your other Digimon to delete",
            sourceCardId: "EX3-057",
            options: {
              candidateInstanceIds: ["guilmon", "gazimon"],
              min: 1,
              max: 1,
              timing: "WhenAttacking",
              effectText: inheritedText,
            },
          }}
          sourceCardId="EX3-057"
          candidates={[
            { instanceId: "guilmon", cardId: "ST7-03", sourceCount: 0 },
            { instanceId: "gazimon", cardId: "BT10-071", sourceCount: 1 },
          ]}
          picks={["guilmon"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: /Guilmon/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Gazimon.*1 source/ })).toBeTruthy();
    const confirm = screen.getByRole("button", { name: "Confirm targets" });
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(confirm);
    expect(onRespond).toHaveBeenCalledWith({ kind: "chooseTargets", instanceIds: ["guilmon"] });
  });
});

describe("EX3-041 Groundramon decisions", () => {
  it("shows only the friendly end-turn DNA clause and both optional actions", () => {
    const fullText =
      "Digivolve: 3 from [Coredramon]＜Blocker＞ (When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead.) [Your Turn] [Examon] in your hand can treat this Digimon as level 6 for DNA digivolution.[End of Your Turn] This Digimon and 1 of your other Digimon with [Dramon] in its name may DNA digivolve into a Digimon card in your hand by paying its DNA digivolve cost.";
    const endTurnClause =
      "[End of Your Turn] This Digimon and 1 of your other Digimon with [Dramon] in its name may DNA digivolve into a Digimon card in your hand by paying its DNA digivolve cost.";
    renderDecision({
      decisionId: "groundramon-end-turn-dna",
      seat: 0,
      kind: "optional",
      promptText: "Activate the effect?",
      sourceCardId: "EX3-041",
      options: { timing: "EndOfYourTurn", effectText: fullText },
    });

    expect(screen.getByText(endTurnClause)).toBeTruthy();
    expect(screen.queryByText(/When an opponent's Digimon attacks/)).toBeNull();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
  });
});

describe("EX3-042 Toropiamon decisions", () => {
  it("shows the exact When Digivolving clause and a clear target confirmation", () => {
    const effectText = "[When Digivolving] If this Digimon is suspended, suspend 1 of your opponent's Digimon.";
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "toropiamon-when-digivolving",
            seat: 0,
            kind: "chooseTargets",
            promptText: "Toropiamon",
            sourceCardId: "EX3-042",
            options: {
              candidateInstanceIds: ["opponent-digimon"],
              min: 1,
              max: 1,
              timing: "WhenDigivolving",
              effectText,
            },
          }}
          sourceCardId="EX3-042"
          candidates={[{ instanceId: "opponent-digimon", cardId: "BT1-028" }]}
          picks={["opponent-digimon"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={vi.fn<(response: DecisionResponse) => void>()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(effectText)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Elecmon/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm targets" })).toBeTruthy();
  });

  it("keeps the inherited once-per-turn clause distinct from the main effect", () => {
    const inheritedEffect =
      "[Your Turn][Once Per Turn] When an effect suspends one of your Digimon, suspend 1 of your opponent's Digimon.";
    renderDecision({
      decisionId: "toropiamon-inherited",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Toropiamon",
      sourceCardId: "EX3-042",
      options: { candidateInstanceIds: [], min: 1, max: 1, timing: "YourTurn", effectText: inheritedEffect },
    });

    expect(screen.getByText(inheritedEffect)).toBeTruthy();
    expect(screen.queryByText(/If this Digimon is suspended/)).toBeNull();
    expect(screen.getByRole("button", { name: "Confirm targets" }).hasAttribute("disabled")).toBe(true);
  });
});

describe("EX3-043 Entmon decisions", () => {
  const digisorptionEffect =
    "＜Digisorption -3＞ (When one of your Digimon digivolves into this card from your hand, you may suspend 1 of your Digimon to reduce the digivolution cost by 3.)";

  it("explains Digisorption's payment and exposes clear accept/decline actions", () => {
    renderDecision({
      decisionId: "entmon-digisorption",
      seat: 0,
      kind: "optional",
      promptText: "＜Digisorption -3＞: suspend 1 Digimon to reduce the digivolution cost by 3?",
      sourceCardId: "EX3-043",
      options: { timing: "Static", effectText: digisorptionEffect },
    });

    expect(
      screen.getByText("＜Digisorption -3＞: suspend 1 Digimon to reduce the digivolution cost by 3?"),
    ).toBeTruthy();
    expect(screen.getByText(digisorptionEffect)).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
  });

  it("shows the eligible Vegetation cost and confirms exactly one target", () => {
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "entmon-digisorption-target",
            seat: 0,
            kind: "chooseTargets",
            promptText: "Entmon",
            sourceCardId: "EX3-043",
            options: {
              candidateInstanceIds: ["pomumon-cost"],
              min: 1,
              max: 1,
              timing: "Static",
              effectText: digisorptionEffect,
            },
          }}
          sourceCardId="EX3-043"
          candidates={[{ instanceId: "pomumon-cost", cardId: "EX3-038" }]}
          picks={["pomumon-cost"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={vi.fn<(response: DecisionResponse) => void>()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(digisorptionEffect)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Pomumon/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm targets" })).toBeTruthy();
  });
});

describe("EX3-044 Breakdramon decisions", () => {
  it("shows only the friendly suspension clause and exposes the opposing Digimon action", () => {
    const fullText =
      "Digivolve: 3 from [Groundramon] or [Wingdramon][All Turns][Once Per Turn] When this Digimon becomes suspended, suspend 1 of your opponent's Digimon.[All Turns][Once Per Turn] When one of your Digimon with [Dramon] or [Examon] in its name deletes an opponent's Digimon in battle and survives, trash the top card of your opponent's security stack.";
    const suspensionClause =
      "[All Turns][Once Per Turn] When this Digimon becomes suspended, suspend 1 of your opponent's Digimon.";

    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "breakdramon-suspend-target",
            seat: 0,
            kind: "chooseTargets",
            promptText: "Breakdramon",
            sourceCardId: "EX3-044",
            options: {
              candidateInstanceIds: ["opponent-digimon"],
              min: 1,
              max: 1,
              timing: "AllTurns",
              effectText: fullText,
            },
          }}
          sourceCardId="EX3-044"
          candidates={[{ instanceId: "opponent-digimon", cardId: "BT1-028" }]}
          picks={["opponent-digimon"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={vi.fn<(response: DecisionResponse) => void>()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(suspensionClause)).toBeTruthy();
    expect(screen.queryByText(/deletes an opponent's Digimon in battle/)).toBeNull();
    expect(screen.getByRole("button", { name: /Elecmon/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm targets" })).toBeTruthy();
  });
});

describe("EX3-045 Hydramon decisions", () => {
  it("explains the optional digivolution suspension with clear accept and decline actions", () => {
    const effectText = "[When Digivolving] You may suspend 1 Digimon.";
    renderDecision({
      decisionId: "hydramon-optional-suspend",
      seat: 0,
      kind: "optional",
      promptText: "Activate Hydramon's effect?",
      sourceCardId: "EX3-045",
      options: { timing: "WhenDigivolving", effectText },
    });

    expect(screen.getByText("Activate Hydramon's effect?")).toBeTruthy();
    expect(screen.getByText(effectText)).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
  });

  it("shows every Digimon candidate and the optional zero-to-one target contract", () => {
    const effectText = "[When Digivolving] You may suspend 1 Digimon.";
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "hydramon-suspend-target",
            seat: 0,
            kind: "chooseTargets",
            promptText: "Hydramon",
            sourceCardId: "EX3-045",
            options: {
              candidateInstanceIds: ["own-digimon", "opponent-digimon"],
              min: 0,
              max: 1,
              timing: "WhenDigivolving",
              effectText,
            },
          }}
          sourceCardId="EX3-045"
          candidates={[
            { instanceId: "own-digimon", cardId: "EX3-038", sourceCount: 0 },
            { instanceId: "opponent-digimon", cardId: "BT1-028", sourceCount: 2 },
          ]}
          picks={[]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={vi.fn<(response: DecisionResponse) => void>()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(effectText)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Pomumon, 0 source/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Elecmon, 2 source/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm targets" })).toBeTruthy();
  });

  it("shows only the end-turn return clause and a clear opposing target action", () => {
    const effectText =
      "[End of Your Turn][Once Per Turn] If you have 2 or more suspended Digimon with [Vegetation], [Plant], or [Fairy] in one of their traits, return 1 of your opponent's suspended Digimon to the bottom of its owner's deck.";
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "hydramon-return-target",
            seat: 0,
            kind: "chooseTargets",
            promptText: "Hydramon",
            sourceCardId: "EX3-045",
            options: {
              candidateInstanceIds: ["opponent-digimon"],
              min: 1,
              max: 1,
              timing: "OnEndTurn",
              effectText,
            },
          }}
          sourceCardId="EX3-045"
          candidates={[{ instanceId: "opponent-digimon", cardId: "BT1-028", isSuspended: true }]}
          picks={["opponent-digimon"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={vi.fn<(response: DecisionResponse) => void>()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(effectText)).toBeTruthy();
    expect(screen.queryByText(/When an opponent's Digimon becomes suspended/)).toBeNull();
    expect(screen.getByRole("button", { name: /Elecmon.*Suspended/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm targets" })).toBeTruthy();
  });
});

describe("EX3-046 Commandramon decisions", () => {
  it("explains the Decoy cost and exposes clear protect-or-decline actions", () => {
    const effectText =
      "＜Decoy ([D-Brigade])＞ (When one of your other Digimon with [D-Brigade] in its traits would be deleted by an opponent's effect, you may delete this Digimon to prevent that deletion.)";
    const onRespond = vi.fn<(response: DecisionResponse) => void>();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "commandramon-decoy",
            seat: 0,
            kind: "selectCards",
            promptText: "＜Decoy＞: excluir este Digimon para impedir que o outro Digimon seja excluído?",
            sourceCardId: "EX3-046",
            options: {
              candidateInstanceIds: ["commandramon"],
              min: 0,
              max: 1,
              timing: "Static",
              effectText,
            },
          }}
          sourceCardId="EX3-046"
          candidates={[{ instanceId: "commandramon", cardId: "EX3-046", sourceCount: 0 }]}
          picks={["commandramon"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );

    expect(
      screen.getByText("＜Decoy＞: excluir este Digimon para impedir que o outro Digimon seja excluído?"),
    ).toBeTruthy();
    expect(screen.getByText(effectText)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Commandramon, 0 source/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "None" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));
    expect(onRespond).toHaveBeenCalledWith({ kind: "selectCards", instanceIds: ["commandramon"] });
  });
});

describe("EX3-051 Tankdramon decisions", () => {
  it("shows the full reveal, enables only Commandramon, and offers a clear decline action", () => {
    const onRespond = vi.fn<(response: DecisionResponse) => void>();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "tankdramon-reveal",
            seat: 0,
            kind: "selectCards",
            promptText: "Tankdramon",
            sourceCardId: "EX3-051",
            options: {
              candidateInstanceIds: ["commandramon"],
              visibleInstanceIds: ["commandramon", "tankdramon", "hina"],
              visibleCards: [
                { instanceId: "commandramon", cardId: "EX3-046" },
                { instanceId: "tankdramon", cardId: "EX3-051" },
                { instanceId: "hina", cardId: "EX3-065" },
              ],
              min: 0,
              max: 1,
              timing: "YourTurn",
            },
          }}
          sourceCardId="EX3-051"
          candidates={[
            { instanceId: "commandramon", cardId: "EX3-046", selectable: true },
            { instanceId: "tankdramon", cardId: "EX3-051", selectable: false },
            { instanceId: "hina", cardId: "EX3-065", selectable: false },
          ]}
          picks={[]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(/Reveal the top 2 cards of your deck/i)).toBeTruthy();
    expect(screen.getByText(/play 1 \[Commandramon\].*without paying the cost/i)).toBeTruthy();
    expect(screen.getByText(/Trash the rest/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Commandramon/ }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: /Tankdramon/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: /Hina Kurihara/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "None" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));
    expect(onRespond).toHaveBeenCalledWith({ kind: "selectCards", instanceIds: [] });
  });
});

describe("EX3-052 Jazarichmon decisions", () => {
  it("shows the full De-Digivolve clause and distinguishes opposing stacks by source count", () => {
    const onRespond = vi.fn<(response: DecisionResponse) => void>();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "jazarichmon-target",
            seat: 0,
            kind: "chooseTargets",
            promptText: "Choose targets",
            sourceCardId: "EX3-052",
            options: {
              candidateInstanceIds: ["large-stack", "small-stack"],
              min: 1,
              max: 1,
              timing: "OnPlay",
              effectText: "[On Play] DeDigivolve",
            },
          }}
          sourceCardId="EX3-052"
          candidates={[
            { instanceId: "large-stack", cardId: "EX3-053", sourceCount: 2 },
            { instanceId: "small-stack", cardId: "EX3-053", sourceCount: 1 },
          ]}
          picks={["large-stack"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(/De-Digivolve 1.*opponent's Digimon/i)).toBeTruthy();
    expect(screen.getByText(/play 1 \[Hina Kurihara\].*without paying the cost/i)).toBeTruthy();
    expect(screen.queryByText("[On Play] DeDigivolve")).toBeNull();
    expect(screen.getByRole("button", { name: /Metallicdramon, 2 sources/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Metallicdramon, 1 source/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));
    expect(onRespond).toHaveBeenCalledWith({ kind: "chooseTargets", instanceIds: ["large-stack"] });
  });

  it("offers friendly accept and decline actions for the optional Hina play", () => {
    const onRespond = vi.fn<(response: DecisionResponse) => void>();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "jazarichmon-hina",
            seat: 0,
            kind: "optional",
            promptText: "PlayWithoutCost",
            sourceCardId: "EX3-052",
            options: { timing: "OnPlay", effectText: "[OnPlay] PlayWithoutCost" },
          }}
          sourceCardId="EX3-052"
          candidates={[]}
          picks={[]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(/play 1 \[Hina Kurihara\].*without paying the cost/i)).toBeTruthy();
    expect(screen.queryByText("PlayWithoutCost")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "No, decline" }));
    expect(onRespond).toHaveBeenCalledWith({ kind: "optional", accept: false });
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
  });
});

describe("EX3-053 Metallicdramon decisions", () => {
  it("shows the full consequence before confirming the Digimon to delete", () => {
    const onRespond = vi.fn<(response: DecisionResponse) => void>();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "metallicdramon-delete",
            seat: 0,
            kind: "chooseTargets",
            promptText: "Choose targets",
            sourceCardId: "EX3-053",
            options: {
              candidateInstanceIds: ["first-target", "second-target"],
              min: 1,
              max: 1,
              timing: "OnPlay",
              effectText: "[On Play] Delete",
            },
          }}
          sourceCardId="EX3-053"
          candidates={[
            { instanceId: "first-target", cardId: "EX3-049" },
            { instanceId: "second-target", cardId: "EX3-049" },
          ]}
          picks={["second-target"]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(/De-Digivolve 1.*all of your opponent's Digimon/i)).toBeTruthy();
    expect(screen.getByText(/delete 1.*play cost of 5 or less/i)).toBeTruthy();
    expect(screen.getByText(/If no Digimon is deleted.*unsuspended Digimon can digivolve/i)).toBeTruthy();
    expect(screen.queryByText("[On Play] Delete")).toBeNull();
    expect(screen.getAllByRole("button", { name: /Sealsdramon/ })).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));
    expect(onRespond).toHaveBeenCalledWith({ kind: "chooseTargets", instanceIds: ["second-target"] });
  });
});

describe("digivolution cost choice", () => {
  it("shows Dracomon's two friendly routes and sends the selected alternate action", () => {
    const onConfirm = vi.fn<(useAlternate: boolean) => void>();
    render(
      <I18nProvider>
        <EvoCostChoiceOverlay
          evolvingCardId="EX3-037"
          baseName="Bebydomon"
          options={[
            { type: "normal", label: "Blue Lv.2", cost: 1 },
            { type: "alternate", label: "Bebydomon", cost: 0 },
          ]}
          onConfirm={onConfirm}
          onCancel={vi.fn<() => void>()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText("Digivolve cost")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Blue Lv.2 · 1 memory" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Bebydomon · 0 memory" }));
    expect(onConfirm).toHaveBeenCalledWith(true);
  });

  it("shows the digivolving card's art beside the title instead of a bare sigil", () => {
    const { container } = render(
      <I18nProvider>
        <EvoCostChoiceOverlay
          evolvingCardId="EX3-037"
          baseName="Bebydomon"
          options={[{ type: "normal", label: "Blue Lv.2", cost: 1 }]}
          onConfirm={vi.fn<(useAlternate: boolean) => void>()}
          onCancel={vi.fn<() => void>()}
        />
      </I18nProvider>,
    );

    // Either the art or its sigil fallback, but always at a size a thumb can read.
    const art = container.querySelector<HTMLElement>(".evo-cost-prompt > div > :first-child");
    expect(art).not.toBeNull();
    expect(art?.style.width).toBe("56px");
  });
});

describe("decision board preview", () => {
  function expectDracomonRevealText() {
    expect(screen.getByText(/Reveal the top 4 cards of your deck/i)).toBeTruthy();
    expect(screen.getByText(/1 green or blue card with \[Dramon\] in its name/i)).toBeTruthy();
    expect(screen.getByText(/1 card with \[Examon\] in its name/i)).toBeTruthy();
    expect(screen.getByText(/bottom of your deck in any order/i)).toBeTruthy();
  }

  it("shows Pomumon's friendly self-suspension reaction and target action", () => {
    renderDecision({
      decisionId: "pomumon-effect-suspend",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose targets",
      sourceCardId: "EX3-038",
      options: {
        timing: "YourTurn",
        candidateInstanceIds: ["opponent-digimon"],
        min: 1,
        max: 1,
      },
    });

    expect(screen.getByText("Resolve effect")).toBeTruthy();
    expect(screen.getByText(/When an effect suspends this Digimon/i)).toBeTruthy();
    expect(screen.getByText(/suspend 1 of your opponent's Digimon/i)).toBeTruthy();
    expect(screen.queryByText("Choose targets")).toBeNull();
    expect(screen.getByRole("button", { name: "Confirm targets" })).toBeTruthy();
  });

  it("shows Dracomon's complete reveal action for the card selection step", () => {
    renderDecision({
      decisionId: "dracomon-reveal-select",
      seat: 0,
      kind: "selectCards",
      promptText: "Select cards",
      sourceCardId: "EX3-037",
      options: {
        timing: "OnPlay",
        candidateInstanceIds: ["dramon", "examon", "other"],
        min: 1,
        max: 1,
      },
    });

    expect(screen.getByText("Resolve effect")).toBeTruthy();
    expect(screen.queryByText("Select cards")).toBeNull();
    expect(screen.getByRole("button", { name: "Confirm targets" })).toBeTruthy();
    expectDracomonRevealText();
  });

  it("shows Dracomon's complete reveal action for the deck-order step", () => {
    renderDecision({
      decisionId: "dracomon-reveal-order",
      seat: 0,
      kind: "orderCards",
      promptText: "Choose the card order",
      sourceCardId: "EX3-037",
      options: {
        timing: "OnPlay",
        candidateInstanceIds: ["other-1", "other-2", "other-3"],
        min: 3,
        max: 3,
        orderDestination: "deckBottom",
      },
    });

    expect(screen.getByText("Choose the card order")).toBeTruthy();
    expect(screen.getByText(/Arrange the cards in deck order/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm order" })).toBeTruthy();
    expectDracomonRevealText();
  });

  it.each([
    ["selectCards", "Confirm targets"],
    ["orderCards", "Confirm order"],
  ] as const)("shows Jazardmon's full mandatory Dragon/Hina search during %s", (kind, actionName) => {
    renderDecision({
      decisionId: `jazardmon-${kind}`,
      seat: 0,
      kind,
      promptText: kind === "selectCards" ? "Select cards" : "Choose the card order",
      sourceCardId: "EX3-048",
      options: {
        timing: "OnPlay",
        candidateInstanceIds: ["eligible"],
        visibleInstanceIds: ["eligible", "disabled-1", "disabled-2", "disabled-3"],
        min: 1,
        max: 1,
        orderDestination: kind === "orderCards" ? "deckBottom" : undefined,
      },
    });

    expect(screen.getByText(/Reveal the top 4 cards of your deck/i)).toBeTruthy();
    expect(screen.getByText(/\[Rock Dragon\].*\[Earth Dragon\].*\[Bird Dragon\]/i)).toBeTruthy();
    expect(screen.getByText(/\[Machine Dragon\].*\[Sky Dragon\]/i)).toBeTruthy();
    expect(screen.getByText(/and 1 \[Hina Kurihara\]/i)).toBeTruthy();
    expect(screen.getByText(/Place the rest at the bottom of your deck in any order/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: actionName })).toBeTruthy();
    expect(screen.queryByText("Select cards")).toBeNull();
  });

  it("shows both Magnadramon Security Attack branches in its On Play clause", () => {
    renderDecision({
      decisionId: "magnadramon-security-attack",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose targets",
      sourceCardId: "EX3-036",
      options: { timing: "OnPlay", candidateInstanceIds: ["opponent-digimon"], min: 1, max: 1 },
    });

    expect(screen.getByText("Resolve effect")).toBeTruthy();
    expect(screen.getByText(/All of your opponent's Digimon gain.*Security Attack -1/i)).toBeTruthy();
    expect(screen.getByText(/played by \[Trial of the Four Great Dragons\]'s effect/i)).toBeTruthy();
    expect(screen.getByText(/Security Attack -2.*instead/i)).toBeTruthy();
    expect(screen.getByText(/until the end of your opponent's turn/i)).toBeTruthy();
    expect(screen.queryByText("Choose targets")).toBeNull();
  });

  it("shows Magnadramon's optional On Deletion placement with explicit actions", () => {
    renderDecision({
      decisionId: "magnadramon-place-trial",
      seat: 0,
      kind: "optional",
      promptText: "Use this effect?",
      sourceCardId: "EX3-036",
      options: { timing: "OnDestroyedAnyone" },
    });

    expect(screen.getByText("Use this effect?")).toBeTruthy();
    expect(screen.getByText(/If you don't have a \[Trial of the Four Great Dragons\] in play/i)).toBeTruthy();
    expect(screen.getByText(/you may place 1 \[Trial of the Four Great Dragons\] from your hand/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
  });

  it("shows Goldramon's optional Four Great Dragons return on digivolution", () => {
    renderDecision({
      decisionId: "goldramon-return-dragon",
      seat: 0,
      kind: "optional",
      promptText: "Use this effect?",
      sourceCardId: "EX3-035",
      options: { timing: "WhenDigivolving" },
    });

    expect(screen.getByText("Use this effect?")).toBeTruthy();
    expect(screen.getByText(/You may return 1 card with the \[Four Great Dragons\] trait/i)).toBeTruthy();
    expect(screen.getByText(/from your trash to your hand/i)).toBeTruthy();
  });

  it.each([
    ["selectCards", "Select cards"],
    ["orderCards", "Choose the card order"],
  ] as const)("shows Goldramon's complete attack clause for the %s step", (kind, promptText) => {
    renderDecision({
      decisionId: `goldramon-attack-${kind}`,
      seat: 0,
      kind,
      promptText,
      sourceCardId: "EX3-035",
      options: {
        timing: "WhenAttacking",
        candidateInstanceIds: ["magnadramon", "azulongmon", "megidramon"],
        min: kind === "selectCards" ? 0 : 3,
        max: kind === "selectCards" ? 1 : 3,
        orderDestination: kind === "orderCards" ? "deckBottom" : undefined,
      },
    });

    if (kind === "orderCards") {
      expect(screen.getByText("Choose the card order")).toBeTruthy();
      expect(screen.getByText(/Arrange the cards in deck order/i)).toBeTruthy();
      expect(screen.getByRole("button", { name: "Confirm order" })).toBeTruthy();
    } else {
      expect(screen.getByText("Resolve effect")).toBeTruthy();
      expect(screen.queryByText(promptText)).toBeNull();
      expect(screen.getByRole("button", { name: "None" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Confirm targets" })).toBeTruthy();
    }
    expect(screen.getByText(/1 of your opponent's Digimon gets -6000/i)).toBeTruthy();
    expect(screen.getByText(/Magnadramon.*Azulongmon.*Megidramon/i)).toBeTruthy();
    expect(screen.getByText(/bottom of your deck in any order/i)).toBeTruthy();
    expect(screen.getByText(/trash the top 2 cards of your opponent's security stack/i)).toBeTruthy();
  });

  it("shows Angewomon's complete Four Great Dragons DP-reduction action", () => {
    renderDecision({
      decisionId: "angewomon-four-great-dragons-debuff",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose targets",
      sourceCardId: "EX3-034",
      options: { timing: "YourTurn", candidateInstanceIds: ["opponent-digimon"], min: 1, max: 1 },
    });

    expect(screen.getByText("Resolve effect")).toBeTruthy();
    expect(screen.getByText(/When you play a Digimon with \[Four Great Dragons\]/i)).toBeTruthy();
    expect(screen.getByText(/or place \[Trial of the Four Great Dragons\] in your battle area/i)).toBeTruthy();
    expect(screen.getByText(/1 of your opponent's Digimon gets -3000 DP for the turn/i)).toBeTruthy();
    expect(screen.queryByText("Choose targets")).toBeNull();
  });

  it("shows AeroVeedramon's optional Trial placement using the errata wording", () => {
    renderDecision({
      decisionId: "aeroveedramon-place-trial",
      seat: 0,
      kind: "optional",
      promptText: "Use this effect?",
      sourceCardId: "EX3-033",
      options: { timing: "WhenDigivolving" },
    });

    expect(screen.getByText("Use this effect?")).toBeTruthy();
    expect(screen.getByText(/If you don't have a \[Trial of the Four Great Dragons\] in play/i)).toBeTruthy();
    expect(screen.getByText(/you may place 1 \[Trial of the Four Great Dragons\] from your hand/i)).toBeTruthy();
    expect(screen.getByText(/in your battle area/i)).toBeTruthy();
    expect(screen.queryByText(/play 1 \[Trial of the Four Great Dragons\]/i)).toBeNull();
  });

  it("shows Majiramon's complete target debuff and Four Sovereigns bonus", () => {
    renderDecision({
      decisionId: "majiramon-security-attack-debuff",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose targets",
      sourceCardId: "EX3-032",
      options: { timing: "OnPlay", candidateInstanceIds: ["opponent-digimon"], min: 1, max: 1 },
    });

    expect(screen.getByText("Resolve effect")).toBeTruthy();
    expect(screen.getByText(/1 of your opponent's Digimon gains.*Security Attack -2/i)).toBeTruthy();
    expect(screen.getByText(/until the end of your opponent's turn/i)).toBeTruthy();
    expect(screen.getByText(/Four Sovereigns.*gain 2 memory/i)).toBeTruthy();
    expect(screen.queryByText("Choose targets")).toBeNull();
  });

  it("shows Veedramon's full Dramon/Four Great Dragons search for each mandatory choice", () => {
    renderDecision({
      decisionId: "veedramon-reveal-search",
      seat: 0,
      kind: "selectCards",
      promptText: "Select cards",
      sourceCardId: "EX3-031",
      options: { timing: "WhenDigivolving", candidateInstanceIds: ["dramon"], min: 1, max: 1 },
    });

    expect(screen.getByText("Resolve effect")).toBeTruthy();
    expect(screen.getByText(/Reveal the top 4 cards of your deck/i)).toBeTruthy();
    expect(screen.getByText(/1 yellow card with \[Dramon\] in its name/i)).toBeTruthy();
    expect(screen.getByText(/1 card with \[Four Great Dragons\] in its traits/i)).toBeTruthy();
    expect(screen.getByText(/bottom of your deck in any order/i)).toBeTruthy();
    expect(screen.queryByText("Select cards")).toBeNull();
  });

  it("shows Gatomon's errata search for its revealed-card choice", () => {
    renderDecision({
      decisionId: "gatomon-reveal-search",
      seat: 0,
      kind: "selectCards",
      promptText: "Select cards",
      sourceCardId: "EX3-030",
      options: { timing: "OnPlay", candidateInstanceIds: ["angel"], min: 1, max: 1 },
    });

    expect(screen.getByText("Resolve effect")).toBeTruthy();
    expect(screen.getByText(/Reveal the top 4 cards of your deck/i)).toBeTruthy();
    expect(screen.getByText(/other than \[Three Great Angels\]/i)).toBeTruthy();
    expect(screen.getByText(/1 card with the \[Four Great Dragons\] trait/i)).toBeTruthy();
    expect(screen.queryByText("Select cards")).toBeNull();
  });

  it("shows Airdramon's private security search and conditional Recovery in one friendly clause", () => {
    renderDecision({
      decisionId: "airdramon-security-search",
      seat: 0,
      kind: "selectCards",
      promptText: "Select cards",
      sourceCardId: "EX3-029",
      options: {
        timing: "OnPlay",
        candidateInstanceIds: ["security-1", "security-2"],
        visibleInstanceIds: ["security-1", "security-2"],
        min: 1,
        max: 1,
      },
    });

    expect(screen.getByText("Resolve effect")).toBeTruthy();
    expect(
      screen.getByText(/Search your security stack, reveal 1 card from it, and add it to your hand/i),
    ).toBeTruthy();
    expect(screen.getByText(/If it's a yellow card, ＜Recovery \+1 \(Deck\)＞/i)).toBeTruthy();
    expect(screen.getByText(/Then, shuffle your security stack/i)).toBeTruthy();
    expect(screen.queryByText("Select cards")).toBeNull();
  });

  it("shows Patamon's complete errata search while hiding the generic selection prompt", () => {
    renderDecision({
      decisionId: "patamon-reveal-search",
      seat: 0,
      kind: "selectCards",
      promptText: "Select cards",
      sourceCardId: "EX3-028",
      options: {
        timing: "OnPlay",
        candidateInstanceIds: ["authority"],
        visibleInstanceIds: ["authority", "three-great-angels", "dragon", "filler"],
        min: 1,
        max: 1,
      },
    });

    expect(screen.getByText("Resolve effect")).toBeTruthy();
    expect(screen.getByText(/Reveal the top 4 cards of your deck/i)).toBeTruthy();
    expect(
      screen.getByText(/\[Angel\], \[Cherub\], \[Throne\], \[Authority\], \[Seraph\] or \[Virtue\]/i),
    ).toBeTruthy();
    expect(screen.getByText(/other than \[Three Great Angels\]/i)).toBeTruthy();
    expect(screen.getByText(/Place the rest at the bottom of your deck in any order/i)).toBeTruthy();
    expect(screen.queryByText("Select cards")).toBeNull();
  });

  it("shows Aegisdramon's errata play branches for its When Digivolving choice", () => {
    renderDecision({
      decisionId: "aegisdramon-play-source",
      seat: 0,
      kind: "optional",
      promptText: "playWithoutCost",
      sourceCardId: "EX3-026",
      options: { timing: "WhenDigivolving" },
    });

    expect(screen.getByText("Use this effect?")).toBeTruthy();
    expect(screen.getByText(/1 blue level 3 Digimon card or 1 Digimon card with \[Seadramon\]/i)).toBeTruthy();
    expect(screen.getByText(/\[Aqua\] or \[Sea Animal\] in one of its traits/i)).toBeTruthy();
    expect(screen.queryByText("playWithoutCost")).toBeNull();
  });

  it("shows Aegisdramon's opponent-turn reactivation instead of the ActivateEffect slug", () => {
    renderDecision({
      decisionId: "aegisdramon-reactivate",
      seat: 0,
      kind: "optional",
      promptText: "ActivateEffect",
      sourceCardId: "EX3-026",
      options: { timing: "OpponentsTurn" },
    });

    expect(screen.getByText("Use this effect?")).toBeTruthy();
    expect(
      screen.getByText(
        /When your opponent plays a Digimon, you may activate 1 of this Digimon's \[When Digivolving\] effects\.$/i,
      ),
    ).toBeTruthy();
    expect(screen.queryByText("ActivateEffect")).toBeNull();
  });

  it("shows Azulongmon's optional placement with the errata wording instead of an internal verb", () => {
    renderDecision({
      decisionId: "azulongmon-place-trial",
      seat: 0,
      kind: "optional",
      promptText: "placeInBattleAreaSelf",
      sourceCardId: "EX3-025",
      options: { timing: "OnDeletion" },
    });

    expect(screen.getByText("Use this effect?")).toBeTruthy();
    expect(
      screen.getByText(
        /If you don't have a \[Trial of the Four Great Dragons\] in play, you may place 1 \[Trial of the Four Great Dragons\] from your hand/i,
      ),
    ).toBeTruthy();
    expect(screen.queryByText("placeInBattleAreaSelf")).toBeNull();
  });

  it("shows Slayerdramon's opponent-main-phase action with the errata wording", () => {
    renderDecision({
      decisionId: "slayerdramon-forced-attack",
      seat: 0,
      kind: "optional",
      promptText: "attack",
      sourceCardId: "EX3-024",
      options: { timing: "OnStartMainPhase" },
    });

    expect(screen.getByText("Use this effect?")).toBeTruthy();
    expect(
      screen.getByText(
        /By suspending 1 of your Digimon with \[Dramon\] or \[Examon\] in its name, your opponent attacks with 1 of their Digimon/i,
      ),
    ).toBeTruthy();
    expect(screen.queryByText("attack")).toBeNull();
  });

  it("shows Plesiomon's optional digivolution action with its full errata text", () => {
    renderDecision({
      decisionId: "plesiomon-play",
      seat: 0,
      kind: "optional",
      promptText: "playWithoutCost",
      sourceCardId: "EX3-023",
      options: { timing: "WhenDigivolving" },
    });

    expect(screen.getByText("Use this effect?")).toBeTruthy();
    expect(
      screen.getByText(
        /play 1 blue level 3 Digimon card or 1 level 4 or lower Digimon card with \[Aqua\] or \[Sea Animal\]/i,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(/place 1 blue Digimon card from your hand under this Digimon as its bottom digivolution card/i),
    ).toBeTruthy();
    expect(screen.queryByText("playWithoutCost")).toBeNull();
  });

  it("shows MegaSeadramon's optional attack action with its printed text instead of an internal verb", () => {
    renderDecision({
      decisionId: "mega-seadramon-play",
      seat: 0,
      kind: "optional",
      promptText: "playWithoutCost",
      sourceCardId: "EX3-022",
      options: { timing: "WhenAttacking" },
    });

    expect(screen.getByText("Use this effect?")).toBeTruthy();
    expect(
      screen.getByText(/play 1 blue level 3 Digimon card from 1 of your blue Digimon's digivolution cards/i),
    ).toBeTruthy();
    expect(screen.queryByText("playWithoutCost")).toBeNull();
  });

  it("explains CrysPaledramon's source choice with the printed clause and a localized title", () => {
    renderDecision({
      decisionId: "crys-paledramon-sources",
      seat: 0,
      kind: "selectCards",
      promptText: "Select cards",
      sourceCardId: "EX3-021",
      options: {
        candidateInstanceIds: ["source-1", "source-2"],
        min: 2,
        max: 2,
        timing: "WhenDigivolving",
      },
    });

    expect(screen.getByText("Resolve effect")).toBeTruthy();
    expect(screen.getByText(/Trash any 2 digivolution cards under 1 of your opponent's Digimon/)).toBeTruthy();
    expect(screen.queryByText("Select cards")).toBeNull();
    expect(screen.queryByText(/TrashDigivolution|Restrict/)).toBeNull();
  });

  it("shows From Master to Disciple's printed text instead of declarative effect record action names", () => {
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "from-master-reveal",
            seat: 0,
            kind: "selectCards",
            promptText: "From Master to Disciple",
            sourceCardId: "ST12-15",
            options: {
              candidateInstanceIds: ["huckmon"],
              min: 0,
              max: 1,
              timing: "Main",
              effectText: "[Main] RevealAdd, PlaceInBattleAreaSelf",
            },
          }}
          sourceCardId="ST12-15"
          candidates={[{ instanceId: "huckmon", cardId: "ST12-01" }]}
          picks={[]}
          onTogglePick={vi.fn()}
          onRespond={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(/\[Main\] Reveal the top 3 cards of your deck/)).toBeTruthy();
    expect(screen.queryByText(/RevealAdd|PlaceInBattleAreaSelf/)).toBeNull();
  });

  it("replaces an internal action-kind prompt with the generic optional question", () => {
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "cool-boy-gain-memory",
            seat: 0,
            kind: "optional",
            promptText: "gainMemory",
            sourceCardId: "BT9-092",
            options: { timing: "Your Turn" },
          }}
          sourceCardId="BT9-092"
          candidates={[]}
          picks={[]}
          onTogglePick={vi.fn()}
          onRespond={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.queryByText("gainMemory")).toBeNull();
    expect(screen.getByText("Use this effect?")).toBeTruthy();
  });

  it("shows Chaosdramon's printed clause instead of the generated DeDigivolve label", () => {
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "chaosdramon-place",
            seat: 0,
            kind: "optional",
            promptText: "De-Digivolve",
            sourceCardId: "EX3-013",
            options: { timing: "OnPlay", effectText: "[OnPlay] DeDigivolve" },
          }}
          sourceCardId="EX3-013"
          candidates={[]}
          picks={[]}
          onTogglePick={vi.fn()}
          onRespond={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(/By placing up to 3 red and black level 5 cards/)).toBeTruthy();
    expect(screen.queryByText("[OnPlay] DeDigivolve")).toBeNull();
  });

  it("shows Crabmon's printed target-and-placement clause instead of SelectBind internals", () => {
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "crabmon-target",
            seat: 0,
            kind: "chooseTargets",
            promptText: "Select bind",
            sourceCardId: "EX3-015",
            options: {
              candidateInstanceIds: ["blue-digimon"],
              min: 1,
              max: 1,
              timing: "OnPlay",
              effectText: "[OnPlay] Select bind, Gain Jamming",
            },
          }}
          sourceCardId="EX3-015"
          candidates={[]}
          picks={[]}
          onTogglePick={vi.fn()}
          onRespond={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(/1 of your blue Digimon gains ＜Jamming＞ for the turn/)).toBeTruthy();
    expect(screen.queryByText(/Select bind/i)).toBeNull();
  });

  it("keeps a single-token card name as the prompt for a selection decision", () => {
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "select-1",
            seat: 0,
            kind: "chooseTargets",
            promptText: "MetalGreymon",
            options: { candidateInstanceIds: [], min: 0, max: 1 },
          }}
          candidates={[]}
          picks={[]}
          onTogglePick={vi.fn()}
          onRespond={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText("MetalGreymon")).toBeTruthy();
  });

  it("does not mix SaviorHuckmon's main effect into its inherited optional decision", () => {
    const inheritedEffect =
      "[When Attacking][Inherited][Once Per Turn] If this Digimon has [Royal Knight] in its traits, " +
      "you may play 1 Digimon card with [Sistermon] in its name from your hand or trash without paying its memory cost.";

    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "saviorhuckmon-inherited",
            seat: 0,
            kind: "optional",
            promptText: "Use this effect?",
            sourceCardId: "ST12-08",
            options: { effectText: inheritedEffect },
          }}
          sourceCardId="ST12-08"
          candidates={[]}
          picks={[]}
          onTogglePick={vi.fn()}
          onRespond={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText("Use this effect?")).toBeTruthy();
    expect(screen.getByText(inheritedEffect)).toBeTruthy();
    expect(screen.queryByText(/\[When Digivolving\].*unsuspended Digimon/)).toBeNull();
  });

  it("keeps SaviorHuckmon's inherited clause in the following Sistermon selection", () => {
    const inheritedEffect =
      "[When Attacking][Inherited][Once Per Turn] If this Digimon has [Royal Knight] in its traits, " +
      "you may play 1 Digimon card with [Sistermon] in its name from your hand or trash without paying its memory cost.";

    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "saviorhuckmon-select-sistermon",
            seat: 0,
            kind: "selectCards",
            promptText: "SaviorHuckmon",
            sourceCardId: "ST12-08",
            options: {
              candidateInstanceIds: ["sistermon"],
              min: 0,
              max: 1,
              timing: "OnAllyAttack",
              effectText: inheritedEffect,
            },
          }}
          sourceCardId="ST12-08"
          candidates={[{ instanceId: "sistermon", cardId: "ST12-12" }]}
          picks={[]}
          onTogglePick={vi.fn()}
          onRespond={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(inheritedEffect)).toBeTruthy();
    expect(screen.queryByText(/\[When Digivolving\].*unsuspended Digimon/)).toBeNull();
    expect(screen.getByRole("button", { name: /Sistermon Blanc/ })).toBeTruthy();
  });

  it("does not guess a main card effect for legacy optional decisions without provenance", () => {
    const inheritedPrompt = "Use [When Attacking][Inherited] Play 1 [Sistermon] from your hand or trash?";

    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "legacy-saviorhuckmon-inherited",
            seat: 0,
            kind: "optional",
            promptText: inheritedPrompt,
            sourceCardId: "ST12-08",
          }}
          sourceCardId="ST12-08"
          candidates={[]}
          picks={[]}
          onTogglePick={vi.fn()}
          onRespond={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(inheritedPrompt)).toBeTruthy();
    expect(screen.queryByText(/\[When Digivolving\].*unsuspended Digimon/)).toBeNull();
  });

  it("does not mix SaviorHuckmon's main effect into an inherited card selection without provenance", () => {
    const inheritedPrompt =
      "Use [When Attacking][Inherited][Once Per Turn] If this Digimon has [Royal Knight] in its traits, " +
      "you may play 1 Digimon card with [Sistermon] in its name from your hand or trash without paying its memory cost.?";

    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "legacy-saviorhuckmon-select-sistermon",
            seat: 0,
            kind: "selectCards",
            promptText: inheritedPrompt,
            sourceCardId: "ST12-08",
            options: {
              candidateInstanceIds: ["sistermon"],
              min: 0,
              max: 1,
            },
          }}
          sourceCardId="ST12-08"
          candidates={[{ instanceId: "sistermon", cardId: "ST12-12" }]}
          picks={[]}
          onTogglePick={vi.fn()}
          onRespond={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(inheritedPrompt)).toBeTruthy();
    expect(screen.queryByText(/\[When Digivolving\].*unsuspended Digimon/)).toBeNull();
  });

  it("renders a Blitz opportunity with the granted card as its visible source", () => {
    const onRespond = vi.fn();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "betel-blitz",
            seat: 0,
            kind: "optional",
            promptText: "Activate Blitz?",
            sourceCardId: "BT8-013",
            options: { promptKey: "activateBlitz", timing: "When Digivolving" },
          }}
          sourceCardId="BT8-013"
          candidates={[]}
          picks={[]}
          onTogglePick={vi.fn()}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );

    expect(screen.getByText("BetelGammamon · effect")).toBeTruthy();
    expect(screen.getByText("Do you want to activate Blitz?")).toBeTruthy();
    expect(screen.getByText(/\[When Digivolving\].*Blitz/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Yes, activate" }));
    expect(onRespond).toHaveBeenCalledWith({ kind: "optional", accept: true });
  });

  it("distinguishes identical Blockers by stack size and submits the chosen permanent", () => {
    const onBlock = vi.fn();
    render(
      <I18nProvider>
        <BlockOverlay
          attackerCardId="BT1-009"
          blockers={[
            { permanentId: "empty", cardId: "EX1-073", currentDP: 11000, sourceCount: 0 },
            { permanentId: "loaded", cardId: "EX1-073", currentDP: 15000, sourceCount: 5 },
          ]}
          onBlock={onBlock}
          onDecline={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: /Machinedramon, 11,000 DP, 0 source/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Machinedramon, 15,000 DP, 5 source/ }));
    expect(onBlock).toHaveBeenCalledWith("loaded");
  });

  it("shows Coredramon as a friendly Blocker action and submits its permanent id", () => {
    const onBlock = vi.fn<(permanentId: string) => void>();
    render(
      <I18nProvider>
        <BlockOverlay
          attackerCardId="BT1-028"
          blockers={[{ permanentId: "coredramon-permanent", cardId: "EX3-039", currentDP: 6000, sourceCount: 1 }]}
          onBlock={onBlock}
          onDecline={vi.fn<() => void>()}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: "Block window" })).toBeTruthy();
    expect(screen.getByText(/Choose a <Blocker> to redirect the attack, or take the hit/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Coredramon, 6,000 DP, 1 source/i }));
    expect(onBlock).toHaveBeenCalledWith("coredramon-permanent");
  });

  it("drops the refusal when ＜Collision＞ forces the block", () => {
    render(
      <I18nProvider>
        <BlockOverlay
          attackerCardId="BT1-028"
          blockers={[{ permanentId: "coredramon-permanent", cardId: "EX3-039", currentDP: 6000, sourceCount: 1 }]}
          mustBlock
          onBlock={vi.fn<(permanentId: string) => void>()}
          onDecline={vi.fn<() => void>()}
        />
      </I18nProvider>,
    );

    expect(screen.queryByRole("button", { name: "Take the attack, no block" })).toBeNull();
    expect(screen.getByText(/you must block while one can/i)).toBeTruthy();
    expect(screen.getByText("Mandatory")).toBeTruthy();
  });

  it("shows an eligible sourced ExTyrannomon with its DP and source count", () => {
    const onBlock = vi.fn<(permanentId: string) => void>();
    render(
      <I18nProvider>
        <BlockOverlay
          attackerCardId="BT1-028"
          blockers={[{ permanentId: "extyrannomon-permanent", cardId: "EX3-060", currentDP: 9000, sourceCount: 1 }]}
          onBlock={onBlock}
          onDecline={vi.fn<() => void>()}
        />
      </I18nProvider>,
    );

    const blocker = screen.getByRole("button", { name: /ExTyrannomon, 9,000 DP, 1 source/i });
    expect(blocker).toBeTruthy();
    fireEvent.click(blocker);
    expect(onBlock).toHaveBeenCalledWith("extyrannomon-permanent");
  });

  it("shows Alliance allies with current DP and stack identity", () => {
    const onChoose = vi.fn();
    render(
      <I18nProvider>
        <AllianceOverlay
          triggerCardId="BT1-010"
          allies={[
            { permanentId: "plain", cardId: "EX1-073", currentDP: 11000, sourceCount: 0 },
            { permanentId: "boosted", cardId: "EX1-073", currentDP: 15000, sourceCount: 5 },
          ]}
          onChoose={onChoose}
          onPass={vi.fn()}
        />
      </I18nProvider>,
    );

    const boosted = screen.getByRole("button", { name: /Machinedramon.*15,000 DP.*5 source/ });
    expect(screen.getByText(/11,000 DP · 0 source/)).toBeTruthy();
    fireEvent.click(boosted);
    expect(onChoose).toHaveBeenCalledWith("boosted");
  });

  it("renders and submits the abstract security target used by forced attacks", () => {
    const onRespond = vi.fn();
    function ForcedAttackHarness() {
      const [picks, setPicks] = useState<string[]>([]);
      return (
        <I18nProvider>
          <DecisionOverlay
            request={{
              decisionId: "forced-attack",
              seat: 0,
              kind: "chooseTargets",
              promptText: "Choose attack target",
              options: { min: 1, max: 1 },
            }}
            candidates={[
              { instanceId: "player", selectable: true },
              { instanceId: "defender", cardId: "BT1-009", selectable: true },
            ]}
            picks={picks}
            onTogglePick={(instanceId) => setPicks([instanceId])}
            onRespond={onRespond}
          />
        </I18nProvider>
      );
    }
    render(<ForcedAttackHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Opponent security" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));

    expect(onRespond).toHaveBeenCalledWith({ kind: "chooseTargets", instanceIds: ["player"] });
  });

  it("distinguishes both players in a tied security-stack decision", () => {
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "security-owner",
            seat: 0,
            kind: "chooseTargets",
            promptText: "Choose a player",
            options: { min: 0, max: 1 },
          }}
          candidates={[
            { instanceId: "mine", selectable: true },
            { instanceId: "opponent", selectable: true },
          ]}
          picks={[]}
          onTogglePick={vi.fn()}
          onRespond={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: "Your security" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Opponent security" })).toBeTruthy();
  });

  it("distinguishes identical permanent targets by their digivolution source count", () => {
    const onRespond = vi.fn();
    function DuplicateTargetHarness() {
      const [picks, setPicks] = useState<string[]>([]);
      return (
        <I18nProvider>
          <DecisionOverlay
            request={{
              decisionId: "duplicate-targets",
              seat: 0,
              kind: "chooseTargets",
              promptText: "Choose",
              options: { min: 1, max: 1 },
            }}
            candidates={[
              { instanceId: "machinedramon-empty", cardId: "EX1-073", sourceCount: 0 },
              { instanceId: "machinedramon-stack", cardId: "EX1-073", sourceCount: 5 },
            ]}
            picks={picks}
            onTogglePick={(instanceId) => setPicks([instanceId])}
            onRespond={onRespond}
          />
        </I18nProvider>
      );
    }
    render(<DuplicateTargetHarness />);

    expect(screen.getByRole("button", { name: /Machinedramon, 0 source/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Machinedramon, 5 source/ })).toBeTruthy();
    expect(screen.getByText("0 sources")).toBeTruthy();
    expect(screen.getByText("5 sources")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Machinedramon, 5 source/ }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));

    expect(onRespond).toHaveBeenCalledWith({
      kind: "chooseTargets",
      instanceIds: ["machinedramon-stack"],
    });
  });

  it("distinguishes equal-stack targets by live DP and suspension", () => {
    const onRespond = vi.fn();
    function LiveTargetHarness() {
      const [picks, setPicks] = useState<string[]>([]);
      return (
        <I18nProvider>
          <DecisionOverlay
            request={{
              decisionId: "live-targets",
              seat: 0,
              kind: "chooseTargets",
              promptText: "Choose",
              options: { min: 1, max: 1 },
            }}
            candidates={[
              { instanceId: "active", cardId: "EX1-073", sourceCount: 2, currentDP: 11_000, isSuspended: false },
              { instanceId: "suspended", cardId: "EX1-073", sourceCount: 2, currentDP: 14_000, isSuspended: true },
            ]}
            picks={picks}
            onTogglePick={(instanceId) => setPicks([instanceId])}
            onRespond={onRespond}
          />
        </I18nProvider>
      );
    }
    render(<LiveTargetHarness />);

    expect(screen.getByRole("button", { name: /Machinedramon, 11,000 DP, 2 source/ })).toBeTruthy();
    const boosted = screen.getByRole("button", { name: /Machinedramon, 14,000 DP, Suspended, 2 source/ });
    fireEvent.click(boosted);
    fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));

    expect(onRespond).toHaveBeenCalledWith({ kind: "chooseTargets", instanceIds: ["suspended"] });
  });

  it("hides the dialog and leaves a persistent return control", () => {
    const stage = document.createElement("div");
    stage.id = "aegis-stage";
    document.body.append(stage);
    const onRespond = vi.fn();
    render(
      <I18nProvider>
        <div data-testid="overlay-host">
          <DecisionOverlay
            request={optionalDecision}
            candidates={[]}
            picks={[]}
            onTogglePick={vi.fn()}
            onRespond={onRespond}
          />
        </div>
      </I18nProvider>,
      { container: stage },
    );

    fireEvent.click(screen.getByRole("button", { name: "View board" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Decision pending")).toBeTruthy();
    const returnButton = screen.getByRole("button", { name: "Return to decision" });
    expect(returnButton).toBe(document.activeElement);
    expect(returnButton.closest("#aegis-stage")).toBeNull();
    expect(returnButton.parentElement?.parentElement).toBe(document.body);
    expect(returnButton.parentElement?.style.position).toBe("fixed");
    expect(returnButton.parentElement?.style.right).toBe("16px");
    expect(returnButton.parentElement?.style.top).toContain("safe-area-inset-top");
    expect(returnButton.parentElement?.style.top).toContain("64px");
    expect(returnButton.parentElement?.style.bottom).toBe("auto");
  });

  it("returns to the same decision without submitting a response", () => {
    const { onRespond } = renderDecision();
    fireEvent.click(screen.getByRole("button", { name: "View board" }));
    fireEvent.click(screen.getByRole("button", { name: "Return to decision" }));

    expect(screen.getByRole("dialog")).toBe(document.activeElement);
    expect(screen.getByText("Activate the effect?")).toBeTruthy();
    expect(onRespond).not.toHaveBeenCalled();
  });

  it("keeps target picks while the decision dialog is hidden", () => {
    function SelectionHarness() {
      const [picks, setPicks] = useState<string[]>([]);
      return (
        <I18nProvider>
          <DecisionOverlay
            request={{
              decisionId: "decision-select",
              seat: 0,
              kind: "selectCards",
              promptText: "Choose",
              options: { min: 1, max: 1 },
            }}
            candidates={[{ instanceId: "agumon", cardId: "BT1-009" }]}
            picks={picks}
            onTogglePick={(instanceId) => setPicks([instanceId])}
            onRespond={vi.fn()}
          />
        </I18nProvider>
      );
    }
    render(<SelectionHarness />);

    fireEvent.click(screen.getByRole("button", { pressed: false }));
    fireEvent.click(screen.getByRole("button", { name: "View board" }));
    fireEvent.click(screen.getByRole("button", { name: "Return to decision" }));

    expect(screen.getByRole("button", { pressed: true })).toBeTruthy();
  });

  it("contains keyboard focus inside the required decision", () => {
    renderDecision();
    const dialog = screen.getByRole("dialog");
    const buttons = screen.getAllByRole("button");
    const first = buttons[0]!;
    const last = buttons.at(-1)!;

    dialog.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(last).toBe(document.activeElement);

    last.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(first).toBe(document.activeElement);

    first.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(last).toBe(document.activeElement);
  });

  it("preserves an edited card order while the board is visible", () => {
    const onRespond = vi.fn();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{ decisionId: "decision-order", seat: 0, kind: "orderCards", promptText: "Order cards" }}
          candidates={[
            { instanceId: "first", cardId: "BT1-009" },
            { instanceId: "second", cardId: "ST1-02" },
          ]}
          picks={[]}
          onTogglePick={vi.fn()}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Move card down/ })[0]!);
    fireEvent.click(screen.getByRole("button", { name: "View board" }));
    fireEvent.click(screen.getByRole("button", { name: "Return to decision" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm order" }));

    expect(onRespond).toHaveBeenCalledWith({ kind: "orderCards", order: ["second", "first"] });
  });

  it("shows canonical deck-edge choices as readable labels", () => {
    const { onRespond } = renderDecision({
      decisionId: "decision-deck-edge",
      seat: 0,
      kind: "chooseOption",
      promptText: "Choose the deck edge",
      options: { choices: ["top", "bottom"] },
    });

    fireEvent.click(screen.getByRole("button", { name: "Bottom of the deck" }));

    expect(screen.getByRole("button", { name: "Top of the deck" })).toBeTruthy();
    expect(onRespond).toHaveBeenCalledWith({ kind: "chooseOption", optionIndex: 1 });
    expect(screen.queryByRole("button", { name: "bottom" })).toBeNull();
  });

  it("explains that position 1 is the bottom card when ordering digivolution sources", () => {
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "decision-stack-order",
            seat: 0,
            kind: "orderCards",
            promptText: "Order digivolution cards",
            options: { orderDestination: "stackBottom" },
          }}
          candidates={[
            { instanceId: "first", cardId: "BT7-058" },
            { instanceId: "second", cardId: "BT7-059" },
          ]}
          picks={[]}
          onTogglePick={vi.fn()}
          onRespond={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(/Number 1 will be the bottom card of the stack/)).toBeTruthy();
  });

  it("opens a replacement decision instead of carrying over board view", () => {
    const { rerender } = renderDecision();
    fireEvent.click(screen.getByRole("button", { name: "View board" }));

    rerender(
      <I18nProvider>
        <DecisionOverlay
          request={{ ...optionalDecision, decisionId: "decision-2", promptText: "Second decision" }}
          candidates={[]}
          picks={[]}
          onTogglePick={vi.fn()}
          onRespond={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Second decision")).toBeTruthy();
  });
});

describe("card links in prompts", () => {
  it("opens the attacker a block window names", () => {
    const opened: string[] = [];
    render(
      <I18nProvider>
        <CardOpenerProvider onOpenCard={(cardId) => opened.push(cardId)}>
          <BlockOverlay
            attackerCardId="BT1-009"
            blockers={[{ permanentId: "empty", cardId: "EX1-073", currentDP: 11000, sourceCount: 0 }]}
            onBlock={vi.fn<(permanentId: string) => void>()}
            onDecline={vi.fn<() => void>()}
          />
        </CardOpenerProvider>
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /^Open / }));
    expect(opened).toEqual(["BT1-009"]);
  });

  it("opens the source card a decision names, and still names the dialog after it", () => {
    const opened: string[] = [];
    render(
      <I18nProvider>
        <CardOpenerProvider onOpenCard={(cardId) => opened.push(cardId)}>
          <DecisionOverlay
            request={{
              decisionId: "link-1",
              seat: 0,
              kind: "optional",
              promptText: "Activate the effect?",
            }}
            sourceCardId="BT1-010"
            candidates={[]}
            picks={[]}
            onTogglePick={vi.fn<(instanceId: string) => void>()}
            onRespond={vi.fn<(response: DecisionResponse) => void>()}
          />
        </CardOpenerProvider>
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: "Agumon · effect" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open Agumon" }));
    expect(opened).toEqual(["BT1-010"]);
  });

  it("leaves a name that only exists in server prose unlinked", () => {
    // The client holds no id for a card the engine merely wrote about, and a link
    // to the wrong card is worse than none.
    render(
      <I18nProvider>
        <CardOpenerProvider onOpenCard={vi.fn<(cardId: string) => void>()}>
          <DecisionOverlay
            request={{
              decisionId: "link-2",
              seat: 0,
              kind: "optional",
              promptText: "Trash Greymon to draw 1 card?",
            }}
            candidates={[]}
            picks={[]}
            onTogglePick={vi.fn<(instanceId: string) => void>()}
            onRespond={vi.fn<(response: DecisionResponse) => void>()}
          />
        </CardOpenerProvider>
      </I18nProvider>,
    );

    expect(screen.getByText("Trash Greymon to draw 1 card?")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Open / })).toBeNull();
  });
});
