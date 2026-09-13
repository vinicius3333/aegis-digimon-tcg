import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-093.js";
import "./BT13-007.js";
import "../ST1/ST1-10.js";

describe("BT13-093 Omekamon", () => {
  it("draws on play and optionally places a Royal Knight from hand under a breeding-area King Drasil", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "PlaceUnder",
      optional: true,
      from: ["hand"],
      target: {
        filter: {
          controller: "mine",
          zone: "hand",
          kind: ["Digimon"],
          nameOrTrait: [{ match: "trait", tokens: ["Royal Knight"] }],
        },
        count: 1,
      },
      underFilter: {
        controller: "mine",
        zone: "breeding",
        nameOrTrait: [{ match: "nameExact", tokens: ["King Drasil_7D6"] }],
      },
      position: "bottom",
    });
  });

  it("draws a card through the live on-play effect", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT13-093", as: "omeka" }], deck: [{ card: "BT1-009", as: "drawn" }] },
    });
    const drawnId = s.inst("drawn").instanceId;
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omeka").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawnId);
    expect(s.state.memory).toBe(1);
  });

  it("places one Royal Knight from hand under the exact breeding-area King Drasil", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-093", as: "omeka" }],
          breeding: { card: "BT13-007", as: "drasil" },
          hand: [{ card: "BT13-040", as: "royal" }],
        },
        1: { battleArea: [{ card: "ST1-10", as: "phoenix", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const omekaPermanentId = s.perm("omeka").permanentId;
    const omekaTopInstanceId = s.perm("omeka").topCard.instanceId;
    const royalId = s.inst("royal").instanceId;
    const drasilPermanentId = s.perm("drasil").permanentId;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: omekaPermanentId,
        target: { kind: "permanent", permanentId: s.perm("phoenix").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === omekaTopInstanceId) &&
        s.perm("drasil").stack.some((card) => card.instanceId === royalId),
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === omekaTopInstanceId)).toBe(true);
    expect(s.perm("drasil").permanentId).toBe(drasilPermanentId);
    expect(s.perm("drasil").stack.some((card) => card.instanceId === royalId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === royalId)).toBe(false);
  });
});
