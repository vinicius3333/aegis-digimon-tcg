import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-049.js";

describe("BT14-049", () => {
  it("has Blast Digivolve and suspends then optionally returns an opposing suspended 5000-DP-or-lower Digimon to deck bottom", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toContainEqual({
      keyword: "BlastDigivolve",
      raw: "＜Blast Digivolve＞",
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend" },
          {
            kind: "Return",
            to: "deckBottom",
            optional: true,
            target: { filter: { suspended: true, dp: { op: "lte", value: 5000 } } },
          },
        ],
      });
  });

  it("suspends and bottoms a low-DP opposing Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT14-049", as: "lillymon" }] },
        1: { battleArea: [{ card: "BT14-042", as: "target", dp: 4000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lillymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.some((card) => card.cardId === "BT14-042")).toBe(true);
  });

  it("naturally exposes Counter timing and Blast Digivolves to resolve the inherited effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-045", as: "base" }],
          hand: [{ card: "BT14-049", as: "lillymon" }],
        },
        1: {
          battleArea: [
            { card: "BT14-042", as: "attacker", dp: 7000 },
            { card: "BT14-042", as: "target", dp: 4000 },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const targetId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("lillymon").instanceId);
    expect(eligible).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT14-049");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
    expect(s.state.players[1]!.deck.some((card) => card.cardId === "BT14-042")).toBe(true);

    s.state.turnSeat = 0;
    expect(await advance(s.engine).verb.deletePermanent([s.perm("base").permanentId], "byEffect")).toBe(1);
    expect(s.state.memory).toBe(-3);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT14-049")).toBe(true);
  });
});
