import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-001.js";
import "../index.js";
import "../AD1/AD1-017.js";

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
          battleArea: [{ card: "BT21-015", as: "host", under: ["BT21-001", "BT1-009"] }],
          hand: [
            { card: "BT21-024", as: "cyberdramon" },
            { card: "BT1-001", as: "nonMatch" },
          ],
        },
        1: { security: ["BT1-001"] },
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

  it("digivolves into a printed Reptile destination after public opponent security removal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-007", as: "host", under: ["BT21-001"] }],
          hand: [{ card: "BT21-017", as: "reptile" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("reptile").instanceId);
    expect(s.state.memory).toBe(2);
  });

  it("builds the inherited source through public level-3 and level-4 evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-001", as: "host" }],
        hand: [
          { card: "BT1-009", as: "lv3" },
          { card: "BT21-015", as: "lv4" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("lv3").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT1-009");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("lv4").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT21-015");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT21-001", "BT1-009"]);
    expect(s.perm("host").topCard.cardId).toBe("BT21-015");
    expect(s.state.memory).toBe(8);
  });

  it("does not trigger when the controller's own security is removed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-015", as: "host", under: ["BT21-001", "BT1-009"] }],
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

  it("does not trigger on the opponent's turn when their own security is removed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-007", as: "host", under: ["BT21-001"] }],
          hand: [{ card: "BT21-017", as: "evolution" }],
          security: ["BT1-001"],
          deck: ["BT1-009", "BT1-009"],
        },
        1: {
          hand: [{ card: "AD1-017", as: "dynasmon" }],
          security: ["BT1-002", "BT1-003"],
          trash: ["AD1-018", "BT13-087", "BT13-090", "BT18-034"],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("dynasmon").instanceId })).toEqual({
      ok: true,
    });
    await drainMicrotasks();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolution").instanceId);
    expect(s.perm("host").topCard.cardId).toBe("BT21-007");
  });

  it("does not trigger when a public effect removes this player's own security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-007", as: "host", under: ["BT21-001"] }],
          hand: [
            { card: "AD1-017", as: "remover" },
            { card: "BT21-017", as: "evolution" },
          ],
          trash: ["AD1-018", "BT13-087", "BT13-090", "BT18-034"],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("remover").instanceId })).toEqual({
      ok: true,
    });
    await drainMicrotasks();
    expect(s.perm("host").topCard.cardId).toBe("BT21-007");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evolution").instanceId)).toBe(true);
  });

  it("may decline and can resolve only once per turn", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-015", as: "host", under: ["BT21-001", "BT1-009"] }],
          hand: [{ card: "BT21-024", as: "cyberdramon" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true },
    );
    declined.state.memory = 5;
    await declined.ready();
    expect(
      declined.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: declined.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.state.players[1]!.security.length === 0);
    expect(declined.perm("host").topCard.cardId).toBe("BT21-015");

    const once = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-015", as: "first", under: ["BT21-001", "BT1-009"] },
            { card: "BT21-015", as: "second", under: ["BT1-009"] },
          ],
          hand: [
            { card: "BT21-024", as: "firstEvolution" },
            { card: "BT21-024", as: "secondEvolution" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    once.state.turnSeat = 0;
    once.state.memory = 10;
    await once.ready();
    const attack = (as: string) =>
      once.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: once.perm(as).permanentId,
        target: { kind: "player" },
      });
    const securityBeforeFirst = once.state.players[1]!.security.length;
    expect(attack("first")).toEqual({ ok: true });
    await settle(() => !observe(once.engine).isAttacking());
    expect(once.state.players[1]!.security.length).toBeLessThan(securityBeforeFirst);
    expect(observe(once.engine).isAttacking()).toBe(false);
    const securityAfterFirst = once.state.players[1]!.security.length;
    expect(attack("second")).toEqual({ ok: true });
    await settle(() => !observe(once.engine).isAttacking());
    expect(once.state.players[1]!.security.length).toBeLessThan(securityAfterFirst);
    expect(observe(once.engine).isAttacking()).toBe(false);

    expect(once.state.players[0]!.hand.filter((card) => card.cardId === "BT21-024")).toHaveLength(1);
    expect(once.state.memory).toBe(8);
  });
});

describe("BT21-001 Gigimon — KB Q&A rulings", () => {
  it("resolves the checked [Security] effect before the turn player's security-removal digivolution (Q4516)", async () => {
    const attackWithCheckedCard = async (checkedCard: string) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT21-015", as: "host", under: ["BT21-001"] }],
            hand: [{ card: "BT21-024", as: "cyberdramon" }],
          },
          1: { security: [{ card: checkedCard, as: "checked" }, "BT1-013"] },
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
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
      return s;
    };

    // BT12-099's [Security] deletes a Digimon with 6000 DP or less: the 5000 DP host, not a 7000 DP Cyberdramon.
    const withSecurityEffect = await attackWithCheckedCard("BT12-099");
    expect(withSecurityEffect.state.players[0]!.battleArea).toHaveLength(0);
    expect(withSecurityEffect.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      withSecurityEffect.inst("cyberdramon").instanceId,
    );
    expect(withSecurityEffect.state.memory).toBe(5);

    const withoutSecurityEffect = await attackWithCheckedCard("BT1-009");
    expect(withoutSecurityEffect.perm("host").topCard.cardId).toBe("BT21-024");
    expect(withoutSecurityEffect.state.memory).toBe(3);
  });

  it("checks one more security card after digivolving the attacker into a <Security A. +1> Digimon mid-check (Q4517)", async () => {
    const attack = async (acceptDigivolution: boolean) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT21-024", as: "host", under: ["BT21-001"] }],
            hand: [{ card: "BT21-029", as: "medusamon" }],
          },
          1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
        },
        acceptDigivolution
          ? { autoAcceptOptional: true, autoSelectCards: true }
          : { autoDeclineOptional: true, autoSelectCards: true },
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
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
      return s;
    };

    const digivolved = await attack(true);
    expect(digivolved.perm("host").topCard.cardId).toBe("BT21-029");
    expect(digivolved.state.memory).toBe(2);
    expect(digivolved.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);

    const declined = await attack(false);
    expect(declined.perm("host").topCard.cardId).toBe("BT21-024");
    expect(declined.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
  });

  it("makes Cyberdramon trash the new top security card, not the card already being checked (Q4518)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-015", as: "host", under: ["BT21-001"] }],
          hand: [{ card: "BT21-024", as: "cyberdramon" }],
        },
        1: {
          hand: [{ card: "BT1-010", as: "placedFromHand" }],
          security: [
            { card: "BT1-009", as: "checked" },
            { card: "BT1-013", as: "nextTop" },
            { card: "BT1-014", as: "lower" },
          ],
        },
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
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.perm("host").topCard.cardId).toBe("BT21-024");
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("lower").instanceId,
      s.inst("placedFromHand").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("checked").instanceId, s.inst("nextTop").instanceId]),
    );
  });
});
