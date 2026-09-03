import { describe, expect, it } from "vitest";
import { CardKind, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT10-072.js";

describe("BT10-072 Soundbirdmon", () => {
  it("restricts Save to your Tamers and inherited memory to effect-driven stack trash", () => {
    const save = compiled.effects.find(({ trigger }) => trigger === "OnDeletion");
    expect(save?.actions[0]).toMatchObject({
      underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
    });
    const attack = compiled.effects.find(({ trigger }) => trigger === "WhenAttacking");
    expect(attack?.actions[0]).toMatchObject({
      cost: { underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true } },
    });
    const inherited = compiled.effects.find(({ isInherited }) => isInherited);
    expect(inherited?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDigivolutionCardsDiscardedBatch",
      requireByEffect: true,
    });
  });

  it("marks the placement cost as optional and aborts Draw 1 when declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-072", as: "soundbirdmon" },
            { card: "BT12-088", as: "tamer" },
          ],
          hand: [{ card: "BT10-071", as: "purpleMaterial" }],
          deck: [{ card: "BT1-009", as: "top" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("soundbirdmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("purpleMaterial").instanceId)).toBe(true);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("top").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("places one purple Digimon from hand under the chosen Tamer, then draws exactly 1", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-072", as: "soundbirdmon" },
            { card: "BT12-088", as: "chosenTamer" },
            { card: "BT12-088", as: "otherTamer" },
          ],
          hand: [
            { card: "BT10-071", as: "purpleMaterial" },
            { card: "BT1-009", as: "redDigimon" },
          ],
          deck: [
            { card: "BT1-009", as: "drawn" },
            { card: "BT1-009", as: "notDrawn" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const purpleId = s.inst("purpleMaterial").instanceId;
    const redId = s.inst("redDigimon").instanceId;
    preferred.push(purpleId, s.perm("chosenTamer").permanentId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("soundbirdmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("chosenTamer").stack.some(({ instanceId }) => instanceId === purpleId) &&
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId),
    );

    expect(s.perm("otherTamer").stack.some(({ instanceId }) => instanceId === purpleId)).toBe(false);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === redId)).toBe(true);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("notDrawn").instanceId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("does not draw when no purple Digimon can pay the attack cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-072", as: "soundbirdmon" },
          { card: "BT12-088", as: "tamer" },
        ],
        hand: [{ card: "BT1-009", as: "redDigimon" }],
        deck: [{ card: "BT1-009", as: "top" }],
      },
      1: { security: ["BT1-001"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("soundbirdmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("tamer").stack).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("uses Save to place itself under one of its Tamers on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-072", as: "soundbirdmon" },
            { card: "BT10-093", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const soundbirdmonId = s.perm("soundbirdmon").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("soundbirdmon").permanentId], "byEffect")).toBe(1);
    await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === soundbirdmonId));

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === soundbirdmonId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("never uses a Tamer token as the Save host", async () => {
    const tokenDefinition = getCardDefinition("TOKEN-Petrification-Token");
    expect(tokenDefinition).toBeDefined();
    const originalKinds = tokenDefinition!.kinds;
    tokenDefinition!.kinds = [CardKind.Tamer];
    try {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT10-072", as: "soundbirdmon" },
              { card: "TOKEN-Petrification-Token", as: "tokenTamer" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const soundbirdmonId = s.perm("soundbirdmon").topCard.instanceId;

      await advance(s.engine).verb.deletePermanent([s.perm("soundbirdmon").permanentId], "byEffect");
      await settle(() => s.state.pendingDecision === undefined);

      expect(s.perm("tokenTamer").stack).toHaveLength(0);
      expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === soundbirdmonId)).toBe(true);
    } finally {
      tokenDefinition!.kinds = originalKinds;
    }
  });

  it("never uses a Tamer token as the attack placement host", async () => {
    const tokenDefinition = getCardDefinition("TOKEN-Petrification-Token");
    expect(tokenDefinition).toBeDefined();
    const originalKinds = tokenDefinition!.kinds;
    tokenDefinition!.kinds = [CardKind.Tamer];
    try {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT10-072", as: "soundbirdmon" },
              { card: "TOKEN-Petrification-Token", as: "tokenTamer" },
            ],
            hand: [{ card: "BT10-071", as: "purpleMaterial" }],
            deck: [{ card: "BT1-009", as: "top" }],
          },
          1: { security: ["BT1-001"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("soundbirdmon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());

      expect(s.perm("tokenTamer").stack).toHaveLength(0);
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("purpleMaterial").instanceId)).toBe(
        true,
      );
      expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("top").instanceId)).toBe(true);
    } finally {
      tokenDefinition!.kinds = originalKinds;
    }
  });

  it("does not Save under a Digimon when no Tamer is available", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-072", as: "soundbirdmon" },
            { card: "BT10-071", as: "digimon" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const soundbirdmonId = s.inst("soundbirdmon").instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("soundbirdmon").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === soundbirdmonId)).toBe(false);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === soundbirdmonId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("its inherited source gains owner memory only when trashed by an effect on the opponent's turn", async () => {
    const opponentTurn = setupEngine({
      0: {
        battleArea: [{ card: "BT10-075", as: "host", under: [{ card: "BT10-072", as: "source" }] }],
      },
    });
    opponentTurn.state.turnSeat = 1;
    opponentTurn.state.memory = 0;
    await advance(opponentTurn.engine).verb.trashDigivolutionCards(
      opponentTurn.perm("host").permanentId,
      [opponentTurn.inst("source").instanceId],
      1,
    );
    await settle(() => opponentTurn.state.memory === -1);
    expect(opponentTurn.state.memory).toBe(-1);

    const ownTurn = setupEngine({
      0: {
        battleArea: [{ card: "BT10-075", as: "host", under: [{ card: "BT10-072", as: "source" }] }],
      },
    });
    ownTurn.state.memory = 0;
    await advance(ownTurn.engine).verb.trashDigivolutionCards(
      ownTurn.perm("host").permanentId,
      [ownTurn.inst("source").instanceId],
      1,
    );
    expect(ownTurn.state.memory).toBe(0);
    assertNoLoudGap(opponentTurn);
    assertNoLoudGap(ownTurn);
  });

  it("does not react to an unattributed stack discard event", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "BT10-072", as: "source" }] }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("onDigivolutionCardsDiscardedBatch", {
      subjectPermanentId: s.perm("host").permanentId,
      trashedDigivolutionInstanceIds: [s.inst("source").instanceId],
    });
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });
});
