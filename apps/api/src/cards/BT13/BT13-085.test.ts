import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-085.js";
import "../ST1/ST1-10.js";
import "../ST1/ST1-16.js";

describe("BT13-085 Crowmon", () => {
  it("may digivolve into Ravemon from trash for the digivolution cost when attacking with a Tamer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      from: ["trash"],
      payCost: true,
      optional: true,
      into: { nameOrTrait: [{ match: "nameExact", tokens: ["Ravemon"] }] },
      condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Tamer"] }, raw: "you have a Tamer" },
    });
  });

  it("inherits an outside-battle deletion rescue for a level 4 or lower purple Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      optional: true,
      target: {
        filter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"], levelComparison: { op: "lte", value: 4 } },
      },
      condition: {
        kind: "not",
        condition: { kind: "triggerRemovalCause", removalCause: "byBattle" },
        raw: "deleted outside of a battle",
      },
    });
  });

  it("plays a level 4 or lower purple Digimon from trash when the inherited host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-088", under: ["BT13-085"], as: "host" }],
          trash: [{ card: "BT13-083", as: "rescue" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: Array.from({ length: 8 }, () => "BT1-009"),
        },
        1: {
          battleArea: [{ card: "ST1-10", as: "phoenix" }],
          hand: [{ card: "ST1-16", as: "gaia" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sleepId = s.perm("host").topCard!.instanceId;
    const sourceId = s.perm("host").stack.at(-1)!.instanceId;
    const rescueId = s.inst("rescue").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === rescueId) &&
        s.state.players[0]!.trash.some((card) => card.instanceId === sleepId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-083")).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(sourceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(rescueId);
    expect(s.state.memory).toBe(2);
  });

  it("may digivolve into the exact Ravemon from trash when attacking with a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-085", as: "crow" },
            { card: "BT13-100", as: "tamer" },
          ],
          trash: [{ card: "BT13-089", as: "ravemon" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("crow").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("crow").topCard?.cardId === "BT13-089");
    expect(s.perm("crow").topCard?.cardId).toBe("BT13-089");
  });
});
