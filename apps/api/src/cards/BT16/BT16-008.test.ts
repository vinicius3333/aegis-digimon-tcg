import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-008.js";
import "../index.js";

describe("BT16-008", () => {
  it("has Jamming and deletes a 3000 DP or lower opposing Digimon on play or digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Jamming" }] });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Delete", target: { filter: { dp: { op: "lte", value: 3000 } } } }],
    });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Delete" }] });
  });
  it("once per turn suspends an opposing Digimon when attacking", () =>
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Suspend" }],
    }));

  it("plays and deletes exactly one opposing Digimon at the 3000 DP boundary", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-008", as: "aquilamon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "atLimit", dp: 3000 },
            { card: "BT1-009", as: "aboveLimit", dp: 4000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    // Capture both ids first: the deleted permanent is off the board afterwards, so
    // `perm("atLimit")` can no longer resolve it.
    const aboveLimitId = s.perm("aboveLimit").permanentId;
    const atLimitInstanceId = s.perm("atLimit").topCard.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aquilamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === aboveLimitId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === atLimitInstanceId)).toBe(true);
  });

  it("suspends an opposing Digimon from the inherited attack effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-009", as: "host", under: ["BT16-008"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.perm("target").isSuspended).toBe(true);
  });
});
