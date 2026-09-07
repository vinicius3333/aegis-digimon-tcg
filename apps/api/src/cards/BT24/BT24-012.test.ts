import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-012.js";
import "../index.js";

describe("BT24-012 Dimetromon", () => {
  it("only protects other Reptile/Dragonkin Digimon from opponent effects", () => {
    const replacement = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions?.[0] as any;
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "byOpponentEffect",
      affectsAll: true,
      target: { filter: { controller: "mine", excludeSelf: true }, upTo: true },
    });
    expect(replacement.actions[0]).toMatchObject({ kind: "Prevent", cost: { kind: "return" } });
  });

  it("retains Blocker and inherited once-per-turn memory gain", () => {
    expect(compiled.effects[0]?.keywords?.[0]?.keyword).toBe("Blocker");
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    expect(inherited.frequency).toBe("OncePerTurn");
    expect(inherited.actions[0].sourceFilter).toEqual({ controller: "opponent" });
    expect(inherited.actions[0].actions[0]).toMatchObject({ kind: "GainMemory", amount: 1 });
  });

  it("returns itself once to protect all simultaneously leaving Reptile and Dragonkin Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-012", as: "dimetromon" },
            { card: "BT24-014", as: "dragonkin1" },
            { card: "BT24-014", as: "dragonkin2" },
            { card: "BT1-009", as: "unprotected" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    const removed = await advance(s.engine).verb.deletePermanent(
      [s.perm("dragonkin1").permanentId, s.perm("dragonkin2").permanentId, s.perm("unprotected").permanentId],
      "byEffect",
    );

    expect(removed).toBe(1);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([
      "BT24-014",
      "BT24-014",
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT24-012");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("does not protect another Digimon when its controller declines the return cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-012", as: "dimetromon" },
            { card: "BT24-014", as: "dragonkin" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("dragonkin").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT24-012"]);
  });

  it("exposes Blocker and gains memory only when opposing security is removed, once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT24-012"] }] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.memory).toBe(0);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.memory).toBe(1);
  });

  it("exposes its own Blocker keyword", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT24-012", as: "dimetromon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("dimetromon"), "Blocker")).toBe(true);
  });

  it("protects a Reptile from an opponent's public deletion effect", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-012", as: "source" },
            { card: "BT24-008", as: "protected" },
          ],
        },
        1: {
          hand: [
            { card: "BT24-013", as: "fugamon" },
            { card: "BT1-009", as: "cost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").permanentId);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("fugamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT24-012"));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("protected").permanentId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT24-012");
  });

  it("gains memory from a public attack removing opponent security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST1-09", as: "host", under: ["BT24-012"] }] },
      1: { security: [{ card: "BT1-013", as: "checked" }] },
    });
    const checkedId = s.inst("checked").instanceId;
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === checkedId));
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(checkedId);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT24-012"]);
    expect(s.state.memory).toBe(1);
  });
});
