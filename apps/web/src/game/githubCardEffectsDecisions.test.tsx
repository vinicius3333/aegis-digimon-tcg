// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { type DecisionRequest, type DecisionResponse } from "@aegis/shared";
import { I18nProvider } from "../i18n";
import { decisionVisibleCards } from "./decisionModel";
import { DecisionOverlay } from "./overlay/choice/DecisionOverlay";

// Production dec-51, 2026-10-07 23:46:56 UTC: 26 visible cards, 18 legal.
const productionCards = [
  ["s1-38", "BT19-055", true],
  ["hidden-s1-c120ea0731dedfaf5a83f13e", "EX13-052", true],
  ["s1-14", "EX13-052", true],
  ["s1-29", "AD1-018", false],
  ["s1-35", "P-154", true],
  ["s1-15", "EX13-052", true],
  ["s1-3", "EX10-031", true],
  ["s1-6", "EX10-031", true],
  ["s1-49", "LM-054", false],
  ["s1-19", "EX13-058", true],
  ["s1-32", "EX13-064", false],
  ["s1-9", "P-107", false],
  ["s1-37", "BT19-055", true],
  ["s1-24", "EX13-048", true],
  ["s1-5", "EX10-031", true],
  ["s1-36", "P-154", true],
  ["s1-30", "AD1-018", false],
  ["s1-1", "P-039", false],
  ["s1-18", "EX13-058", true],
  ["s1-11", "P-107", false],
  ["s1-47", "EX10-026", true],
  ["s1-28", "BT18-058", true],
  ["s1-53", "BT16-005", false],
  ["s1-26", "BT18-058", true],
  ["s1-13", "EX13-052", true],
  ["s1-20", "EX13-058", true],
] as const;

afterEach(cleanup);

it.each([false, true])(
  "GitHub #5286: the full 26-card LordKnightmon gallery keeps all three EX13 Knightmon copies selectable (mixed zones: %s)",
  (mixedZones) => {
    const request: DecisionRequest = {
      decisionId: "lord-production-26",
      seat: 0,
      kind: "selectCards",
      promptText: "LordKnightmon",
      sourceCardId: "EX13-064",
      options: {
        min: 0,
        max: 1,
        timing: "WhenDigivolving",
        effectText:
          "[When Digivolving] You may play or use 1 play or use cost 8 or lower [Knightmon] text card from your hand or trash without paying the cost.",
        candidateInstanceIds: productionCards.filter(([, , legal]) => legal).map(([instanceId]) => instanceId),
        visibleInstanceIds: productionCards.map(([instanceId]) => instanceId),
        visibleCards: productionCards.map(([instanceId, cardId]) => ({ instanceId, cardId })),
      },
    };
    const onRespond = vi.fn<(response: DecisionResponse) => void>();
    const candidates = decisionVisibleCards(request.options, new Map()).map((candidate, index) => ({
      ...candidate,
      zone: mixedZones ? (index < 13 ? ("hand" as const) : ("trash" as const)) : undefined,
      selectable: request.options!.candidateInstanceIds!.includes(candidate.instanceId),
    }));
    function Gallery() {
      const [picks, setPicks] = useState<string[]>([]);
      return (
        <I18nProvider>
          <DecisionOverlay
            request={request}
            sourceCardId="EX13-064"
            candidates={candidates}
            picks={picks}
            onTogglePick={(id) => setPicks([id])}
            onRespond={onRespond}
          />
        </I18nProvider>
      );
    }
    const { container } = render(<Gallery />);
    expect(container.querySelectorAll("[data-instance-id]")).toHaveLength(26);
    const knights = screen
      .getAllByRole("button", { name: /^Knightmon(?:,|$)/ })
      .filter((button) => button.hasAttribute("data-instance-id"));
    expect(knights).toHaveLength(3);
    for (const knight of knights) {
      expect((knight as HTMLButtonElement).disabled).toBe(false);
      fireEvent.click(knight);
      expect(knight.getAttribute("aria-pressed")).toBe("true");
    }
    fireEvent.click(screen.getByRole("button", { name: /Confirm targets/i }));
    expect(onRespond).toHaveBeenCalledWith({ kind: "selectCards", instanceIds: ["s1-20"] });
  },
);
