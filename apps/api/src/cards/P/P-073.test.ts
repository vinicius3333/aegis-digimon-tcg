import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-073.js";

type EngineInternals = {
  primitives: { deletePermanent(ids: string[], cause: "byEffect"): Promise<unknown> };
};

describe("P-073 WereGarurumon: Sagittarius Mode", () => {
  it("digivolves from a WereGarurumon-named Digimon for cost 0", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-040", as: "weregarurumon" }],
        hand: [{ card: "P-073", as: "source" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("weregarurumon").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("weregarurumon").topCard?.cardId === "P-073");

    expect(s.state.memory).toBe(10);
  });

  it("returns exactly 2 opponent level 3 Digimon when digivolving with a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-010", as: "base" },
            { card: "BT1-089", as: "tamer" },
          ],
          hand: [{ card: "P-073", as: "source" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level-3-a" },
            { card: "BT1-010", as: "level-3-b" },
            { card: "AD1-001", as: "level-4" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const returnedIds = [s.perm("level-3-a").topCard!.instanceId, s.perm("level-3-b").topCard!.instanceId];
    const level4Id = s.perm("level-4").permanentId;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => returnedIds.every((id) => s.state.players[1]!.hand.some((c) => c.instanceId === id)));

    expect(returnedIds.every((id) => s.state.players[1]!.hand.some((c) => c.instanceId === id))).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === level4Id)).toBe(true);
  });

  it("lets the UI choose only 1 target for the up-to-2 return", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-010", as: "base" },
            { card: "BT1-089", as: "tamer" },
          ],
          hand: [{ card: "P-073", as: "source" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "chosen" },
            { card: "BT1-010", as: "unchosen" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    const chosenCardId = s.perm("chosen").topCard.instanceId;
    const unchosenPermanentId = s.perm("unchosen").permanentId;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.at(-1)!.req;
    expect(decision.options?.min).toBe(0);
    expect(decision.options?.max).toBe(2);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("chosen").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === chosenCardId));

    expect(s.state.players[1]!.hand.some((card) => card.instanceId === chosenCardId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === unchosenPermanentId)).toBe(
      true,
    );
  });

  it("does not return level 3 Digimon without a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-010", as: "base" }],
          hand: [{ card: "P-073", as: "source" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(true);
  });

  it("prevents battle deletion by trashing 2 same-level digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-044",
              as: "defender",
              dp: 7000,
              suspended: true,
              under: [{ card: "BT1-009", as: "level-3-a" }, { card: "BT1-010", as: "level-3-b" }, "P-073"],
            },
          ],
        },
        1: { battleArea: [{ card: "AD1-004", as: "attacker", dp: 12000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const defenderId = s.perm("defender").permanentId;
    const paidIds = [s.inst("level-3-a").instanceId, s.inst("level-3-b").instanceId];
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => paidIds.every((id) => s.state.players[0]!.trash.some((c) => c.instanceId === id)));

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === defenderId)).toBe(true);
    expect(paidIds.every((id) => s.state.players[0]!.trash.some((c) => c.instanceId === id))).toBe(true);
  });

  it("cannot prevent battle deletion with two different-level digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-044",
              as: "defender",
              dp: 7000,
              suspended: true,
              under: ["BT1-009", "AD1-001", "P-073"],
            },
          ],
        },
        1: { battleArea: [{ card: "AD1-004", as: "attacker", dp: 12000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const defenderId = s.perm("defender").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === defenderId));

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === defenderId)).toBe(false);
  });

  it("does not prevent deletion by an effect even with a valid same-level pair", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-044", as: "host", under: ["BT1-009", "BT1-010", "P-073"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    await s.ready();

    await (s.engine as unknown as EngineInternals).primitives.deletePermanent([hostId], "byEffect");
    await settle();

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(4);
  });
});
