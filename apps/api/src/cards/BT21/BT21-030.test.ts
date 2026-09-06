import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-030.js";
import "../index.js";

describe("BT21-030 compiled implementation", () => {
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

  it("verifies the Shoutmon cost replacement, trash DigiXros expansion, stack trash, and attack return", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 1,
          actions: [
            { kind: "SelectBind" },
            { kind: "TrashDigivolution", amount: 99 },
            { kind: "PlaceUnder", targetIsPermanent: true },
          ],
          additionalEffects: [{ kind: "AllowDigiXrosMaterialsFromTrash" }],
        },
      ],
    });
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      actions: expect.arrayContaining([
        {
          kind: "SelectBind",
          target: expect.objectContaining({
            filter: expect.objectContaining({
              nameOrTrait: [{ tokens: ["Shoutmon"], match: "nameExact" }],
            }),
          }),
        },
      ]),
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects).toContainEqual(
        expect.objectContaining({
          trigger,
          actions: [
            {
              kind: "TrashDigivolution",
              amount: 10,
              fromTop: true,
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            },
          ],
        }),
      );
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenAttacking",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Return",
            to: "deckBottom",
            optional: true,
            target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" }, count: 1 },
          },
        ],
      }),
    );
    expect(compiled.digiXrosRequirement).toEqual([
      {
        materials: [
          {
            nameOrTrait: [{ tokens: ["Xros Heart", "Blue Flare"], match: "trait" }],
            differentCardNumbers: true,
          },
        ],
        count: "∞",
        costReduction: 1,
      },
    ]);
  });

  it("pays 14 and places its Shoutmon cost under the played card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-011", as: "shoutmon" }],
          hand: [{ card: "BT21-030", as: "superior" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 14;
    const shoutmonId = s.perm("shoutmon").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("superior").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-030"));

    const superior = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT21-030")!;
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === shoutmonId)).toBe(false);
    expect(superior.stack.map((card) => card.cardId)).toContain("BT21-011");
  });

  it("accepts a qualifying trash card as DigiXros material after paying the Shoutmon cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-011", as: "shoutmon" }],
          trash: [{ card: "BT21-021", as: "trashMaterial" }],
          hand: [{ card: "BT21-030", as: "superior" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 13;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("superior").instanceId,
        digiXros: { materialInstanceIds: [s.inst("trashMaterial").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-030"));

    const superior = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT21-030")!;
    expect(s.state.memory).toBe(0);
    expect(superior.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT21-011", "BT21-021"]));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("trashMaterial").instanceId)).toBe(
      false,
    );
  });

  it("publicly accepts variable distinct-number Xros Heart materials and rejects duplicate or near-invalid cards", async () => {
    const valid = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-011", as: "shoutmon" }],
          hand: [
            { card: "BT21-030", as: "superior" },
            { card: "BT21-021", as: "omni" },
            { card: "BT10-008", as: "x4" },
            { card: "BT10-009", as: "x4b" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    valid.state.memory = 14;
    await valid.ready();
    expect(
      valid.engine.applyIntent(0, {
        type: "playCard",
        instanceId: valid.inst("superior").instanceId,
        digiXros: {
          materialInstanceIds: [
            valid.inst("omni").instanceId,
            valid.inst("x4").instanceId,
            valid.inst("x4b").instanceId,
          ],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT21-030"));
    const validHost = valid.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT21-030")!;
    expect(validHost.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT21-011", "BT21-021", "BT10-008", "BT10-009"]),
    );
    expect(valid.state.memory).toBe(3);

    const duplicate = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-011", as: "shoutmon" }],
          hand: [
            { card: "BT21-030", as: "superior" },
            { card: "BT10-008", as: "first" },
            { card: "BT10-008", as: "duplicate" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    duplicate.state.memory = 14;
    await duplicate.ready();
    expect(
      duplicate.engine.applyIntent(0, {
        type: "playCard",
        instanceId: duplicate.inst("superior").instanceId,
        digiXros: { materialInstanceIds: [duplicate.inst("first").instanceId, duplicate.inst("duplicate").instanceId] },
      }),
    ).toMatchObject({ ok: false });
    expect(duplicate.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        duplicate.inst("superior").instanceId,
        duplicate.inst("first").instanceId,
        duplicate.inst("duplicate").instanceId,
      ]),
    );

    const nearInvalid = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-011", as: "shoutmon" }],
          hand: [
            { card: "BT21-030", as: "superior" },
            { card: "BT1-009", as: "nonXros" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    nearInvalid.state.memory = 14;
    await nearInvalid.ready();
    expect(
      nearInvalid.engine.applyIntent(0, {
        type: "playCard",
        instanceId: nearInvalid.inst("superior").instanceId,
        digiXros: { materialInstanceIds: [nearInvalid.inst("nonXros").instanceId] },
      }),
    ).toMatchObject({ ok: false });
  });

  it("trashes only stacked cards from the top and leaves the opponent's top card", async () => {
    const stack = Array.from({ length: 11 }, (_, index) => ({ card: "BT1-001", as: `source-${index}` }));
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-030", as: "superior" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", under: stack }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("superior"));

    expect(s.perm("target").topCard.cardId).toBe("BT1-009");
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(10);
  });

  it("evolves from a Hero level 6 for 3 and trashes all available sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-028", as: "hero" }],
          hand: [{ card: "BT21-030", as: "superior" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", under: ["BT1-001", "BT1-002"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hero").permanentId,
        instanceId: s.inst("superior").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hero").topCard.cardId === "BT21-030");
    await settle(() => s.perm("target").stack.length === 0);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.trash).toHaveLength(2);
  });

  it("returns only a source-less opposing Digimon to deck bottom and may decline", async () => {
    for (const accept of [true, false]) {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT21-030", as: "superior" }] },
          1: {
            deck: [{ card: "BT1-001", as: "old-bottom" }],
            battleArea: [
              { card: "BT1-009", as: "sourceLess" },
              { card: "BT1-010", as: "stacked", under: ["BT1-002"] },
            ],
          },
        },
        accept ? { autoAcceptOptional: true, autoSelectCards: true } : { autoDeclineOptional: true },
      );
      await s.ready();
      const sourceLessId = s.perm("sourceLess").permanentId;

      await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("superior"));

      expect(
        s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("stacked").permanentId),
      ).toBe(true);
      expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === sourceLessId)).toBe(!accept);
      expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe(accept ? "BT1-009" : "BT1-001");
    }
  });

  it("returns a source-less Digimon after a real public attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-030", as: "superior", enteredThisTurn: false }] },
        1: {
          deck: [{ card: "BT1-001", as: "old-bottom" }],
          battleArea: [
            { card: "BT1-009", as: "sourceLess" },
            { card: "BT1-010", as: "stacked", under: ["BT1-002"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceLessId = s.perm("sourceLess").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("superior").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === sourceLessId));
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-009");
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-010")).toBe(true);
  });
});
