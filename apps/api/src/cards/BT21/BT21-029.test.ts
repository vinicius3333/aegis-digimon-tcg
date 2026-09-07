import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-029.js";
import "../index.js";

describe("BT21-029 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("shares one once-per-turn delete budget and places Petrification for either opponent event", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "SecurityAttack", amount: 1 }],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Progress" }] });
    const deleteEffects = compiled.effects.filter((effect) =>
      ["WhenDigivolving", "EndOfAttack"].includes(effect.trigger),
    );
    expect(deleteEffects).toHaveLength(2);
    expect(
      deleteEffects.every((effect) => effect.frequency === "OncePerTurn" && effect.sharedUseKey === "ir-shared-0"),
    ).toBe(true);
    const tokenEffect = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    expect(tokenEffect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          actions: [
            {
              kind: "PlayToken",
              tokens: ["Petrification Token"],
              count: 1,
              payCost: false,
              controller: "mine",
              placedAs: "opponentDigimon",
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          actions: [
            {
              kind: "PlayToken",
              tokens: ["Petrification Token"],
              count: 1,
              payCost: false,
              controller: "mine",
              placedAs: "opponentDigimon",
            },
          ],
        },
      ],
    });
  });

  it("exposes Security Attack +1 and Progress", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT21-029", as: "medusamon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("medusamon"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("medusamon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("medusamon"), "Progress")).toBe(true);
  });

  it("evolves from a red level 5, may delete exactly one lowest-DP Digimon, and pays 4", async () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, colors: ["Red"], cost: 4, isAlternate: false }]);
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-024", as: "base", under: ["BT21-014"] }],
          hand: [{ card: "BT21-029", as: "medusamon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 3000 },
            { card: "BT11-075", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("medusamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT21-029");
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowId));

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT21-014", "BT21-024"]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(highId);
  });

  it("may decline the deletion and preserves every opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-029", as: "medusamon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("medusamon"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("target").permanentId,
    );
  });

  it("uses one shared delete activation across digivolution and end of attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-024", as: "base" }],
          hand: [{ card: "BT21-029", as: "medusamon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-009", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const firstId = s.perm("first").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("medusamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstId));
    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("base"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("second").permanentId,
    );
    expect(
      s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard.cardId.startsWith("TOKEN-Petrification")),
    ).toHaveLength(1);
  });

  it("shares the deletion budget from a public evolution with its later public attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-024", as: "base" }],
          hand: [{ card: "BT21-029", as: "medusamon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "firstLowest" },
            { card: "BT1-009", as: "secondLowest" },
          ],
          security: ["BT1-001", "BT1-001", "BT1-001"],
          deck: ["BT1-002", "BT1-003", "BT1-004"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const firstId = s.perm("firstLowest").permanentId;
    const secondId = s.perm("secondLowest").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("medusamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT21-029");
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstId));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.security.length === 1 &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === secondId)).toBe(true);
  });

  it("plays a token from a real opponent Digimon deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-029", as: "medusamon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("medusamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId.startsWith("TOKEN-Petrification")));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-Petrification-Token")).toBe(true);
  });

  it("plays only one token across two public opponent Digimon deletions in one turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-029", as: "medusamon" },
            { card: "BT21-062", as: "secondAttacker" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstVictim", suspended: true },
            { card: "BT1-010", as: "secondVictim", suspended: true },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const firstVictimId = s.perm("firstVictim").permanentId;
    const secondVictimId = s.perm("secondVictim").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("medusamon").permanentId,
        target: { kind: "permanent", permanentId: firstVictimId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Petrification-Token"),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "permanent", permanentId: secondVictimId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === secondVictimId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstVictimId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === secondVictimId)).toBe(false);
    expect(
      s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard.cardId === "TOKEN-Petrification-Token"),
    ).toHaveLength(1);
  });

  it.each([
    { event: "onDeletionOf" as const, payload: { subjectPermanentId: "replace-me" } },
    { event: "whenSecurityRemoved" as const, payload: { removedFromSecuritySeat: 1 as const } },
  ])(
    "plays one token under the opponent for $event and observes the once-per-turn limit",
    async ({ event, payload }) => {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT21-029", as: "medusamon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      });
      await s.ready();
      const victimId = s.perm("victim").permanentId;
      if (event === "onDeletionOf") {
        await advance(s.engine).verb.deletePermanent([victimId], "byEffect");
        await advance(s.engine).fireSubTrigger(event, {
          deletedPermanentId: victimId,
          deletedControllerSeat: 1,
          deletedTopCardId: "BT1-009",
        });
      } else {
        await advance(s.engine).fireSubTrigger(event, payload);
        await advance(s.engine).fireSubTrigger(event, payload);
      }

      const tokens = s.state.players[1]!.battleArea.filter((permanent) =>
        permanent.topCard.cardId.startsWith("TOKEN-Petrification"),
      );
      expect(tokens).toHaveLength(1);
      expect(tokens[0]!.controllerSeat).toBe(1);
      expect(tokens[0]!.currentDP).toBe(3000);
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId.startsWith("TOKEN-"))).toBe(
        false,
      );
    },
  );

  it("publicly performs its Security Attack +1 check and creates one opponent token from security removal", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-029", as: "attacker" }] },
        1: {
          security: ["BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "securityChecked") &&
        s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId.startsWith("TOKEN-Petrification")),
    );
    const tokenDuringAttack = s.state.players[1]!.battleArea.find((permanent) =>
      permanent.topCard.cardId.startsWith("TOKEN-Petrification"),
    );
    expect(tokenDuringAttack).toBeDefined();
    expect(tokenDuringAttack!.controllerSeat).toBe(1);
    expect(tokenDuringAttack!.currentDP).toBe(3000);

    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 2 && !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("public player attack resolves End of Attack lowest-DP deletion with printed boundaries", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-029", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "lowest" },
            { card: "BT1-009", as: "higher" },
          ],
          security: ["BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const lowestId = s.perm("lowest").permanentId;
    const higherId = s.perm("higher").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestId));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === higherId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
    expect(
      s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard.cardId.startsWith("TOKEN-Petrification")),
    ).toHaveLength(1);
  });

  it("publicly refuses the optional lowest-DP deletion and preserves targets", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-024", as: "base" }], hand: [{ card: "BT21-029", as: "medusamon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    const targetId = s.perm("target").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("medusamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT21-029");
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(true);
    expect(s.state.memory).toBe(1);
  });
});
