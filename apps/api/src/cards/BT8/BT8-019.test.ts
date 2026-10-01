import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-019.js";
import "./BT8-012.js";

describe("BT8-019 Zhuqiaomon", () => {
  it("keeps itself and the opponent's chosen Digimon, deletes all others and gains memory per deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-002", as: "base" },
            { card: "BT1-009", as: "ally" },
          ],
          hand: [{ card: "BT8-019", as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "spared" },
            { card: "BT1-011", as: "deletedOne" },
            { card: "BT1-012", as: "deletedTwo" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-019"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("spared").topCard?.cardId).toBe("BT1-010");
    expect(s.state.memory).toBe(2);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(2);
  });

  it("Q1703 has the opponent choose which of their Digimon survives", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-002", as: "base" }], hand: [{ card: "BT8-019", as: "evolving" }] },
      1: {
        battleArea: [
          { card: "BT1-010", as: "first" },
          { card: "BT1-011", as: "second" },
        ],
      },
    });
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const decision = s.decisions.at(-1)!.req;
    expect(decision.seat).toBe(1);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("second").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("second").permanentId);
  });

  it("Q1706 deletes all other allied Digimon when the opponent has none", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-002", as: "base" },
            { card: "BT1-009", as: "ally" },
          ],
          hand: [{ card: "BT8-019", as: "evolving" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.memory === 2);

    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT8-019");
    expect(s.state.memory).toBe(2);
  });

  it("leaves breeding areas untouched and counts only deletions not prevented by Armor Purge", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-002", as: "base" },
            { card: "BT1-009", as: "ally" },
          ],
          breeding: { card: "BT8-008", as: "ownBreeding" },
          hand: [{ card: "BT8-019", as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "spared" },
            { card: "BT8-012", as: "armor", under: ["BT8-008"] },
          ],
          breeding: { card: "BT8-034", as: "opponentBreeding" },
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("spared").permanentId, s.perm("armor").topCard.instanceId);
    s.state.memory = 6;
    const ownBreedingId = s.state.players[0]!.breeding!.topCard.instanceId;
    const opponentBreedingId = s.state.players[1]!.breeding!.topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.breeding?.topCard.instanceId).toBe(ownBreedingId);
    expect(s.state.players[1]!.breeding?.topCard.instanceId).toBe(opponentBreedingId);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.perm("armor").topCard.cardId).toBe("BT8-008");
    expect(s.state.memory).toBe(2);
  });
});

describe("BT8-019 Zhuqiaomon — KB Q&A rulings", () => {
  function digivolveIntoZhuqiaomon(s: ReturnType<typeof setupEngine>) {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    });
  }

  it("does not delete Digimon in either player's breeding area (Q1704)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-002", as: "base" },
            { card: "BT1-009", as: "ally" },
          ],
          breeding: { card: "BT8-034", as: "ownBreeding" },
          hand: [{ card: "BT8-019", as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "spared" },
            { card: "BT8-034", as: "opponentBattleTwin" },
          ],
          breeding: { card: "BT8-034", as: "opponentBreeding" },
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("spared").permanentId);
    s.state.memory = 6;
    const ownBreedingId = s.perm("ownBreeding").permanentId;
    const opponentBreedingId = s.perm("opponentBreeding").permanentId;

    expect(digivolveIntoZhuqiaomon(s)).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-019"));

    expect(s.state.players[0]!.breeding?.permanentId).toBe(ownBreedingId);
    expect(s.state.players[1]!.breeding?.permanentId).toBe(opponentBreedingId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT8-019"]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("spared").permanentId,
    ]);
    expect(s.state.memory).toBe(3);
  });

  it("does not let the opponent choose a Digimon in their breeding area to spare (Q1705)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-002", as: "base" }], hand: [{ card: "BT8-019", as: "evolving" }] },
      1: {
        battleArea: [
          { card: "BT1-010", as: "first" },
          { card: "BT1-011", as: "second" },
        ],
        breeding: { card: "BT8-034", as: "opponentBreeding" },
      },
    });
    s.state.memory = 6;
    const breedingId = s.perm("opponentBreeding").permanentId;

    expect(digivolveIntoZhuqiaomon(s)).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const decision = s.decisions.at(-1)!.req;
    expect(decision.seat).toBe(1);
    expect(decision.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("first").permanentId, s.perm("second").permanentId]),
    );
    expect(decision.options?.candidateInstanceIds).not.toContain(breedingId);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [breedingId] },
      }),
    ).toEqual(expect.objectContaining({ ok: false }));

    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("first").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("first").permanentId);
    expect(s.state.players[1]!.breeding?.permanentId).toBe(breedingId);
  });

  it("lets either player use Armor Purge to prevent a deletion by this effect (Q1707)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-002", as: "base" },
            { card: "BT8-012", as: "ownArmor", under: ["BT8-008"] },
          ],
          hand: [{ card: "BT8-019", as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "spared" },
            { card: "BT8-012", as: "armor", under: ["BT8-008"] },
            { card: "BT8-012", as: "unarmored" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("spared").permanentId, s.perm("armor").topCard.instanceId);
    s.state.memory = 6;
    const armorId = s.perm("armor").permanentId;
    const unarmoredId = s.perm("unarmored").permanentId;
    const ownArmorId = s.perm("ownArmor").permanentId;

    expect(digivolveIntoZhuqiaomon(s)).toEqual({ ok: true });
    await settle();

    const survivors = s.state.players[1]!.battleArea;
    expect(survivors.map((permanent) => permanent.permanentId).sort()).toEqual(
      [s.perm("spared").permanentId, armorId].sort(),
    );
    expect(survivors.find((permanent) => permanent.permanentId === armorId)!.topCard.cardId).toBe("BT8-008");
    expect(survivors.some((permanent) => permanent.permanentId === unarmoredId)).toBe(false);
    const ownSurvivors = s.state.players[0]!.battleArea;
    expect(ownSurvivors.map((permanent) => permanent.permanentId)).toContain(ownArmorId);
    expect(ownSurvivors.find((permanent) => permanent.permanentId === ownArmorId)!.topCard.cardId).toBe("BT8-008");
    expect(s.state.memory).toBe(2);
  });
});
