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
    // One trigger window resolves for the simultaneous batch, but the printed
    // "for each ... deleted" scaling counts both opposing Digimon.
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
