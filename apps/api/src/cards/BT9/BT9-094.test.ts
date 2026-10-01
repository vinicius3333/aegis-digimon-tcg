import { getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { setupEngine, settle, type PermanentSpec } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-094.js";
import "./BT9-094.js";
import "./BT9-011.js";

async function playAtomicMegaloBlaster(ownDigimon: PermanentSpec) {
  const s = setupEngine(
    {
      0: { battleArea: [ownDigimon], hand: [{ card: "BT9-094", as: "option" }] },
      1: {
        battleArea: [
          { card: "BT9-032", dp: 6000 },
          { card: "BT9-033", dp: 5000 },
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 8;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
    ok: true,
  });
  await settle(
    () =>
      s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId) &&
      s.state.pendingDecision === undefined,
  );
  return s.state.players[1]!.battleArea.length;
}

describe("BT9-094 Atomic Megalo Blaster", () => {
  it("matches catalog values and the capped deletion security IR", () => {
    expect(getCardDefinition("BT9-094")).toMatchObject({
      colors: ["Red"],
      kinds: ["Option"],
      playCost: 6,
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Main",
          actions: [
            {
              kind: "Delete",
              target: { count: "all", totalDpCap: 10000, filter: { controller: "opponent", kind: ["Digimon"] } },
            },
          ],
        },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
      ],
    });
  });

  it("deletes opposing Digimon within a DP budget", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT9-007"], hand: [{ card: "BT9-094", as: "option" }] },
        1: { battleArea: ["BT9-032", "BT9-033"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length < 2);
    expect(s.state.players[1]!.battleArea.length).toBeLessThan(2);
  });
});

describe("BT9-094 Atomic Megalo Blaster — KB Q&A rulings", () => {
  it("deletes opposing Digimon totaling 11000 DP when a +1000 DP-deletion maximum effect applies (Q1897)", async () => {
    const withGrowlmonXInherited = await playAtomicMegaloBlaster({ card: "BT1-015", under: ["BT9-011"] });
    expect(withGrowlmonXInherited).toBe(0);

    const withoutBonus = await playAtomicMegaloBlaster({ card: "BT1-015" });
    expect(withoutBonus).toBe(1);
  });
});
