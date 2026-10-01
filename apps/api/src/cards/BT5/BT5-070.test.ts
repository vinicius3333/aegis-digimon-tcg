import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup, type SeatSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT5-070.js";
import "../BT14/BT14-062.js";
describe("BT5-070 MetalGarurumon", () => {
  it("Digi-Bursts 2 to delete a play-cost-6 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-013",
              under: [
                { card: "BT1-010", as: "sourceA" },
                { card: "BT1-019", as: "sourceB" },
              ],
              as: "base",
            },
          ],
          hand: [{ card: "BT5-070", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    const player = s.state.players[0]!;
    const opponent = s.state.players[1]!;
    expect(opponent.trash.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(true);
    expect(player.trash.some((card) => card.instanceId === s.inst("sourceA").instanceId)).toBe(true);
    expect(player.trash.some((card) => card.instanceId === s.inst("sourceB").instanceId)).toBe(true);
    expect(s.perm("base").stack).toHaveLength(1);
    expect(s.perm("base").stack[0]?.cardId).toBe("BT10-013");
  });
  it("trashes top security when no Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-013", under: ["BT1-010"], as: "base" }],
          hand: [{ card: "BT5-070", as: "evolving" }],
        },
        1: { security: [{ card: "BT1-011", as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opp = s.state.players[1]!;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opp.security.length === 0);
    expect(opp.trash.some((c) => c.instanceId === s.inst("security").instanceId)).toBe(true);
  });
  it("does not delete a Digimon above play cost 6", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-013", under: ["BT1-010"], as: "base" }],
          hand: [{ card: "BT5-070", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT5-069", as: "expensive" }], security: [{ card: "BT1-011", as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opp = s.state.players[1]!;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opp.security.length === 0);
    expect(s.perm("expensive")).toBeDefined();
    expect(opp.trash.some((c) => c.instanceId === s.inst("security").instanceId)).toBe(true);
  });

  it("may decline Digi-Burst without deleting or trashing security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-013", under: ["BT1-010", "BT1-019"], as: "base" }],
          hand: [{ card: "BT5-070", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target" }], security: [{ card: "BT1-011", as: "security" }] },
      },
      { autoDeclineOptional: true },
    );
    const opponent = s.state.players[1]!;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 0 && s.state.players[1]!.battleArea.length === 1);
    expect(opponent.battleArea).toHaveLength(1);
    expect(opponent.security).toHaveLength(1);
    expect(s.perm("base").stack).toHaveLength(3);
  });

  it("can choose a deletion-immune cost-6 Digimon and then trash security", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-013", under: ["BT1-010", "BT1-019"], as: "base" }],
          hand: [{ card: "BT5-070", as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: "BT14-062", as: "protected" },
            { card: "BT1-019", as: "unprotected" },
          ],
          security: [{ card: "BT1-011", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").topCard!.instanceId);
    const opponent = s.state.players[1]!;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.security.length === 0);
    expect(opponent.battleArea).toHaveLength(2);
    expect(s.perm("protected").topCard?.cardId).toBe("BT14-062");
    expect(opponent.trash.some((card) => card.instanceId === s.inst("security").instanceId)).toBe(true);
  });

  it("publishes Reboot and unsuspends during the opponent's unsuspend phase", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-070", as: "metalGarurumon", suspended: true }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("metalGarurumon"), "Reboot")).toBe(true);

    await advance(s.engine).runTurn(1);

    expect(s.perm("metalGarurumon").isSuspended).toBe(false);
  });
});

describe("BT5-070 MetalGarurumon — KB Q&A rulings", () => {
  const setupDigiBurst = (opponent: SeatSpec, autoSelectCards: boolean) =>
    setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-013", under: ["BT1-010", "BT1-019"], as: "base" }],
          hand: [{ card: "BT5-070", as: "evolving" }],
        },
        1: { security: [{ card: "BT1-011", as: "security" }], ...opponent },
      },
      { autoAcceptOptional: true, autoSelectCards },
    );

  const digivolve = (s: EngineSetup) => {
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
  };

  const inTrash = (s: EngineSetup, seat: 0 | 1, alias: string) =>
    s.state.players[seat]!.trash.some((card) => card.instanceId === s.inst(alias).instanceId);

  const pendingDecision = (s: EngineSetup, kind: "selectCards" | "chooseTargets") => {
    const request = s.decisions.at(-1)?.req;
    expect(request?.kind).toBe(kind);
    expect(s.state.pendingDecision?.decisionId).toBe(request!.decisionId);
    return request!;
  };

  const payDigiBurst = async (s: EngineSetup) => {
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const cost = pendingDecision(s, "selectCards");
    expect(cost.options?.purpose).toBe("cost");
    const [first, second] = cost.options!.candidateInstanceIds!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: cost.decisionId,
        response: { kind: "selectCards", instanceIds: [first!, second!] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    return pendingDecision(s, "chooseTargets");
  };

  const chooseDeletionTarget = (s: EngineSetup, decisionId: string, alias: string) =>
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId,
      response: { kind: "chooseTargets", instanceIds: [s.perm(alias).permanentId] },
    });

  it("trashes the top security card only when there was no Digimon it could delete (Q1345)", async () => {
    const noValidTarget = setupDigiBurst({ battleArea: [{ card: "BT5-069", as: "expensive" }] }, true);
    digivolve(noValidTarget);
    await settle(() => inTrash(noValidTarget, 1, "security"));
    expect(noValidTarget.perm("expensive").topCard?.cardId).toBe("BT5-069");
    expect(noValidTarget.state.players[1]!.security).toHaveLength(0);

    const undeletableTarget = setupDigiBurst({ battleArea: [{ card: "BT14-062", as: "protected" }] }, true);
    digivolve(undeletableTarget);
    await settle(() => inTrash(undeletableTarget, 1, "security"));
    expect(undeletableTarget.perm("protected").topCard?.cardId).toBe("BT14-062");
    expect(undeletableTarget.state.players[1]!.security).toHaveLength(0);

    const deletableTarget = setupDigiBurst({ battleArea: [{ card: "BT1-019", as: "target" }] }, true);
    digivolve(deletableTarget);
    await settle(() => inTrash(deletableTarget, 1, "target"));
    await settle();
    expect(deletableTarget.state.players[1]!.security).toHaveLength(1);
    expect(inTrash(deletableTarget, 1, "security")).toBe(false);
  });

  it("must delete a play-cost-6-or-less Digimon instead of skipping it to trash security (Q1346)", async () => {
    const s = setupDigiBurst(
      {
        battleArea: [
          { card: "BT1-019", as: "target" },
          { card: "BT1-019", as: "other" },
        ],
      },
      false,
    );
    digivolve(s);
    const deletion = await payDigiBurst(s);
    expect(deletion.options?.min).toBe(1);
    expect(deletion.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("target").permanentId, s.perm("other").permanentId]),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: deletion.decisionId,
        response: { kind: "chooseTargets", instanceIds: [] },
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.pendingDecision?.decisionId).toBe(deletion.decisionId);

    expect(chooseDeletionTarget(s, deletion.decisionId, "target")).toEqual({ ok: true });
    await settle(() => inTrash(s, 1, "target"));
    await settle();
    expect(s.perm("other").topCard?.cardId).toBe("BT1-019");
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("may choose a Digimon that can't be deleted by opponent effects and then trash security (Q1347)", async () => {
    const opponent: SeatSpec = {
      battleArea: [
        { card: "BT14-062", as: "protected" },
        { card: "BT1-019", as: "unprotected" },
      ],
    };
    const s = setupDigiBurst(opponent, false);
    digivolve(s);
    const deletion = await payDigiBurst(s);
    expect(deletion.options?.candidateInstanceIds).toContain(s.perm("protected").permanentId);
    expect(chooseDeletionTarget(s, deletion.decisionId, "protected")).toEqual({ ok: true });
    await settle(() => inTrash(s, 1, "security"));
    expect(s.perm("protected").topCard?.cardId).toBe("BT14-062");
    expect(s.perm("unprotected").topCard?.cardId).toBe("BT1-019");
    expect(s.state.players[1]!.security).toHaveLength(0);

    const control = setupDigiBurst(opponent, false);
    digivolve(control);
    const controlDeletion = await payDigiBurst(control);
    expect(chooseDeletionTarget(control, controlDeletion.decisionId, "unprotected")).toEqual({ ok: true });
    await settle(() => inTrash(control, 1, "unprotected"));
    await settle();
    expect(control.state.players[1]!.security).toHaveLength(1);
  });
});
