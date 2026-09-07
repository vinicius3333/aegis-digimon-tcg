import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-010.js";
import "../index.js";
import "../P/P-103.js";

const TRAINING_TARGET = "BT21-028";

async function evolveGammamonThroughTraining(opts: {
  security: string[];
  tamers?: string[];
  target?: string;
  rejected?: boolean;
}) {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT21-010", as: "gammamon", under: ["BT21-002"] },
          { card: "P-103", as: "training" },
          ...(opts.tamers ?? []).map((card, index) => ({ card, as: `tamer${index}` })),
        ],
        hand: [{ card: opts.target ?? TRAINING_TARGET, as: "siriusmon" }],
        security: opts.security,
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 6;
  s.state.turnCount = 1;
  await s.ready();
  const result = s.engine.applyIntent(0, {
    type: "activateEffect",
    sourceInstanceId: s.inst("training").instanceId,
    effectKey: `P-103/ir-${EffectTiming.OnDeclaration}-0`,
  });
  expect(result).toMatchObject({ ok: opts.rejected !== true });
  if (!opts.rejected)
    await settle(() => s.perm("gammamon").topCard.cardId === TRAINING_TARGET && s.state.pendingDecision === undefined);
  return s;
}

describe("BT21-010 Gammamon", () => {
  it("encodes both alternate requirements, the Your Turn permission, and inherited DP", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Gurimon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["Hero"], cost: 0, isAlternate: true },
    ]);
    const arts = compiled.effects.find((effect) => !effect.isInherited)?.actions[0];
    expect(compiled.effects.find((effect) => !effect.isInherited)?.trigger).toBe("YourTurn");
    expect(arts).toMatchObject({
      kind: "Digivolve",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      into: { nameOrTrait: [{ tokens: ["Siriusmon"], match: "nameExact" }] },
      payCost: true,
      from: ["hand"],
      costOverride: 4,
      ignoreRequirements: true,
      optional: true,
      condition: {
        kind: "orConditions",
        conditions: [
          { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 2 },
          expect.objectContaining({ kind: "permanentCount", seat: "mine", op: "gte", value: 3 }),
        ],
      },
    });
    expect(compiled.effects.find((effect) => effect.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("qualifying permission digivolves into Siriusmon for exactly 4 with two security cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-010", as: "gammamon", under: ["BT21-002"] }],
          hand: [{ card: "BT21-028", as: "siriusmon" }],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("gammamon").topCard.instanceId,
        effectKey: `BT21-010/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gammamon").topCard.cardId === "BT21-028");
    expect(s.perm("gammamon").topCard.instanceId).toBe(s.inst("siriusmon").instanceId);
    expect(s.state.memory).toBe(2);
  });

  it.each(["BT21-002", "BT21-004"])("uses the zero-cost Hero alternate route from %s", async (egg) => {
    const s = setupEngine({
      0: { breeding: { card: egg, as: "heroEgg" }, hand: [{ card: "BT21-010", as: "gammamon" }] },
    });
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("heroEgg").permanentId,
        instanceId: s.inst("gammamon").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("heroEgg").topCard.cardId === "BT21-010");
    expect(s.state.memory).toBe(1);
  });

  it("also qualifies with three differently named Hero Tamers at three security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-010", as: "gammamon", under: ["BT21-002"] },
            { card: "BT21-080", as: "hiro" },
            { card: "BT21-082", as: "takuya" },
            { card: "BT21-083", as: "taiki" },
          ],
          hand: [{ card: "BT21-028", as: "siriusmon" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("gammamon").topCard.instanceId,
        effectKey: `BT21-010/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gammamon").topCard.cardId === "BT21-028");
    expect(s.perm("gammamon").topCard.cardId).toBe("BT21-028");
    expect(s.state.memory).toBe(2);
  });

  it("Q5210: public Offense Training combines with the qualified security branch", async () => {
    const s = await evolveGammamonThroughTraining({ security: ["BT1-001", "BT1-002"] });
    expect(s.perm("gammamon").topCard.cardId).toBe(TRAINING_TARGET);
    expect(s.perm("gammamon").stack.map((card) => card.cardId)).toEqual(["BT21-002", "BT21-010"]);
    expect(s.state.memory).toBe(4);
  });

  it("Q5210: public Offense Training combines with the three-distinct-Hero branch", async () => {
    const s = await evolveGammamonThroughTraining({
      security: ["BT1-001", "BT1-002", "BT1-003"],
      tamers: ["BT21-080", "BT21-082", "BT21-083"],
    });
    expect(s.perm("gammamon").topCard.cardId).toBe(TRAINING_TARGET);
    expect(s.state.memory).toBe(4);
  });

  it("does not let Training target a differently named red Digimon when Siriusmon is absent", async () => {
    const s = await evolveGammamonThroughTraining({
      security: ["BT1-001", "BT1-002"],
      target: "BT21-027",
      rejected: true,
    });
    expect(s.perm("gammamon").topCard.cardId).toBe("BT21-010");
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT21-027")).toBe(true);
  });

  it("does not let Training activate the Siriusmon permission when neither gate is true", async () => {
    const s = await evolveGammamonThroughTraining({
      security: ["BT1-001", "BT1-002", "BT1-003"],
      rejected: true,
    });
    expect(s.perm("gammamon").topCard.cardId).toBe("BT21-010");
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === TRAINING_TARGET)).toBe(true);
  });

  it("does not qualify with three security and only two distinct Hero Tamer names", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-010", as: "gammamon" },
            { card: "BT21-080", as: "hiro1" },
            { card: "BT21-080", as: "hiro2" },
            { card: "BT21-082", as: "takuya" },
          ],
          hand: [{ card: "BT21-028", as: "siriusmon" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("gammamon").topCard.instanceId,
      effectKey: `BT21-010/ir-${EffectTiming.OnDeclaration}-0`,
    });
    expect(s.perm("gammamon").topCard.cardId).toBe("BT21-010");
    expect(s.state.memory).toBe(6);
  });

  it("may decline the permission and inherited +2000 DP expires on the opponent's turn", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-010", as: "gammamon", under: ["BT21-002"] }],
          hand: [{ card: "BT21-028", as: "siriusmon" }],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoDeclineOptional: true },
    );
    declined.state.memory = 6;
    await declined.ready();
    expect(
      declined.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: declined.perm("gammamon").topCard.instanceId,
        effectKey: `BT21-010/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toEqual({ ok: true });
    expect(declined.perm("gammamon").topCard.cardId).toBe("BT21-010");

    const inherited = setupEngine({
      0: { battleArea: [{ card: "BT21-019", as: "host", under: ["BT21-010"] }] },
    });
    await inherited.ready();
    expect(inherited.perm("host").currentDP).toBe(8000);
    inherited.state.turnSeat = 1;
    await advance(inherited.engine).recompute();
    expect(inherited.perm("host").currentDP).toBe(6000);
  });
});
