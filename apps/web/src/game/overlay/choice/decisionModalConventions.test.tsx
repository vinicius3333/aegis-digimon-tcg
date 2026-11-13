// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getCardDefinition } from "@aegis/shared";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n";
import { DecisionAttackTarget } from "@/game/overlay/choice/DecisionAttackTarget";
import { DecisionCandidateGrid } from "@/game/overlay/choice/DecisionCandidateGrid";
import { DecisionChoiceCards } from "@/game/overlay/choice/DecisionChoiceCards";
import type { DecisionCandidate } from "@/game/overlay/choice/decisionTypes";

const sourceRoot = join(process.cwd(), "src");
const hidingDeclaration = /clip-path:\s*inset\(50%\)|display:\s*none|visibility:\s*hidden|font-size:\s*0[;\s]/;
const candidates: DecisionCandidate[] = [
  { instanceId: "battle", cardId: "BT24-009", zone: "battle" },
  { instanceId: "breeding", cardId: "BT1-009", zone: "breeding" },
];

afterEach(cleanup);

function stylesheetRules() {
  return readdirSync(sourceRoot, { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".css"))
    .flatMap((path) =>
      [...readFileSync(join(sourceRoot, path), "utf8").matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
        path,
        selector: selector!.trim(),
        body: body!,
      })),
    );
}

function renderGrid() {
  render(
    <I18nProvider>
      <DecisionCandidateGrid
        candidates={candidates}
        picks={[]}
        min={1}
        max={1}
        selectedPlayCost={0}
        withinPlayCostBudget
        selectedDP={0}
        onTogglePick={vi.fn<(instanceId: string) => void>()}
      />
    </I18nProvider>,
  );
}

describe("decision modal conventions", () => {
  it("never hides the View board label in any layout", () => {
    const offenders = stylesheetRules().filter(
      (rule) => rule.selector.includes("view-board") && hidingDeclaration.test(rule.body),
    );
    expect(offenders.map((rule) => `${rule.path}: ${rule.selector}`)).toEqual([]);
  });

  it("labels View board with text in the attack target prompt", () => {
    render(
      <I18nProvider>
        <DecisionAttackTarget
          candidates={candidates}
          picks={[]}
          min={1}
          max={1}
          canConfirm={false}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onConfirm={vi.fn<() => void>()}
          onPass={vi.fn<() => void>()}
          onOpenBoard={vi.fn<() => void>()}
        />
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: "View board" }).textContent?.trim()).toBe("View board");
  });

  it("shows the name and card number under every selectable card", () => {
    renderGrid();
    for (const { cardId } of candidates) {
      expect(screen.getByText(getCardDefinition(cardId!)!.nameEn)).toBeTruthy();
      expect(screen.getByText(cardId!).className).toBe("decision-overlay__candidate-id");
    }
  });

  it("keeps selectable cards at the shared compact width", () => {
    renderGrid();
    const tile = document.querySelector<HTMLElement>('[data-instance-id="battle"]')!;
    expect(tile.style.width).toBe("112px");
  });

  it("shows the card number under revealed cards", () => {
    render(
      <I18nProvider>
        <DecisionChoiceCards candidates={candidates} wideDialog largeCards />
      </I18nProvider>,
    );
    const strip = document.querySelector<HTMLElement>(".decision-overlay__choice-cards")!;
    for (const { cardId } of candidates) expect(within(strip).getByText(cardId!)).toBeTruthy();
  });
});
