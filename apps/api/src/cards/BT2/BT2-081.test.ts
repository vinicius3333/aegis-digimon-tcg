import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../ST6/ST6-04.js";
import "./BT2-081.js";

describe("BT2-081 MetalGarurumon", () => {
  it("plays a purple level 3 from trash without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-081", as: "metal" }],
          trash: [{ card: "BT2-067", as: "revived" }],
        },
        1: { security: [{ card: "BT1-001", as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metal").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("revived").instanceId),
    );

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("offers only purple level 3 Digimon from trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-081", as: "metal" }],
        trash: [
          { card: "BT2-067", as: "eligible" },
          { card: "ST6-04", as: "eligibleOnPlay" },
          { card: "BT2-071", as: "purpleLevelFour" },
          { card: "BT2-034", as: "yellowLevelFour" },
          { card: "ST6-15", as: "purpleOption" },
        ],
      },
      1: { security: [{ card: "BT1-001", as: "security" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metal").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === selection.decisionId)!.req;

    expect(request.options!.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.inst("eligible").instanceId, s.inst("eligibleOnPlay").instanceId]),
    );
    expect(request.options!.candidateInstanceIds).toHaveLength(2);
    expect(request.options).toMatchObject({ min: 1, max: 1 });
  });

  it("suppresses the revived Digimon's On Play effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-081", as: "metal" }],
          trash: [
            { card: "ST6-04", as: "dracmon" },
            { card: "ST6-15", as: "option" },
          ],
        },
        1: { security: [{ card: "BT1-001", as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metal").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash[0]!.instanceId).toBe(s.inst("option").instanceId);
  });

  it("may decline to play a Digimon from trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-081", as: "metal" }],
        trash: [{ card: "BT2-067", as: "candidate" }],
      },
      1: { security: [{ card: "BT1-001", as: "security" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metal").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash[0]!.instanceId).toBe(s.inst("candidate").instanceId);
  });
});
