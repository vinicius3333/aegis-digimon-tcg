import { describe, expect, it } from "vitest";
import { requireCardDefinition, type Permanent, type Seat } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-084.js";
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
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-082", as: "protected", suspended: true }] },
        1: { battleArea: [{ card: "BT1-084", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
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

describe("BT2-082 Diaboromon — KB Q&A rulings", () => {
  function isAttacking(s: ReturnType<typeof setupEngine>): boolean {
    return (s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking;
  }

  function diaboromonTokens(s: ReturnType<typeof setupEngine>, seat: Seat): Permanent[] {
    return s.state.players[seat]!.battleArea.filter((p) => requireCardDefinition(p.topCard.cardId).isToken);
  }

  it("plays a token that is a Digimon named [Diaboromon] (Q1030)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-082", as: "diaboromon" }] } }, { autoAcceptOptional: true });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("diaboromon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => diaboromonTokens(s, 0).length === 1);

    const token = diaboromonTokens(s, 0)[0]!;
    expect(requireCardDefinition(token.topCard.cardId)).toMatchObject({
      nameEn: "Diaboromon",
      kinds: ["Digimon"],
      isToken: true,
    });
    expect(requireCardDefinition(s.perm("diaboromon").topCard.cardId).isToken).toBeFalsy();
  });

  it("may delete a [Diaboromon] token to prevent this Digimon's deletion in battle (Q1031)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-082", as: "diaboromon" }] },
        1: { battleArea: [{ card: "BT1-084", as: "strongerDefender", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const diaboromonId = s.perm("diaboromon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: diaboromonId,
        target: { kind: "permanent", permanentId: s.perm("strongerDefender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => diaboromonTokens(s, 0).length === 1);
    await settle(() => !isAttacking(s) && diaboromonTokens(s, 0).length === 0);

    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toEqual([diaboromonId]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT2-082")).toBe(false);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([s.perm("strongerDefender").permanentId]);
  });

  it("does not activate when a [Diaboromon] token would be deleted in battle (Q1032)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-082", as: "diaboromon" },
            { card: "TOKEN-Diaboromon", as: "token", suspended: true },
            { card: "BT5-084", as: "otherDiaboromon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-084", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    // A wrongful activation for the token would pay its cost with this card, so the board shows it.
    preferred.push(s.perm("otherDiaboromon").permanentId);
    s.state.turnSeat = 1;
    const diaboromonId = s.perm("diaboromon").permanentId;
    const tokenId = s.perm("token").permanentId;
    const otherDiaboromonId = s.perm("otherDiaboromon").permanentId;
    let offeredPrevention = false;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: tokenId },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      if (s.state.pendingDecision?.seat === 0) offeredPrevention = true;
      return !isAttacking(s) && !s.state.players[0]!.battleArea.some((p) => p.permanentId === tokenId);
    });

    expect(offeredPrevention).toBe(false);
    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toEqual([diaboromonId, otherDiaboromonId]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT2-082")).toBe(false);
  });

  it("Omnimon choosing this Diaboromon also deletes the [Diaboromon] token (Q1033)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-025", as: "base" }], hand: [{ card: "BT1-084", as: "omnimon" }] },
        1: {
          battleArea: [
            { card: "BT2-082", as: "diaboromon" },
            { card: "TOKEN-Diaboromon", as: "token" },
            { card: "BT1-011", as: "otherName" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("diaboromon").permanentId);
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([s.perm("otherName").permanentId]);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT2-082")).toBe(true);
  });

  it("may delete a [Diaboromon] token to survive a battle with a Security Digimon (Q1034)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-082", as: "diaboromon" }] },
        1: { security: [{ card: "BT1-084", as: "securityOmnimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const diaboromonId = s.perm("diaboromon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: diaboromonId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => diaboromonTokens(s, 0).length === 1);
    await settle(() => !isAttacking(s) && diaboromonTokens(s, 0).length === 0);

    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toEqual([diaboromonId]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT2-082")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
