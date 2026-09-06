import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT20-096.js";
import "./index.js";
import "./BT20-062.js";

describe("BT20-096 Black Sabbath", () => {
  it("gates the trash activation's deletion on the 6-memory return cost", () => {
    const effect = compiled.effects.find((entry) => entry.isFromTrash);
    expect(effect).toMatchObject({
      actions: [
        {
          kind: "Return",
          to: "deckBottom",
          condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 4 },
          cost: { kind: "payMemory", memory: 6 },
          abortOnDecline: true,
        },
        { kind: "Delete", target: { filter: { controller: "opponent", unsuspended: true } } },
      ],
    });
  });

  it("trashes one hand card before deleting an opposing level 4 or lower Digimon", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Main" && !entry.isFromTrash)).toMatchObject({
      actions: [
        { kind: "Trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
        { kind: "Delete", target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 4 } } } },
      ],
    });
  });

  it("naturally trashes a hand card and deletes an opposing level 4 or lower Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT20-096", as: "option" },
            { card: "BT1-010", as: "discard" },
          ],
          battleArea: ["BT20-062"],
        },
        1: { battleArea: [{ card: "BT20-062", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-010");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT20-062");
  });

  it.each([10, 5])(
    "publicly pays six from %s memory, bottoms itself and deletes only an unsuspended target",
    async (memory) => {
      const s = setupEngine(
        {
          0: { trash: [{ card: "BT20-096", as: "option" }], hand: ["BT1-010"], deck: ["BT1-010", "BT1-010"] },
          1: {
            battleArea: [
              { card: "BT20-062", as: "unsuspended" },
              { card: "BT20-062", suspended: true, as: "suspended" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const optionId = s.inst("option").instanceId;
      const targetId = s.perm("unsuspended").permanentId;
      s.state.memory = memory;
      await s.ready();
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      const effect = JSON.parse(s.inst("option").activatableEffectsJson || "[]")[0] as
        | { effectKey: string }
        | undefined;
      expect(effect).toBeDefined();
      expect(
        s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: optionId, effectKey: effect!.effectKey }),
      ).toEqual({ ok: true });
      await settle(
        () => s.state.players[0]!.deck.at(-1)?.instanceId === optionId && s.state.players[1]!.battleArea.length === 1,
      );
      expect(s.state.memory).toBe(memory - 6);
      expect(s.state.players[0]!.trash.some((c) => c.instanceId === optionId)).toBe(false);
      expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(optionId);
      expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
      expect(s.perm("suspended").isSuspended).toBe(true);
      advance(s.engine).endMainPhaseIfOpen(0);
      await turn;
    },
  );

  it("cannot resolve the trash effect with five cards in hand", async () => {
    const s = setupEngine(
      {
        0: { trash: [{ card: "BT20-096", as: "option" }], hand: Array(5).fill("BT1-010"), deck: ["BT1-010"] },
        1: { battleArea: [{ card: "BT20-062", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    s.state.memory = 10;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const effects = JSON.parse(s.inst("option").activatableEffectsJson || "[]") as { effectKey: string }[];
    if (effects[0]) {
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: optionId,
          effectKey: effects[0].effectKey,
        }),
      ).toEqual({ ok: true });
      await settle();
    }
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === optionId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("fires its Security deletion against an opposing Digimon up to level 6", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-062", as: "attacker" },
            { card: "BT20-078", as: "securityTarget" },
            { card: "BT20-045", as: "tooHigh" },
          ],
        },
        1: { security: [{ card: "BT20-096", as: "securityOption" }], deck: ["BT20-001", "BT20-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const targetId = s.perm("securityTarget").permanentId;
    preferred.push(targetId);
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("securityTarget").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityTarget").instanceId);
    expect(s.perm("tooHigh").topCard.cardId).toBe("BT20-045");
  });
});
