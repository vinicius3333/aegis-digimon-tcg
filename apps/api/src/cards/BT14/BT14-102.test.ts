import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import {
  assertNoLoudGap,
  drainMicrotasks,
  settle,
  setupEngine,
  type PermanentSpec,
} from "../../engine/testkit/harness.js";
import { compiled } from "./BT14-102.js";
import "../index.js";

describe("BT14-102", () => {
  it("offers deleting itself to place a Virus Digimon in security or give -5000 DP", () => {
    const modal = compiled.effects?.[0]?.actions[0];
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenAttacking" });
    if (modal?.kind !== "Modal") throw new Error("BT14-102 must compile a Modal action");
    expect(modal).toMatchObject({
      kind: "Modal",
      choose: 1,
      cost: { kind: "deleteOwn" },
      options: [[{ kind: "SecurityManipulation", op: "placeAsSecurity" }], [{ kind: "ModifyDP", amount: -5000 }]],
    });
  });
  it("places itself in security on deletion and can hatch with a Tamer", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "SecurityManipulation" }, { kind: "Hatch", condition: { kind: "youHave" } }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [{ kind: "SecurityManipulation", from: ["hand"] }],
    });
  });

  it("naturally deletes itself for modal branch 0, places the Virus at security bottom, and hatches", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-102", as: "angemon" },
            { card: "BT1-085", as: "tamer" },
          ],
          security: ["BT1-009"],
          eggDeck: [{ card: "BT14-003", as: "egg" }],
        },
        1: {
          battleArea: [{ card: "BT14-069", as: "virus" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    const angemonId = s.perm("angemon").permanentId;
    const virusId = s.perm("virus").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: angemonId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT14-102"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === angemonId)).toBe(false);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009", "BT14-102"]);
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("egg").instanceId);
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === virusId)).toBe(false);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-009", "BT14-069"]);
    assertNoLoudGap(s);
  });

  it("naturally deletes itself for modal branch 1 and gives the chosen opponent Digimon -5000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-102", as: "angemon" }],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT14-041", as: "target" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    const angemonId = s.perm("angemon").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: angemonId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT14-102"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === angemonId)).toBe(false);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009", "BT14-102"]);
    expect(s.perm("target").currentDP).toBe(7000);
    expect(observe(s.engine).isAttacking()).toBe(false);
    assertNoLoudGap(s);
  });

  it("places itself even when the Tamer-conditioned hatch cannot use an occupied breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-102", as: "angemon" },
            { card: "BT1-085", as: "tamer" },
          ],
          breeding: { card: "BT14-001", as: "occupant" },
          eggDeck: [{ card: "BT14-003", as: "egg" }],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT14-069", as: "virus" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    const angemonId = s.perm("angemon").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: angemonId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT14-102"));

    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009", "BT14-102"]);
    expect(s.perm("occupant").topCard?.cardId).toBe("BT14-001");
    expect(s.state.players[0]!.eggDeck).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("naturally inherits the hand-to-security placement when a host loses a security battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-041", as: "host", under: ["BT14-102"] }],
          hand: [{ card: "BT14-035", as: "eligible" }],
          security: ["BT1-009"],
        },
        1: { security: [{ card: "BT1-084", as: "securityOmnimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT14-035"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009", "BT14-035"]);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT14-035")).toBe(false);
    assertNoLoudGap(s);
  });
});

describe("BT14-102 Angemon — KB Q&A rulings", () => {
  async function attackAndDeleteAngemon(breeding?: PermanentSpec) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-102", as: "angemon" },
            { card: "BT1-085", as: "tamer" },
          ],
          ...(breeding === undefined ? {} : { breeding }),
          eggDeck: [{ card: "BT14-003", as: "egg" }],
          security: ["BT1-009"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    const angemonId = s.perm("angemon").permanentId;
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: angemonId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT14-102"));
    await drainMicrotasks();
    return { s, angemonId };
  }

  it("deletes itself for its [When Attacking] effect even when the opponent has no Digimon (Q2485)", async () => {
    const { s, angemonId } = await attackAndDeleteAngemon();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === angemonId)).toBe(false);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009", "BT14-102"]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("cannot hatch with its [On Deletion] effect while the breeding area already holds a Digimon (Q2486)", async () => {
    const occupied = await attackAndDeleteAngemon({ card: "BT14-001", as: "occupant" });
    expect(occupied.s.perm("occupant").topCard?.cardId).toBe("BT14-001");
    expect(occupied.s.perm("occupant").stack).toHaveLength(0);
    expect(occupied.s.state.players[0]!.eggDeck.map((card) => card.cardId)).toEqual(["BT14-003"]);
    assertNoLoudGap(occupied.s);

    const empty = await attackAndDeleteAngemon();
    expect(empty.s.state.players[0]!.breeding?.topCard?.instanceId).toBe(empty.s.inst("egg").instanceId);
    expect(empty.s.state.players[0]!.eggDeck).toHaveLength(0);
  });

  it("still places itself at the bottom of security when the Tamer-gated hatch is impossible (Q2487)", async () => {
    const { s } = await attackAndDeleteAngemon({ card: "BT14-001", as: "occupant" });

    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009", "BT14-102"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT14-102")).toBe(false);
    expect(s.perm("occupant").topCard?.cardId).toBe("BT14-001");
    assertNoLoudGap(s);
  });

  it("lets the inherited [On Deletion] effect leave an eligible yellow Vaccine card in hand (Q2488)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-041", as: "host", under: ["BT14-102"] }],
          hand: [{ card: "BT14-035", as: "eligible" }],
          security: ["BT1-009"],
        },
        1: { security: [{ card: "BT1-084", as: "securityOmnimon" }] },
      },
      { autoDeclineOptional: true },
    );
    const hostId = s.perm("host").permanentId;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId) &&
        s.state.pendingDecision === undefined,
    );
    await drainMicrotasks();

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("eligible").instanceId]);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(
      s.decisions.some(
        (decision) =>
          decision.seat === 0 && decision.req.kind === "optional" && decision.req.sourceCardId === "BT14-102",
      ),
    ).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });
});
