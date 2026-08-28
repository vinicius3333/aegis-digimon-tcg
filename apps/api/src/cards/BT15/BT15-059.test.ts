import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT15-059.js";
import "../index.js";

describe("BT15-059", () => {
  it("matches the catalog identity and black level-4 evolution route", () => {
    expect(getCardDefinition("BT15-059")).toMatchObject({
      nameEn: "Airdramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 4000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      types: ["Mythical Beast", "SoC"],
    });
  });

  it("may place Marvin Jackson under itself to de-digivolve an opposing Digimon to level 3", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "DeDigivolve", amount: 1, stopAtLevel: 3, cost: { kind: "place" }, optional: true }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "DeDigivolve", amount: 1, stopAtLevel: 3 }],
    });
  });
  it("retains inherited Reboot", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "Reboot" }],
    }));

  it("naturally places Marvin Jackson and stops De-Digivolve at the level-3 target", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT15-059", as: "airdramon" },
            { card: "BT15-086", as: "marvin" },
          ],
        },
        1: {
          battleArea: [{ card: "BT15-058", as: "target", under: ["BT1-009"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("airdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").topCard?.cardId === "BT1-009");

    expect(s.perm("target").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.perm("airdramon").stack.map(({ cardId }) => cardId)).toContain("BT15-086");
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT15-058");
  });

  it("naturally applies inherited Reboot during the opponent's active phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-058", as: "host", under: ["BT15-059"], suspended: true }], deck: ["BT1-009"] },
      1: { deck: ["BT1-009"] },
    });

    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });
});
