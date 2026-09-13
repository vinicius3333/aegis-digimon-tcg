import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-04 Wendigomon", () => {
  it("deletes an own level 3 Terriermon and may play it back from trash for free", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST17-04", as: "wendigomon" }],
          battleArea: [{ card: "ST17-02", as: "terriermon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const originalTerriermonInstanceId = s.inst("terriermon").instanceId;
    const originalTerriermonPermanentId = s.perm("terriermon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("wendigomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(
          (perm) =>
            perm.topCard.instanceId === originalTerriermonInstanceId &&
            perm.permanentId !== originalTerriermonPermanentId,
        ),
    );

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-04")).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === originalTerriermonInstanceId),
    ).toBe(true);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === originalTerriermonInstanceId)).toBe(false);
  });

  it("can refuse the optional revival after the deleted card reaches trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST17-04", as: "wendigomon" }],
          battleArea: [{ card: "ST17-02", as: "terriermon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const deletedInstanceId = s.inst("terriermon").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wendigomon").instanceId })).toEqual({
      ok: true,
    });
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
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-04")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === deletedInstanceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === deletedInstanceId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("gives its suspended host +1000 DP through the inherited effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-07", as: "host", suspended: true, under: ["ST17-04"] }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(8000);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("does not unlock revival when the preceding deletion removed an opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST17-04", as: "wendigomon" }],
          trash: [{ card: "ST17-02", as: "revival" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponentTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wendigomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-04")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "ST17-02")).toBe(true);
  });

  it("unlocks revival after deleting an unrelated own level 3 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST17-04", as: "wendigomon" }],
          battleArea: [{ card: "BT1-009", as: "unrelatedOwn" }],
          trash: [{ card: "ST17-02", as: "revival" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wendigomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-02"),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-04")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-02")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "ST17-02")).toBe(false);
  });

  it("limits deletion to level 3 or lower and supports the alternate level-3 Terriermon evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST17-02", as: "base" },
          { card: "BT1-009", as: "level3" },
        ],
        hand: [{ card: "ST17-04", as: "wendigomon" }],
        deck: ["BT1-010"],
      },
      1: { battleArea: [{ card: "BT1-014", as: "level4" }] },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wendigomon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.perm("base").topCard.cardId === "ST17-04");
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["ST17-02"]);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard.cardId === "BT1-014")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "BT1-009")).toBe(false);
  });
});
