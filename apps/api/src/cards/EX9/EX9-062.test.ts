import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX9-062.js";
import "../index.js";
import { getEffectModule } from "../../engine/effects/registry.js";

describe("EX9-062", () => {
  it("explicitly declines recovery after a real normal play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX9-062", as: "source" }], trash: ["EX9-059"], deck: ["BT1-046"] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-062"]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-059"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it.each(["duplicate", "level-five", "non-DM", "partial"])(
    "rejects invalid Kimeramon Assembly without consuming cards (%s)",
    async (invalid) => {
      const materials = ["EX9-062", "EX9-009", "EX9-017", "EX9-025", "EX9-026", "EX9-037", "EX9-049"];
      if (invalid === "partial") materials.pop();
      else materials[6] = invalid === "duplicate" ? "EX9-009" : invalid === "level-five" ? "EX9-011" : "BT10-062";
      const s = setupEngine({
        0: {
          hand: [{ card: "EX9-074", as: "kimeramon" }],
          trash: materials.map((card, index) => ({ card, as: `material${index}` })),
        },
      });
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("kimeramon").instanceId,
          assembly: { materialInstanceIds: materials.map((_, index) => s.inst(`material${index}`).instanceId) },
        }).ok,
      ).toBe(false);
      await settle();
      expect(s.state.players[0]!.battleArea).toHaveLength(0);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-074"]);
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(materials);
      expect(s.state.memory).toBe(5);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it("counts SkullGreymon as level four for a real Kimeramon Assembly play", async () => {
    const materials = ["EX9-062", "EX9-009", "EX9-017", "EX9-025", "EX9-026", "EX9-037", "EX9-049"];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX9-074", as: "kimeramon" }],
          trash: materials.map((card, index) => ({ card, as: `material${index}` })),
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("kimeramon").instanceId,
        assembly: { materialInstanceIds: materials.map((_, index) => s.inst(`material${index}`).instanceId) },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-074"]);
    // Declaration is top-first; the stored stack is bottom-first.
    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId)).toEqual([...materials].reverse());
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it.each([true, false])("validates the off-color DM evolution and declines recovery (DM=%s)", async (dm) => {
    const base = dm ? "EX9-009" : "BT1-016";
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "EX9-062", as: "evo" }],
          deck: ["BT1-046"],
          trash: ["EX9-059"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(dm);
    await settle();
    expect(s.perm("base").topCard.cardId).toBe(dm ? "EX9-062" : base);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(dm ? [base] : []);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(dm ? ["BT1-046"] : ["EX9-062"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-059"]);
    expect(s.state.memory).toBe(dm ? 2 : 5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([false, true])("allows declining the free play after battle deletion (inherited=%s)", async (inherited) => {
    const top = inherited ? "BT3-089" : "EX9-062";
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: top, as: "host", under: inherited ? ["EX9-062"] : [], suspended: true }],
          trash: ["EX9-059"],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-080", as: "attacker" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId).sort()).toEqual(
      ["EX9-059", "EX9-062", ...(inherited ? [top] : [])].sort(),
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it.each([false, true])(
    "plays exactly one eligible DM for free after real battle deletion (inherited=%s)",
    async (inherited) => {
      const top = inherited ? "BT3-089" : "EX9-062";
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: top, as: "host", under: inherited ? ["EX9-062"] : [], suspended: true }],
            trash: ["EX9-011", "BT1-010", "EX9-001", "EX9-059"],
            security: ["BT1-010"],
          },
          1: { battleArea: [{ card: "BT1-080", as: "attacker" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      s.state.turnSeat = 1;
      s.state.memory = 5;
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("host").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle();
      expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-059"]);
      expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId).sort()).toEqual(
        ["EX9-011", "BT1-010", "EX9-001", "EX9-062", ...(inherited ? [top] : [])].sort(),
      );
      expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
      expect(s.state.memory).toBe(5);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it.each([false, true])(
    "resolves real play or evolution and can recover the newly milled DM card (digivolve=%s)",
    async (digivolve) => {
      const s = setupEngine(
        {
          0: {
            battleArea: digivolve
              ? [
                  {
                    card: "EX9-059",
                    as: "base",
                    under: [{ card: "BT1-009", faceUp: false }, { card: "BT1-048", faceUp: false }, "EX9-058"],
                  },
                ]
              : [],
            hand: [{ card: "EX9-062", as: "source" }],
            deck: digivolve ? ["BT1-046", "EX9-010", "BT1-010", "BT1-048"] : ["BT1-046"],
            trash: digivolve ? ["BT1-009"] : ["BT1-009", "EX9-010"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      expect(
        s.engine.applyIntent(
          0,
          digivolve
            ? { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("source").instanceId }
            : { type: "playCard", instanceId: s.inst("source").instanceId },
        ),
      ).toEqual({ ok: true });
      await settle();
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
        digivolve ? ["BT1-046", "EX9-010"] : ["EX9-010"],
      );
      expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(digivolve ? ["BT1-048"] : ["BT1-046"]);
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
        digivolve ? ["BT1-009", "BT1-010"] : ["BT1-009"],
      );
      expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX9-062");
      expect(s.state.players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId)).toEqual(
        digivolve ? ["BT1-009", "BT1-048", "EX9-058", "EX9-059"] : [],
      );
      expect(s.state.memory).toBe(digivolve ? 7 : 3);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it("mills the deck based on face-down sources and recovers a DM Digimon on play or digivolution", () => {
    expect(compiled.effects?.some((entry) => entry.trigger === "Static")).toBe(false);
    expect(compiled.coverage).toBe("full");
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Trash", scaling: { unit: "selfFaceDownDigivolutionCards", per: 1 } },
          {
            kind: "Return",
            to: "hand",
            target: { filter: { zone: "trash", nameOrTrait: [{ tokens: ["DM"], match: "trait" }] } },
          },
        ],
      });
  });
  it("plays a level-four-or-lower DM Digimon from trash as inherited text", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      target: { filter: { levelComparison: { op: "lte", value: 4 } } },
    }));
  it("scales deck trashing by face-down sources and returns only one own DM Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions).toMatchObject([
        {
          kind: "Trash",
          target: { filter: { controller: "mine", zone: "deck" }, count: 1 },
          scaling: {
            per: 1,
            unit: "selfFaceDownDigivolutionCards",
            filter: { controllerDefault: "mine", kind: ["Digimon"], faceDown: true },
          },
        },
        {
          kind: "Return",
          to: "hand",
          optional: true,
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["DM"], match: "trait" }],
            },
            count: 1,
          },
        },
      ]);
  });
  it.each([
    ["OnPlay", EffectTiming.OnPlay],
    ["WhenDigivolving", EffectTiming.WhenDigivolving],
  ] as const)(
    "%s trashes one deck card per face-down source and returns one own DM Digimon",
    async (_label, timing) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "EX9-062",
                as: "source",
                under: [
                  { card: "EX9-010", faceUp: false },
                  { card: "BT1-009", faceUp: false },
                ],
              },
            ],
            deck: ["BT1-009", "BT1-010"],
            trash: ["EX9-010", "EX9-015"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );

      expect(s.perm("source").stack).toHaveLength(2);
      expect(s.perm("source").stack.every((card) => card.faceUp === false)).toBe(true);
      expect(getEffectModule("EX9-062")?.effectsForTiming(timing, s.perm("source") as never)).toHaveLength(1);
      await advance(s.engine).fireForPermanent(timing, s.perm("source"));
      await settle(
        () =>
          s.state.players[0]!.deck.length === 0 &&
          s.state.players[0]!.hand.some((card) => card.cardId === "EX9-010" || card.cardId === "EX9-015"),
      );

      expect(s.state.players[0]!.deck).toHaveLength(0);
      expect(s.state.players[0]!.trash.filter((card) => ["BT1-009", "BT1-010"].includes(card.cardId))).toHaveLength(2);
      expect(s.state.players[0]!.hand.filter((card) => ["EX9-010", "EX9-015"].includes(card.cardId))).toHaveLength(1);
    },
  );

  it("plays a level-four-or-lower DM Digimon from trash when the inherited source is deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-089", as: "host", under: ["EX9-062"] }], trash: ["EX9-059"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX9-059"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX9-059")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX9-059")).toBe(false);
  });

  it("plays a level-four-or-lower DM Digimon from trash on its own deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-062", as: "source" }], trash: ["EX9-059"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-059"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-059")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX9-059")).toBe(false);
  });
});
