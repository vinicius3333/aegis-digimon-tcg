import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-077.js";

describe("BT23-077 Sistermon Ciel", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-077")).toMatchObject({
      cardId: "BT23-077",
      nameEn: "Sistermon Ciel",
      colors: ["White"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [],
      forms: ["Champion"],
      attributes: ["Data", "Virus"],
      types: ["Puppet", "CS"],
      effectText:
        "＜Blocker＞ \n[On Play] Delete 1 of your opponent's Digimon with a play cost of 4 or less.\n" +
        "[All Turns] When this Digimon suspends, ＜De-Digivolve 1＞ 1 of your opponent's Digimon.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
    expect(compiled.effects.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toEqual({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 }, count: 1 },
    });
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
        },
      ],
    });
  });

  it("projects Blocker through the live continuous ledger", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-077", as: "ciel" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("ciel"), "Blocker")).toBe(true);
  });

  it("deletes exactly the play-cost-4 opposing Digimon when played publicly", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT23-077", as: "ciel" },
            { card: "ST1-02", as: "neutral" },
          ],
          deck: ["BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-015", as: "victim" },
            { card: "BT1-034", as: "safe" },
          ],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const cielId = s.inst("ciel").instanceId;
    const victimPermanentId = s.perm("victim").permanentId;
    const victimCardId = s.perm("victim").topCard!.instanceId;
    const safePermanentId = s.perm("safe").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: cielId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((perm) => perm.permanentId !== victimPermanentId));

    expect(s.state.players[1]!.battleArea.map((perm) => perm.permanentId)).toEqual([safePermanentId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([victimCardId]);
    expect(s.state.players[1]!.trash[0]!.cardId).toBe("BT1-015");
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === cielId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === cielId)).toBe(false);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("leaves an opposing play-cost-5 Digimon alone and asks nothing", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT23-077", as: "ciel" },
            { card: "ST1-02", as: "neutral" },
          ],
          deck: ["BT1-012", "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-034", as: "safe" }], deck: ["BT1-012", "BT1-013"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const cielId = s.inst("ciel").instanceId;
    const safePermanentId = s.perm("safe").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: cielId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === cielId));

    expect(s.state.players[1]!.battleArea.map((perm) => perm.permanentId)).toEqual([safePermanentId]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("de-digivolves an opposing stack when it suspends to attack", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-077", as: "ciel" }], deck: ["BT1-012", "BT1-013"] },
        1: {
          battleArea: [{ card: "BT1-015", as: "stack", under: ["ST1-02"] }],
          security: ["BT1-012", "BT1-012"],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    const greymonCardId = s.perm("stack").topCard!.instanceId;
    const biyomonCardId = s.perm("stack").stack[0]!.instanceId;
    preferInstanceIds.push(greymonCardId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ciel").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("stack").topCard?.cardId).toBe("ST1-02");
    expect(s.perm("stack").topCard?.instanceId).toBe(biyomonCardId);
    expect(s.perm("stack").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === greymonCardId)).toBe(true);
    expect(s.perm("ciel").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === s.perm("ciel").permanentId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("blocks a declared attack and de-digivolves during the opponent's turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-077", as: "ciel" }],
          security: ["BT1-012", "BT1-012"],
          deck: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker" },
            { card: "BT1-015", as: "stack", under: ["ST1-02"] },
          ],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const greymonCardId = s.perm("stack").topCard!.instanceId;
    const biyomonCardId = s.perm("stack").stack[0]!.instanceId;
    const attackerCardId = s.perm("attacker").topCard!.instanceId;
    preferInstanceIds.push(greymonCardId);
    expect(s.perm("ciel").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(observe(s.engine).hasKeyword(s.perm("ciel"), "Blocker")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("ciel").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.perm("ciel").isSuspended).toBe(true);
    expect(s.perm("stack").topCard?.instanceId).toBe(biyomonCardId);
    expect(s.perm("stack").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [greymonCardId, attackerCardId].sort(),
    );
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("ignores another friendly Digimon suspending", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-077", as: "ciel" },
            { card: "BT1-009", as: "other" },
          ],
          deck: ["BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-015", as: "stack", under: ["ST1-02"] }],
          security: ["BT1-012", "BT1-012"],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const greymonCardId = s.perm("stack").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("stack").topCard?.instanceId).toBe(greymonCardId);
    expect(s.perm("stack").stack.map((card) => card.cardId)).toEqual(["ST1-02"]);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === greymonCardId)).toBe(false);
    expect(s.perm("ciel").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resolves with no pending decision when the only opposing Digimon has no digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-077", as: "ciel" }], deck: ["BT1-012", "BT1-013"] },
        1: {
          battleArea: [{ card: "BT1-034", as: "bare" }],
          security: ["BT1-012", "BT1-012"],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const barePermanentId = s.perm("bare").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ciel").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea.map((perm) => perm.permanentId)).toEqual([barePermanentId]);
    expect(s.perm("bare").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-034")).toBe(false);
    expect(s.perm("ciel").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("carries the official (Rule) alternate name and Virus trait grant", () => {
    const rule = compiled.effects.find((entry) => entry.trigger === "Rule");
    expect(rule?.actions).toEqual([
      {
        kind: "GrantStatic",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        grant: "name",
        tokens: ["Sistermon Noir"],
      },
      {
        kind: "GrantStatic",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        grant: "trait",
        tokens: ["Virus"],
      },
    ]);
  });

  it("answers to [Sistermon Noir] on the live continuous ledger", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-077", as: "ciel" }] } });
    await s.ready();

    // The ledger stores granted names case-folded; compare on the same footing.
    const lower = (names: string[]): string[] => names.map((name) => name.toLowerCase());
    expect(lower(observe(s.engine).grantedNames(s.perm("ciel")))).toEqual(["sistermon noir"]);
    expect(lower(observe(s.engine).effectiveNames(s.perm("ciel")))).toEqual(
      expect.arrayContaining(["sistermon ciel", "sistermon noir"]),
    );
    expect(lower(observe(s.engine).effectiveNames(s.perm("ciel")))).not.toContain("sistermon blanc");
    expect(observe(s.engine).hasEffectiveTrait(s.perm("ciel"), "Virus")).toBe(true);
  });

  it("is seen by an opposing card's public [Virus] trait condition", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-102", as: "angemon" }],
          security: ["BT1-012", "BT1-012"],
          deck: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT23-077", as: "ciel" },
            { card: "BT1-015", as: "vaccine" },
          ],
          security: ["BT1-012", "BT1-012"],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    const cielCardId = s.perm("ciel").topCard!.instanceId;
    const vaccinePermanentId = s.perm("vaccine").permanentId;
    preferInstanceIds.push(cielCardId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("angemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 3);

    expect(s.state.players[1]!.security.at(-1)?.instanceId).toBe(cielCardId);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.permanentId)).toEqual([vaccinePermanentId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
