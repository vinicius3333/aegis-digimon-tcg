// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { DecisionRequest } from "@aegis/shared";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../src/i18n";
import { DecisionOverlay } from "../src/game/overlays";

const request: DecisionRequest = {
  decisionId: "armor-purge",
  seat: 0,
  kind: "selectCards",
  promptText: "＜Armor Purge＞: trash this Digimon's top card to prevent its deletion?",
  sourceCardId: "BT8-012",
  options: { min: 0, max: 1, candidates: ["armor-top"] },
};

afterEach(() => cleanup());

function renderArmorPurge() {
  const onRespond = vi.fn();
  function Harness() {
    const [picks, setPicks] = useState<string[]>([]);
    return (
      <I18nProvider>
        <DecisionOverlay
          request={request}
          sourceCardId="BT8-012"
          candidates={[{ instanceId: "armor-top", cardId: "BT8-012" }]}
          picks={picks}
          onTogglePick={(instanceId) => setPicks((current) => current.includes(instanceId) ? [] : [instanceId])}
          onRespond={onRespond}
        />
      </I18nProvider>
    );
  }
  render(<Harness />);
  return onRespond;
}

describe("Armor Purge decision UI", () => {
  it("declines without requiring the player to select the armor card", () => {
    const onRespond = renderArmorPurge();

    expect(screen.getByText(/trash this Digimon's top card/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "None" }));

    expect(onRespond).toHaveBeenCalledWith({ kind: "selectCards", instanceIds: [] });
  });

  it("shows the actual top card and submits it when Armor Purge is accepted", () => {
    const onRespond = renderArmorPurge();

    fireEvent.click(screen.getByRole("button", { name: /^Flamedramon$/i }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));

    expect(onRespond).toHaveBeenCalledWith({ kind: "selectCards", instanceIds: ["armor-top"] });
  });
});
