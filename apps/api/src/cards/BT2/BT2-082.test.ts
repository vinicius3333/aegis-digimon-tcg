import { describe, expect, it } from "vitest";
import { requireCardDefinition, type Permanent, type Seat } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-082.js";

describe("BT2-082 Diaboromon", () => {
  it("plays a Diaboromon Token when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-082", as: "diaboromon" }] } }, { autoAcceptOptional: true });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("diaboromon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    const token = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId.includes("TOKEN"))!;
    const definition = requireCardDefinition(token.topCard.cardId);
    expect(definition).toMatchObject({
      nameEn: "Diaboromon",
      level: 6,
      dp: 3000,
      playCost: 14,
      isToken: true,
    });
    expect(definition.colors).toContain("White");
    expect(definition.forms).toEqual(["Mega"]);
    expect(definition.attributes).toEqual(["Unknown"]);
    expect(definition.types).toEqual(["Unidentified"]);
  });

  it("may decline to play a token when attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-082", as: "diaboromon" }] },
      1: { security: [{ card: "BT1-001", as: "security" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("diaboromon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("may delete another Diaboromon to survive deletion in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-082", as: "protected", suspended: true },
            { card: "BT5-084", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT1-084", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const protectedId = s.perm("protected").permanentId;
    const costId = s.perm("cost").permanentId;
    await advance(s.engine).recompute();
    expect(advance(s.engine).ledgers.subTriggers.replacementsFor("wouldBeDeleted")).toHaveLength(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("protected").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((p) => p.permanentId === costId) &&
        !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === protectedId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT5-084")).toBe(true);
  });

  it("may delete a Diaboromon Token to survive deletion in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-082", as: "protected", suspended: true }] },
      1: { battleArea: [{ card: "BT1-084", as: "attacker" }] },
    });
    const token = await (
      s.engine as unknown as {
        primitives: { playToken(seat: Seat, name: string, opts: { payCost: boolean }): Promise<Permanent | undefined> };
      }
    ).primitives.playToken(0, "Diaboromon", { payCost: false });
    s.state.turnSeat = 1;
    const protectedId = s.perm("protected").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: protectedId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((p) => p.permanentId === token!.permanentId) &&
        !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === protectedId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === token!.topCard.instanceId)).toBe(false);
  });

  it("does not prevent deletion by an effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-082", as: "source" },
            { card: "BT5-084", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceInstanceId = s.perm("source").topCard.instanceId;
    const otherInstanceId = s.perm("other").topCard.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === sourceInstanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === sourceInstanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === otherInstanceId)).toBe(true);
  });
});
