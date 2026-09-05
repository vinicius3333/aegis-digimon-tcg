import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST16-15.js";

describe("ST16-15 Lament of Friendship", () => {
  it("grants the On Deletion replay effect to the chosen own Garurumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST16-14", { card: "ST16-08", as: "garurumon" }],
          hand: [{ card: "ST16-15", as: "option" }],
          trash: [{ card: "ST16-02", as: "recover" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        (
          s.engine as unknown as { continuous: { listCustomEffectGrants(): readonly unknown[] } }
        ).continuous.listCustomEffectGrants().length > 0,
    );

    const engine = s.engine as unknown as {
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };
    expect(engine.continuous.listCustomEffectGrants()).toContainEqual(
      expect.objectContaining({
        instanceId: s.perm("garurumon").topCard!.instanceId,
        token: "OnDeletionPlaySelfMandatory",
      }),
    );
  });

  it("plays the deleted Digimon after the granted Garurumon digivolves (Q824)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST16-14", { card: "ST16-08", as: "garurumon" }],
          hand: [
            { card: "ST16-15", as: "option" },
            { card: "BT10-079", as: "nextForm" },
          ],
          trash: [{ card: "ST16-02", as: "recover" }],
          deck: [{ card: "BT1-001" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("recover").instanceId));
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("garurumon").permanentId,
        instanceId: s.inst("nextForm").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("garurumon").topCard.cardId === "BT10-079");

    await advance(s.engine).verb.deletePermanent([s.perm("garurumon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-079"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-079")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT10-079")).toBe(false);
  });

  it("plays the granted Garurumon after it loses a battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST16-08", as: "garurumon" }],
          hand: [{ card: "ST16-15", as: "option" }],
          trash: [{ card: "ST16-02", as: "recover" }],
        },
        1: { battleArea: [{ card: "ST16-11", as: "opponent", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        (
          s.engine as unknown as { continuous: { listCustomEffectGrants(): readonly unknown[] } }
        ).continuous.listCustomEffectGrants().length > 0,
    );

    const originalPermanentId = s.perm("garurumon").permanentId;
    const originalInstanceId = s.perm("garurumon").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("garurumon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((p) => p.permanentId === originalPermanentId) &&
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === originalInstanceId),
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === originalPermanentId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("opponent").topCard.cardId).toBe("ST16-11");
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === originalInstanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "ST16-08")).toBe(false);
  });

  it("activates its complete main effect from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "ST16-15", as: "option", faceUp: true }],
          battleArea: [{ card: "ST16-08", as: "garurumon" }],
          trash: [{ card: "ST16-02", as: "recover" }],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("recover").instanceId)).toBe(true);
    const grants = (
      s.engine as unknown as {
        continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
      }
    ).continuous.listCustomEffectGrants();
    expect(grants).toContainEqual(
      expect.objectContaining({
        instanceId: s.perm("garurumon").topCard.instanceId,
        token: "OnDeletionPlaySelfMandatory",
      }),
    );
  });
});
