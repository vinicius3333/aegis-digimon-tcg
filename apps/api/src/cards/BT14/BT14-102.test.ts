import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT14-102.js";
import "../index.js";

describe("BT14-102", () => {
  it("offers deleting itself to place a Virus Digimon in security or give -5000 DP", () => {
    const modal = compiled.effects?.[0]?.actions[0] as any;
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenAttacking" });
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
          security: ["BT1-001"],
          eggDeck: [{ card: "BT14-003", as: "egg" }],
        },
        1: {
          battleArea: [{ card: "BT14-069", as: "virus" }],
          security: ["BT1-002"],
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
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-001", "BT14-102"]);
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("egg").instanceId);
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === virusId)).toBe(false);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-002", "BT14-069"]);
    assertNoLoudGap(s);
  });

  it("naturally deletes itself for modal branch 1 and gives the chosen opponent Digimon -5000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-102", as: "angemon" }],
          security: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT14-041", as: "target" }],
          security: ["BT1-002"],
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
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-001", "BT14-102"]);
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
          security: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT14-069", as: "virus" }],
          security: ["BT1-002"],
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

    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-001", "BT14-102"]);
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
          security: ["BT1-001"],
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
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-001", "BT14-035"]);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT14-035")).toBe(false);
    assertNoLoudGap(s);
  });
});
