import { EffectTiming } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";

it.each([false, true])(
  "#4993 Inferno Divide bypasses Alphamon's Digimon-effect immunity (effect use: %s)",
  async (effectUse) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX13-060", as: "alpha", under: ["EX13-049", "EX13-055", "EX13-057"] },
            { card: "EX13-055", as: "raptor" },
          ],
          hand: [{ card: "EX13-057", as: "grade" }],
          deck: ["BT1-010", "BT1-010"],
          security: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT26-074", as: "cerberus" }],
          hand: [{ card: "BT26-056", as: "inferno" }, "BT1-010", "BT1-010"],
          security: ["BT1-010", "BT1-010"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferInstanceIds: preferred,
        declinePrompts: ["Arts Digivolve"],
      },
    );
    preferred.push(s.perm("alpha").permanentId, s.inst("alpha").instanceId);
    s.state.memory = 8;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("raptor").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    expect(observe(s.engine).isRestrictedByEffect(s.perm("alpha"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("alpha"), "beAffected", "Option")).toBe(false);
    s.state.turnSeat = 1;
    s.state.memory = 8;
    // Cerberusmon can trash the dual card as its cost, then use that same Option from trash.
    if (effectUse) preferred.unshift(s.inst("inferno").instanceId);
    const result = effectUse
      ? s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("cerberus").permanentId,
          target: { kind: "player" },
        })
      : s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("inferno").instanceId, useAs: "option" });
    expect(result).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "BT26-056") && !s.state.pendingDecision,
    );
    expect(s.perm("alpha").topCard.cardId).toBe("EX13-049");
  },
);

it.each(["LM-056", "LM-062"])("#4995 %s pays the alternate cost reduced by two", async (training) => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: training, as: "training" },
          { card: "BT25-078", as: "base" },
        ],
        hand: [{ card: "BT25-082", as: "blackGatomon" }],
        deck: ["BT1-010"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
  );
  s.state.memory = 5;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.inst("training").instanceId,
      effectKey: `${training}/ir-${EffectTiming.OnDeclaration}-0`,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard.cardId === "BT25-082" && !s.state.pendingDecision);
  expect(s.perm("base").topCard.cardId).toBe("BT25-082");
  expect(s.state.memory).toBe(5);
});

it("#4995 Asuna offers BeelStarmon's alternate requirement before applying her reduction", async () => {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT25-092", as: "asuna" },
          { card: "BT25-083", as: "lady" },
        ],
        hand: [
          { card: "BT26-056", as: "cost" },
          { card: "BT25-085", as: "beel" },
        ],
        deck: ["BT1-010"],
      },
    },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferOptionIndex: 1,
      preferInstanceIds: preferred,
    },
  );
  preferred.push(s.inst("cost").instanceId);
  s.state.memory = 8;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.inst("asuna").instanceId,
      effectKey: `BT25-092/ir-${EffectTiming.OnDeclaration}-0`,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("lady").topCard.cardId === "BT25-085" && !s.state.pendingDecision);
  expect(s.state.memory).toBe(6);
  expect(s.perm("asuna").isSuspended).toBe(true);
});

it("#4995 Pagumon chooses the alternate requirement for its derived digivolution", async () => {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT25-082", as: "base", under: ["BT25-005"] }],
        hand: [
          { card: "BT25-083", as: "lady" },
          { card: "BT25-085", as: "beel" },
        ],
        trash: [{ card: "BT25-085", as: "material" }],
        deck: ["BT1-010", "BT1-010", "BT1-010"],
      },
    },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferOptionIndex: 1,
      preferInstanceIds: preferred,
      declinePrompts: ["Use an Option", "Unsuspend"],
    },
  );
  preferred.push(s.inst("material").instanceId);
  s.state.memory = 8;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("lady").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard.cardId === "BT25-085" && !s.state.pendingDecision);
  expect(s.state.memory).toBe(4);
});

it("#4994 Fly Bullet used by BeelStarmon deletes a suspended Digimon protected by Ceresmon", async () => {
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "BT25-059", as: "ceres" }],
        security: ["BT1-010", "BT1-010"],
        battleArea: [
          { card: "BT25-077", as: "bacchus", suspended: true },
          { card: "BT1-013", suspended: true },
        ],
      },
      1: {
        battleArea: [{ card: "BT25-085", as: "beel" }],
        hand: [{ card: "BT25-085", as: "bullet" }],
      },
    },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      declinePrompts: ["Suspend", "Ceresmon", "Bacchusmon", "digivolve", "Digivolve"],
    },
  );
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ceres").instanceId })).toEqual({ ok: true });
  await settle(
    () =>
      s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "BT25-059") && !s.state.pendingDecision,
  );
  s.state.turnSeat = 1;
  s.state.memory = 10;
  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("beel").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.events.some(
        (e) => e.kind === "effectResolved" && e.sourceCardId === "BT25-085" && e.timing === "OnUseOption",
      ) && !s.state.pendingDecision,
  );

  expect(s.state.players[0]!.trash.some((c) => c.cardId === "BT25-077")).toBe(true);
});

it("#4996 HeavyMetaldramon offers an empty breeding area as a play destination", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "LM-068", as: "heavy" }],
        hand: ["BT1-010"],
        trash: [{ card: "BT11-079", as: "darkLizard" }],
      },
      1: { security: ["BT1-010", "BT1-010", "BT1-010"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("heavy").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.state.pendingDecision?.kind === "chooseOption" ||
      s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "LM-068" && e.timing === "OnEndAttack"),
  );
  expect(s.state.pendingDecision?.kind).toBe("chooseOption");
  const d = s.decisions.at(-1)!.req;
  expect(d.options?.choices).toContain("Breeding area");
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: d.decisionId,
      response: { kind: "chooseOption", optionIndex: 1 },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.breeding?.topCard.cardId === "BT11-079" && !s.state.pendingDecision);
  expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["LM-068"]);
});

it("#4996 HeavyMetaldramon cannot replace an occupied breeding area", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "LM-068", as: "heavy" }],
        breeding: { card: "BT25-005", as: "egg" },
        hand: ["BT1-010"],
        trash: ["BT11-079"],
      },
      1: { security: ["BT1-010", "BT1-010", "BT1-010"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("heavy").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  // With only the battle area legal, the accepted optional effect needs no destination chooser.
  await settle(
    () => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT11-079") && !s.state.pendingDecision,
  );
  expect(s.decisions.some((d) => d.req.options?.choices?.includes("Breeding area"))).toBe(false);
  expect(s.state.players[0]!.breeding?.permanentId).toBe(s.perm("egg").permanentId);
});
it("#4996 HeavyMetaldramon can decline the destination without moving a trash card", async () => {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "LM-068", as: "heavy" }], hand: ["BT1-010"], trash: ["BT11-079"] },
      1: { security: ["BT1-010", "BT1-010", "BT1-010"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("heavy").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "chooseOption");
  const d = s.decisions.at(-1)!.req;
  expect(d.options?.choices).toHaveLength(3);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: d.decisionId,
      response: { kind: "chooseOption", optionIndex: 2 },
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  expect(s.state.players[0]!.trash.some((c) => c.cardId === "BT11-079")).toBe(true);
  expect(s.state.players[0]!.breeding).toBeUndefined();
});

it("#4998 The Strongest of Brothers ignores color with LM Gammamon only in breeding", async () => {
  const s = setupEngine(
    {
      0: {
        breeding: { card: "LM-016", as: "gammamon" },
        hand: [{ card: "BT21-090", as: "option" }],
        deck: ["BT1-010", "BT1-010", "BT1-010"],
      },
    },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  s.state.memory = 8;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(
    () => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT21-090") && !s.state.pendingDecision,
  );
  expect(s.state.memory).toBe(5);
});
it.each(["effect", "battle"])("#4997 the turn player wins deletion priority by %s", async (cause) => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT2-013", as: "growl" }],
        hand: [{ card: "EX8-012", as: "growlX" }],
        trash: ["BT2-009"],
        deck: ["BT1-010", "BT1-010", "BT1-010"],
      },
      1: {
        battleArea: [{ card: "BT2-020", as: "gallant", under: ["EX8-012"] }],
        hand: [{ card: "ST1-16", as: "gaia" }],
        deck: ["BT1-010", "BT1-010"],
        security: ["BT1-010", "BT1-010", "BT1-010"],
      },
    },
    { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
  );
  s.state.memory = 8;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("growl").permanentId,
      instanceId: s.inst("growlX").instanceId,
      alternateRequirementIndex: 0,
    }),
  ).toEqual({ ok: true });
  await settle(
    () => s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "EX8-012") && !s.state.pendingDecision,
  );
  if (cause === "battle") {
    const attack = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("growl").permanentId,
      target: { kind: "player" },
    });
    if (!attack.ok) throw new Error("The battle priority setup must declare a legal attack");
    await advance(s.engine).finishAttack();
  }
  s.state.turnSeat = 1;
  s.state.memory = 10;
  const from = s.events.length;
  expect(
    s.engine.applyIntent(
      1,
      cause === "effect"
        ? { type: "playCard", instanceId: s.inst("gaia").instanceId }
        : {
            type: "attack",
            attackerPermanentId: s.perm("gallant").permanentId,
            target: { kind: "permanent", permanentId: s.perm("growl").permanentId },
          },
    ),
  ).toEqual({ ok: true });
  await settle(
    () => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT2-009") && !s.state.pendingDecision,
  );
  const reactions = s.events.slice(from).filter((e) => e.kind === "effectTriggered" && e.sourceCardId === "EX8-012");
  expect(reactions.map((e) => (e.kind === "effectTriggered" ? e.seat : -1))).toEqual([1, 0]);
});

it.each(["unrelated", "opponent", "hand"])(
  "#4998 color waiver rejects Gammamon in the wrong location: %s",
  async (place) => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT25-078" },
        hand: [{ card: "BT21-090", as: "option" }, ...(place === "hand" ? ["LM-016"] : [])],
      },
      1: place === "opponent" ? { breeding: { card: "LM-016" } } : {},
    });
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.memory).toBe(8);
  },
);

it("#4998 sweep: Paradise Lost accepts Lucemon in breeding", async () => {
  const s = setupEngine({
    0: { breeding: { card: "BT4-115", as: "lucemon" }, hand: [{ card: "EX10-071", as: "option" }] },
  });
  s.state.memory = 8;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.trash.some((c) => c.cardId === "EX10-071") && !s.state.pendingDecision);
  expect(s.perm("lucemon").currentDP).toBe(10000);
});
