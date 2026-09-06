import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST22-05 Sakuyamon", () => {
  it("plays a Pipe Fox Token from its On Play effect", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "ST22-05", as: "sakuyamon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sakuyamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId.includes("TOKEN")));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId.includes("TOKEN"))).toBe(true);
  });

  it.each(["ST22-04", "ST22-06"])(
    "Blast Digivolves from hand onto %s during a real Counter window",
    async (baseCard) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: baseCard, as: "base" }],
            hand: [{ card: "ST22-05", as: "sakuyamon" }],
            security: ["BT1-001", "BT1-001"],
            deck: ["BT1-002", "BT1-002"],
          },
          1: {
            battleArea: [{ card: "BT1-009", as: "attacker" }],
            security: ["BT1-001", "BT1-001"],
            deck: ["BT1-002", "BT1-002"],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
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
      const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("sakuyamon").instanceId);
      expect(eligible).toBeDefined();
      expect(
        s.engine.applyIntent(0, {
          type: "respondCounter",
          sourceInstanceId: eligible!.instanceId,
          effectKey: eligible!.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.security.length === 1);
      expect(s.state.players[0]!.security).toHaveLength(1);
      expect(s.state.memory).toBe(0);
      expect(s.perm("base").topCard.cardId).toBe("ST22-05");
    },
  );
});
