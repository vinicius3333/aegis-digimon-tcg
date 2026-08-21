import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-096.js";

describe("BT10-096 Burning Star Crusher", () => {
  it("deletes only an opponent Digimon whose DP does not exceed the chosen level 4+ Shoutmon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-013", as: "shoutmon", dp: 10_000 }],
          hand: [{ card: "BT10-096", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT10-043", as: "eligible", dp: 10_000 },
            { card: "BT10-044", as: "tooLarge", dp: 11_000 },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    const eligibleId = s.perm("eligible").permanentId;
    const tooLargeId = s.perm("tooLarge").permanentId;
    preferred.push(s.perm("shoutmon").permanentId, eligibleId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === eligibleId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === tooLargeId)).toBe(true);
  });

  it("does not delete when you have no level 4 or higher Shoutmon to choose", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT10-007"], hand: [{ card: "BT10-096", as: "option" }] },
        1: { battleArea: [{ card: "BT10-043", as: "target", dp: 1000 }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    ).toBe(true);
  });

  it("Security adds the Xros Heart Digimon and plays Taiki together", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT10-096", as: "option", faceUp: true }],
          deck: [
            { card: "BT10-034", as: "added" },
            { card: "BT10-087", as: "taiki" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("rest").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("added").instanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("taiki").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("rest").instanceId)).toBe(true);
  });

  it("Security still adds the Digimon when no Taiki was revealed", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT10-096", as: "option", faceUp: true }],
          deck: [{ card: "BT10-034", as: "added" }, "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("added").instanceId)).toBe(true);
  });

  it("may decline the entire Security effect without revealing or moving cards", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT10-096", as: "option", faceUp: true }],
          deck: [
            { card: "BT10-034", as: "xrosHeart" },
            { card: "BT10-087", as: "taiki" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    const originalOrder = s.state.players[0]!.deck.map((card) => card.instanceId);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(originalOrder);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
