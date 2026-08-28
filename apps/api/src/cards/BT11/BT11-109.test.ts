import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-109.js";

describe("BT11-109 Astral Snatcher", () => {
  it("maps catalog facts and each printed effect to IR", () => {
    expect(getCardDefinition("BT11-109")).toMatchObject({ cardId: "BT11-109", colors: ["Purple"], kinds: ["Option"], playCost: 7 });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          { kind: "PlaceUnder" },
          { kind: "SelectBind" },
          {
            kind: "PlaceUnder",
            targetIsPermanent: true,
            position: "bottom",
            shedOwnCards: true,
            target: { fromSelectionRef: "movedDigimon" },
          },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
    ]);
  });

  it("places Bagra Army trash cards under an own host, then relocates an opposing Digimon under another", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-082", as: "host", under: [{ card: "BT11-077", as: "host-source" }] }],
          trash: [{ card: "BT11-077", as: "material" }],
          hand: [{ card: "BT11-109", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "moved", under: [{ card: "BT1-015", as: "moved-source" }] },
            { card: "BT1-015", as: "destination", under: [{ card: "BT1-010", as: "destination-source" }] },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("host").stack.some(({ instanceId }) => instanceId === s.inst("material").instanceId) &&
        s.state.players[1]!.battleArea.length === 1,
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("material").instanceId,
      s.inst("host-source").instanceId,
    ]);
    expect(s.perm("destination").stack.some(({ instanceId }) => instanceId === s.inst("moved").instanceId)).toBe(true);
    expect(s.perm("destination").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("moved").instanceId,
      s.inst("destination-source").instanceId,
    ]);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("moved-source").instanceId)).toBe(true);
  });
});
