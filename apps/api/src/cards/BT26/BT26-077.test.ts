import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-077.js";
import "../index.js";

describe("BT26-077 compiled behavior", () => {
  it("proves the alternate evolution, intrinsic keywords, shared once-per-turn play, and highest-cost deletion", () => {
    expect(getCardDefinition("BT26-077")).toMatchObject({
      nameEn: "Reapermon",
      colors: ["Purple", "Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      types: ["Cyborg", "DM", "Ver.3"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["DM"], cost: 3, isAlternate: true }]);
    expect(compiled.keywords).toEqual([
      expect.objectContaining({ keyword: "SecurityAttack", amount: 1 }),
      expect.objectContaining({ keyword: "Execute" }),
      expect.objectContaining({ keyword: "Fragment", amount: 2 }),
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "bt26-077-play-ver3",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["trash"],
            payCost: false,
            optional: true,
            target: { filter: { playCostLte: 6, nameOrTrait: [{ tokens: ["Ver.3"], match: "trait" }] } },
          },
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      actions: [
        {
          kind: "Delete",
          target: {
            count: 1,
            filter: { controller: "opponent", kind: ["Digimon", "Tamer"], superlative: "highestPlayCost" },
          },
        },
      ],
    });
  });

  it("digivolves for 3 from an off-color level-5 DM Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-043", as: "greenDmBase" }],
        hand: [{ card: "BT26-077", as: "reapermon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenDmBase").permanentId,
        instanceId: s.inst("reapermon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greenDmBase").topCard.cardId === "BT26-077");

    expect(s.state.memory).toBe(0);
  });

  it("rejects the alternate evolution from a level-5 Digimon without the DM trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-074", as: "nonDmBase" }],
        hand: [{ card: "BT26-077", as: "reapermon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("nonDmBase").permanentId,
        instanceId: s.inst("reapermon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
  });

  it("raises the printed play-cost ceiling only for each face-down card in this stack", () => {
    const action = compiled.effects.find((effect) => effect.trigger === "OnPlay")!.actions[0];
    expect(irNode(action).playCostCeiling).toEqual({
      base: 6,
      raise: 1,
      per: 1,
      filter: {},
      unit: "selfFaceDownDigivolutionCards",
    });
  });

  it("publicly plays an eligible Ver.3 Digimon from trash on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-077", as: "reapermon" }], trash: [{ card: "BT26-040", as: "ver3" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("reapermon"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-040");
  });

  it("raises the ceiling only for this Digimon's face-down digivolution cards", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-077",
              as: "reapermon",
              under: [
                { card: "BT1-001", as: "ownFaceDown", faceUp: false },
                { card: "BT1-002", as: "ownFaceUp", faceUp: true },
              ],
            },
            {
              card: "BT1-009",
              as: "otherStack",
              under: [{ card: "BT1-003", as: "otherFaceDown", faceUp: false }],
            },
          ],
          trash: [
            { card: "BT26-055", as: "cost7Ver3" },
            { card: "EX9-031", as: "cost8Ver3" },
            { card: "BT26-074", as: "cost7NonVer3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost7Ver3").instanceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("reapermon"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT26-055");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX9-031", "BT26-074"]),
    );
  });

  it("shares one use across On Play, When Digivolving, and When Attacking", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-077", as: "reapermon" }],
          trash: [
            { card: "BT26-040", as: "firstVer3" },
            { card: "BT26-040", as: "secondVer3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("firstVer3").instanceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("reapermon"));
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("reapermon"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("reapermon"));

    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "BT26-040")).toHaveLength(1);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("secondVer3").instanceId);
  });

  it("uses Execute to attack an unsuspended Digimon and Fragment 2 to survive its self-deletion", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-077",
              as: "reapermon",
              under: [
                { card: "BT1-001", as: "fragmentOne" },
                { card: "BT1-002", as: "fragmentTwo" },
              ],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "executeTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("executeTarget").permanentId);
    await s.ready();

    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    await settle(() => s.perm("reapermon").stack.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("reapermon").permanentId,
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("fragmentOne").instanceId, s.inst("fragmentTwo").instanceId]),
    );
  });

  it("performs 2 security checks with its intrinsic Security A. +1", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-077", as: "reapermon" }] },
      1: { security: ["BT1-001", "BT1-002"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("reapermon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-001", "BT1-002"]),
    );
  });

  it("deletes exactly 1 opposing Digimon or Tamer tied for the highest play cost", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-077", as: "reapermon" }] },
        1: {
          battleArea: [
            { card: "BT26-040", as: "highestDigimon" },
            { card: "AD1-020", as: "highestTamer" },
            { card: "BT1-009", as: "lowerDigimon" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("highestTamer").permanentId);
    const highestTamerId = s.perm("highestTamer").permanentId;
    const highestDigimonId = s.perm("highestDigimon").permanentId;
    const lowerDigimonId = s.perm("lowerDigimon").permanentId;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("reapermon").permanentId], "byEffect")).toBe(1);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(highestTamerId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual(
      expect.arrayContaining([highestDigimonId, lowerDigimonId]),
    );
  });
});
