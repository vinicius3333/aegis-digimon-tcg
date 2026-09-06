import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-057.js";
import "./index.js";

describe("BT20-057 Gankoomon", () => {
  it("reduces its play cost by 4 when an own Huckmon, Jesmon, or Sistermon is present", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Static" && effect.actions.length > 0)).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Replacement",
              mode: "reduceCost",
              amount: 4,
              condition: {
                kind: "youHave",
                filter: {
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Huckmon", "Jesmon", "Sistermon"], match: "name" }],
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("has Reboot and Blocker", () => {
    expect(
      compiled.effects.filter((effect) =>
        effect.keywords?.some((keyword) => ["Reboot", "Blocker"].includes(keyword.keyword)),
      ),
    ).toHaveLength(2);
  });

  it("offers a free hand-or-trash digivolution into a level 6-or-lower named or Royal Knight Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Digivolve",
            from: ["hand", "trash"],
            payCost: false,
            optional: true,
            into: {
              levelComparison: { op: "lte", value: 6 },
              nameOrTrait: [
                { tokens: ["Huckmon", "Jesmon", "Sistermon"], match: "name" },
                { tokens: ["Royal Knight"], match: "trait" },
              ],
            },
          },
        ],
      });
    }
  });

  it("reduces only its own play cost by 4 with a qualifying named Digimon", async () => {
    for (const qualifying of [true, false]) {
      const s = setupEngine({
        0: {
          battleArea: qualifying ? [{ card: "BT20-084", as: "qualifier" }] : [{ card: "BT20-054" }],
          hand: [{ card: "BT20-057", as: "gankoomon" }],
        },
      });
      s.state.memory = 12;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gankoomon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-057"));
      expect(s.state.memory).toBe(qualifying ? 4 : 0);
    }
  });

  it("on play evolves a red level 5 into Jesmon from hand for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-016", as: "target" },
            { card: "BT20-084", as: "qualifier" },
          ],
          hand: [
            { card: "BT20-057", as: "gankoomon" },
            { card: "BT20-017", as: "jesmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gankoomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").topCard.cardId === "BT20-017");
    expect(s.state.memory).toBe(0);
  });

  it("when digivolving evolves another level 5 into a trash Royal Knight for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-054", as: "source" },
            { card: "BT20-054", as: "target" },
          ],
          hand: [{ card: "BT20-057", as: "gankoomon" }],
          trash: [{ card: "BT20-056", as: "alphamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("gankoomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT20-056");
    expect(s.state.memory).toBe(0);
  });

  it("may decline the free evolution and publishes Reboot and Blocker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-016", as: "target" }],
          hand: [
            { card: "BT20-057", as: "gankoomon" },
            { card: "BT20-017", as: "jesmon" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gankoomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-057"));
    expect(s.perm("target").topCard.cardId).toBe("BT20-016");
    const gankoomon = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT20-057")!;
    expect(observe(s.engine).hasKeyword(gankoomon, "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(gankoomon, "Blocker")).toBe(true);
  });

  it("uses the public Blocker window and Reboot lifecycle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-057", as: "gankoomon" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT20-010", dp: 5000, as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    const window = s.events.findLast((event) => event.kind === "blockWindowOpened");
    if (window?.kind !== "blockWindowOpened") throw new Error("block window did not open");
    expect(window.eligibleBlockerIds).toContain(s.perm("gankoomon").permanentId);
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("gankoomon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
