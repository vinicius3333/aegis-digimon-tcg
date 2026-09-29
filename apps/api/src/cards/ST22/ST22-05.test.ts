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

describe("ST22-05 Sakuyamon — KB Q&A rulings", () => {
  const isPipeFox = (cardId: string) => cardId.includes("Pipe-Fox");

  it("lets a Pipe Fox Token played during the counter timing block in the same attack (Q5417)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST22-04", as: "base" }],
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
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
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
    const blast = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("sakuyamon").instanceId)!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: blast.instanceId,
        effectKey: blast.effectKey,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    const token = s.state.players[0]!.battleArea.find((permanent) => isPipeFox(permanent.topCard.cardId))!;
    const blockWindow = s.events.find((event) => event.kind === "blockWindowOpened");
    if (blockWindow?.kind !== "blockWindowOpened") throw new Error("block window did not open");
    expect(s.perm("base").topCard.cardId).toBe("ST22-05");
    expect(blockWindow.eligibleBlockerIds).toContain(token.permanentId);

    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: token.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking(), 3000);
    expect(s.events.some((event) => event.kind === "blocked" && event.blockerPermanentId === token.permanentId)).toBe(
      true,
    );
    expect(s.state.players[0]!.security).toHaveLength(2);
  });

  it.each([true, false])(
    "trashes an Option it used from under a Tamer unless that Option placed itself (linked=%s) (Q5418)",
    async (acceptLink) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "ST3-12", as: "tamer", under: [{ card: "ST22-09", as: "plugIn" }] }],
            hand: [{ card: "ST22-05", as: "sakuyamon" }],
          },
          1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: acceptLink ? [] : ["Link"] },
      );
      s.state.memory = 10;
      await s.ready();
      const plugInId = s.inst("plugIn").instanceId;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sakuyamon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "beSuspended"));

      expect(s.perm("tamer").stack).toHaveLength(0);
      const linked = s.state.players[0]!.battleArea.some((permanent) =>
        permanent.linked.some((card) => card.instanceId === plugInId),
      );
      expect(linked).toBe(acceptLink);
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === plugInId)).toBe(!acceptLink);
    },
  );

  it("can suspend the Pipe Fox Token its [When Attacking] effect just played for <Alliance> (Q5419)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST22-05", as: "sakuyamon" }], deck: ["BT1-009", "BT1-009"] },
        1: { security: ["ST1-02", "ST1-02", "ST1-02"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sakuyamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    const token = s.state.players[0]!.battleArea.find((permanent) => isPipeFox(permanent.topCard.cardId))!;
    const alliance = s.events.find((event) => event.kind === "alliancePrompt");
    if (alliance?.kind !== "alliancePrompt") throw new Error("Alliance prompt missing");
    expect(alliance.eligibleAllyIds).toEqual([token.permanentId]);

    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: token.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking(), 3000);
    expect(token.isSuspended).toBe(true);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
  });

  it("cannot activate <Alliance> after Viximon digivolves an attacking Taomon into it (Q5420)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST22-04", as: "attacker", under: ["ST22-01"] },
            { card: "BT1-009", as: "ally" },
          ],
          hand: [
            { card: "ST22-10", as: "option" },
            { card: "ST22-05", as: "sakuyamon" },
          ],
          security: ["BT1-090", "BT1-091"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: ["ST1-02", "ST1-02", "ST1-02"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 3000);

    expect(s.perm("attacker").topCard.instanceId).toBe(s.inst("sakuyamon").instanceId);
    expect(s.events.some((event) => event.kind === "alliancePrompt")).toBe(false);
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
  });
});
