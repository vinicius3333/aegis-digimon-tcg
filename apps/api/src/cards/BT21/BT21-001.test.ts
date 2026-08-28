import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-001.js";
import "../index.js";

describe("BT21-001 Gigimon", () => {
  it("registers an optional, paid hand digivolution only for opponent security removal", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenSecurityRemoved",
            sourceFilter: { controller: "opponent" },
            fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "opponent" },
            actions: [
              expect.objectContaining({
                kind: "Digivolve",
                from: ["hand"],
                payCost: true,
                reduceCost: 1,
                optional: true,
              }),
            ],
          }),
        ],
      }),
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("digivolves a realistic Dragonkin stack from hand and pays the cost reduced by one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-015", as: "host", under: ["BT21-001"] }],
          hand: [
            { card: "BT21-024", as: "cyberdramon" },
            { card: "BT1-001", as: "nonMatch" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });

    expect(s.perm("host").topCard.instanceId).toBe(s.inst("cyberdramon").instanceId);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT21-015", "BT21-001"]));
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nonMatch").instanceId);
  });

  it("digivolves from a public attack that removes the opponent's security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-015", as: "host", under: ["BT21-001", "BT21-007"] }],
          hand: [{ card: "BT21-024", as: "cyberdramon" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("host").topCard.cardId).toBe("BT21-024");
    expect(s.state.memory).toBe(3);
  });

  it("does not trigger when the controller's own security is removed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-015", as: "host", under: ["BT21-001"] }],
          hand: [{ card: "BT21-024", as: "cyberdramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });

    expect(s.perm("host").topCard.cardId).toBe("BT21-015");
    expect(s.state.memory).toBe(5);
  });

  it("may decline and can resolve only once per turn", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-015", as: "host", under: ["BT21-001"] }],
          hand: [{ card: "BT21-024", as: "cyberdramon" }],
        },
      },
      { autoDeclineOptional: true },
    );
    declined.state.turnSeat = 0;
    declined.state.memory = 5;
    await declined.ready();
    await advance(declined.engine).fire(EffectTiming.OnStartMainPhase, declined.perm("host"));
    await advance(declined.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(declined.perm("host").topCard.cardId).toBe("BT21-015");

    const once = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-015", as: "first", under: ["BT21-001"] },
            { card: "BT21-015", as: "second" },
          ],
          hand: [
            { card: "BT21-024", as: "firstEvolution" },
            { card: "BT21-024", as: "secondEvolution" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    once.state.turnSeat = 0;
    once.state.memory = 10;
    await once.ready();
    await advance(once.engine).fire(EffectTiming.OnStartMainPhase, once.perm("first"));
    await advance(once.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await advance(once.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });

    expect(once.state.players[0]!.hand.filter((card) => card.cardId === "BT21-024")).toHaveLength(1);
    expect(once.state.memory).toBe(8);
  });
});
