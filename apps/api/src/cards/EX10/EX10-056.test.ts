import { EffectDuration, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { irNode } from "../../engine/testkit/irNode.js";
import compiled from "./EX10-056.js";
import "../index.js";

const CARD_ID = "EX10-056";

it("rejects a third DigiXros material without spending memory or moving cards", async () => {
  const s = setupEngine({
    0: {
      hand: [
        { card: CARD_ID, as: "played" },
        { card: "EX10-026", as: "firstMaterial" },
        { card: "EX10-027", as: "secondMaterial" },
        { card: "EX10-045", as: "thirdMaterial" },
      ],
    },
  });
  s.state.memory = 9;
  await s.ready();
  const originalHand = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("played").instanceId,
      digiXros: {
        materialInstanceIds: ["firstMaterial", "secondMaterial", "thirdMaterial"].map(
          (alias) => s.inst(alias).instanceId,
        ),
      },
    }).ok,
  ).toBe(false);
  expect(s.state.memory).toBe(9);
  expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(originalHand);
  expect(s.state.players[0]!.battleArea).toHaveLength(0);
});

describe("EX10-056 Bagramon compiled contract", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 5 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon Lord", "Bagra Army"],
    });
  });

  it("records permanent relocation, shared watcher identity, and top-Security trash", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [expect.objectContaining({ kind: "PlaceUnder", position: "bottom", optional: true })],
        }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: [expect.objectContaining({ kind: "PlaceUnder" })],
        }),
        expect.objectContaining({
          trigger: "AllTurns",
          frequency: "OncePerTurn",
          actions: expect.arrayContaining([
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenOneOfYoursDigivolves",
              oncePerTurnKey: "EX10-056/all-turns",
            }),
            expect.objectContaining({
              kind: "SubTrigger",
              event: "onAddDigivolutionCards",
              oncePerTurnKey: "EX10-056/all-turns",
            }),
          ]),
        }),
      ]),
    );
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({ targetIsPermanent: true });
    expect(irNode(compiled.effects?.[2]?.actions?.[0])?.actions?.[0]).toMatchObject({
      kind: "trashSecurityTop",
      controller: "opponent",
      count: 1,
      cost: { kind: "trash" },
    });
  });

  it("places an opposing Digimon under a different opposing permanent at the bottom", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "bagramon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "material" },
            { card: "EX10-026", as: "host", under: [{ card: "BT1-010", as: "existing" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("material").permanentId, s.perm("host").permanentId);
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("bagramon"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("material").instanceId,
      s.inst("existing").instanceId,
    ]);
  });

  it("Q5142-Q5148 pays exactly 2 sources for an opponent placement and shares once-per-turn use", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "bagramon", under: ["BT1-009", "BT1-010", "EX10-026", "EX10-027"] }] },
        1: {
          battleArea: [{ card: "EX10-026", as: "subject", under: [{ card: "BT1-009", as: "added" }] }],
          security: ["BT1-009", "BT1-010", "EX10-026"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("subject").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("added").instanceId],
    });
    await settle(() => s.state.players[1]!.security.length === 2);
    expect(s.perm("bagramon").stack).toHaveLength(2);
    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("subject").permanentId,
    });
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("bagramon").stack).toHaveLength(2);
  });

  it("Q5144 cannot place an opposing Digimon under a host that isn't affected by effects", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "bagramon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "material" },
            { card: "EX10-026", as: "host", under: [{ card: "BT1-010", as: "existing" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    // The only legal host is unaffectable by Digimon effects, so the placement has nowhere to go.
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("host").permanentId,
      "beAffected",
      EffectDuration.Permanent,
      { fromSourceKind: ["Digimon"] },
    );
    const materialId = s.perm("material").permanentId;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("bagramon"));
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(materialId);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("existing").instanceId]);
  });

  it("does not react to its controller adding a digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "bagramon", under: ["BT1-009", "BT1-010"] },
            { card: "EX10-026", as: "own", under: [{ card: "BT1-009", as: "added" }] },
          ],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("own").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("added").instanceId],
    });
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("bagramon").stack).toHaveLength(2);
  });
});
