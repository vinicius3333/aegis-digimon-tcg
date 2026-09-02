import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT25_038 } from "./BT25-038.js";
import "../index.js";

describe("BT25-038 Shakkoumon", () => {
  it("keeps both printed alternate digivolution routes at cost 2", () => {
    expect(BT25_038.digivolutionRequirement).toEqual([
      { names: ["Patamon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["TS"], cost: 2, isAlternate: true },
    ]);
  });

  it("places an eligible Digimon as security and conditionally trashes both security tops", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_038.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "addTopOrBottom",
        controller: "mine",
        amount: 1,
        optional: true,
        source: {
          filter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            trait: ["Angel", "Archangel", "Three Great Angels", "Iliad"],
            zone: ["hand", "digivolutionCards"],
          },
        },
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "SecurityManipulation",
        op: "trashTop",
        controller: "mine",
        bothPlayers: true,
        amount: 1,
        // Structured gate — a "raw" kind evaluates as unmet, so the trash would never happen.
        condition: { kind: "isDnaDigivolving", raw: "DNA digivolving" },
      });
    }
  });

  it("watches only the controller's security additions/removals", () => {
    const effects = BT25_038.effects?.filter((entry) => entry.trigger === "AllTurns");
    expect(effects).toHaveLength(2);
    for (const effect of effects ?? []) {
      const watcher = effect.actions?.[0] as { event?: string; sourceFilter?: unknown; fireCondition?: unknown };
      if (watcher.event === "whenAddSecurity") {
        expect(watcher.fireCondition).toEqual({ kind: "triggerSecurityIsYours" });
        expect(watcher.sourceFilter).toBeUndefined();
      } else {
        expect(watcher.sourceFilter).toEqual({ controller: "mine" });
      }
      expect(effect.frequency).toBe("OncePerTurn");
    }
  });

  it("places a qualifying Digimon from this Digimon's stack at the chosen security edge", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-038", as: "shakkou", under: [{ card: "BT25-037", as: "stackAngel" }] }],
          security: [{ card: "BT1-009", as: "existing" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("shakkou"));

    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009", "BT25-037"]);
    expect(s.perm("shakkou").stack).toHaveLength(0);
  });

  it("does not select an opponent's card or a non-Digimon card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-038", as: "shakkou" }],
          hand: [{ card: "BT24-102", as: "tamer" }],
          security: [{ card: "BT1-009", as: "existing" }],
        },
        1: { hand: [{ card: "BT25-037", as: "opponentAngel" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("shakkou"));

    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT24-102");
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toContain("BT25-037");
  });

  it("trashes both players' top security cards only on a DNA digivolution", async () => {
    const dna = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-038", as: "shakkou" }], security: ["BT1-009"] },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await advance(dna.engine).fireForPermanent(EffectTiming.OnPlay, dna.perm("shakkou"), { isDnaDigivolve: true });
    expect(dna.state.players[0]!.security).toHaveLength(0);
    expect(dna.state.players[1]!.security).toHaveLength(0);

    const ordinary = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-038", as: "shakkou" }], security: ["BT1-009"] },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await advance(ordinary.engine).fireForPermanent(EffectTiming.OnPlay, ordinary.perm("shakkou"));
    expect(ordinary.state.players[0]!.security).toHaveLength(1);
    expect(ordinary.state.players[1]!.security).toHaveLength(1);
  });

  it("de-digivolves once when your security stack is added to", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-038", as: "shakkou" }], security: ["BT1-009"] },
        1: { battleArea: [{ card: "BT1-015", as: "target", under: ["BT1-001", "BT1-002"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAddSecurity", { addedToSecuritySeat: 0 });
    expect(s.perm("target").stack).toHaveLength(1);
    await advance(s.engine).fireSubTrigger("whenAddSecurity", { addedToSecuritySeat: 0 });
    expect(s.perm("target").stack).toHaveLength(1);

    await advance(s.engine).fireSubTrigger("whenAddSecurity", { addedToSecuritySeat: 1 });
    expect(s.perm("target").stack).toHaveLength(1);
  });

  it("naturally emits the security-addition event from its digivolving placement clause", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-037", as: "base" }],
          hand: [{ card: "BT25-038", as: "shakkou" }],
          security: [{ card: "BT1-009", as: "existing" }],
        },
        1: { battleArea: [{ card: "BT1-015", as: "target", under: ["BT1-001", "BT1-002"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    const targetPermanent = s.state.players[1]!.battleArea[0]!;
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shakkou").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT25-038" && targetPermanent.stack.length === 1);

    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009", "BT25-037"]);
    expect(targetPermanent.stack).toHaveLength(1);
  });

  it("inherits a once-per-turn -4000 DP reaction to your security removal", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-039", as: "host", under: ["BT25-038"] }], security: ["BT1-009"] },
        1: { battleArea: [{ card: "BT25-039", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const baseDp = s.perm("target").currentDP;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.perm("target").currentDP).toBe(baseDp);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.perm("target").currentDP).toBe(baseDp - 4000);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.perm("target").currentDP).toBe(baseDp - 4000);
  });
});
