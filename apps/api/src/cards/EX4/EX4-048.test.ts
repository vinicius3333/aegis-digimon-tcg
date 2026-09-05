import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-048.js";

describe("EX4-048 Gaiomon", () => {
  it("is also treated as Greymon and deletes an opposing Digimon costing at least thirteen", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "name",
      tokens: ["Greymon"],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { playCostGte: 13 } },
    });
  });
  it("trashes security when no Digimon was deleted and can free-digivolve with a Tamer", () => {
    const effects = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions;
    expect(effects?.[1]).toMatchObject({
      kind: "SecurityManipulation",
      op: "trashTop",
      condition: { kind: "ifThisEffectDidNotDelete" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      payCost: false,
      ignoreRequirements: true,
      condition: { kind: "youHave" },
      into: { playCostGte: 13 },
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-048");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("treats Gaiomon as Greymon by rule and deletes an opposing high-cost Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-021", as: "base" }], hand: [{ card: "EX4-048", as: "gaiomon" }] },
      1: { battleArea: [{ card: "AD1-025", as: "high" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gaiomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(observe(s.engine).effectiveNames(s.perm("base"))).toContain("greymon");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("AD1-025");
  });

  it("trashes the opponent's top security card when no opposing Digimon costs thirteen", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-021", as: "base" }], hand: [{ card: "EX4-048", as: "gaiomon" }] },
      1: { battleArea: [{ card: "BT1-020", as: "low" }], security: ["BT1-001", "BT1-002"] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gaiomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-001");
  });

  it("free-digivolves a high-cost Gaiomon-name card at end of turn only with a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-048", as: "source" },
            { card: "BT1-089", as: "tamer" },
          ],
          hand: [{ card: "BT9-068", as: "nextGaiomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.EndOfYourTurn, s.perm("source"));
    await settle(() => s.perm("source").topCard?.cardId === "BT9-068");
    expect(s.perm("source").topCard?.cardId).toBe("BT9-068");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("nextGaiomon").instanceId)).toBe(false);

    const withoutTamer = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-048", as: "source" }], hand: [{ card: "BT9-068", as: "nextGaiomon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await withoutTamer.ready();
    await advance(withoutTamer.engine).fireForPermanent(EffectTiming.EndOfYourTurn, withoutTamer.perm("source"));
    await settle();
    expect(withoutTamer.perm("source").topCard?.cardId).toBe("EX4-048");
    expect(
      withoutTamer.state.players[0]!.hand.some(
        (card) => card.instanceId === withoutTamer.inst("nextGaiomon").instanceId,
      ),
    ).toBe(true);
  });
  ex4CardBehaviorTests("EX4-048");
});
