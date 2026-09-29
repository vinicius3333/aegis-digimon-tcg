import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST22-06 Sakuyamon: Maid Mode", () => {
  it("moves the opponent's lowest-DP Digimon to security when security is removed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "ST22-06", as: "maid" },
            { card: "ST22-10", as: "option" },
          ],
          security: [{ card: "BT1-090", as: "security" }],
        },
        1: {
          security: [{ card: "BT1-091", as: "security" }],
          battleArea: [
            { card: "BT1-009", dp: 2000, as: "low" },
            { card: "BT1-010", dp: 6000, as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("maid").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST22-06"));
    const maid = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "ST22-06")!;
    expect(advance(s.engine).ledgers.subTriggers.subscriptionsFor("whenOptionUsed", maid.permanentId)).toHaveLength(1);
    expect(
      advance(s.engine).ledgers.subTriggers.subscriptionsFor("whenSecurityRemoved", maid.permanentId),
    ).toHaveLength(1);
    await settle(() => s.state.players[1]!.battleArea.every((perm) => perm.topCard?.cardId !== "BT1-009"));
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[1]!.security.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-091")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-010")).toBe(true);
  });

  it("uses the same placement and top-trash behavior when your security is removed", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT1-090", as: "removed" }], battleArea: [{ card: "ST22-06", as: "maid" }] },
        1: {
          security: [
            { card: "BT1-091", as: "top" },
            { card: "BT1-092", as: "bottom" },
          ],
          battleArea: [
            { card: "BT1-009", dp: 2000, as: "low" },
            { card: "BT1-010", dp: 6000, as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[1]!.battleArea.every((perm) => perm.topCard?.cardId !== "BT1-009"));
    expect(s.state.players[1]!.security.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-091")).toBe(true);
  });

  it("does not trash security when the lowest-DP Digimon is prevented from leaving", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT1-090", as: "removed" }],
          battleArea: [{ card: "ST22-06", as: "maid" }],
        },
        1: {
          security: [
            { card: "ST22-10", as: "mandala", faceUp: true },
            { card: "BT1-091", as: "mustRemain" },
          ],
          battleArea: [
            { card: "ST22-03", dp: 2000, as: "protectedLowest" },
            { card: "BT1-010", dp: 6000, as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "ST22-10"));

    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "ST22-03")).toBe(true);
    expect(s.state.players[1]!.security.some((card) => card.cardId === "BT1-091")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-091")).toBe(false);
  });

  it("ignores Option cards your opponent uses", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST22-06", as: "maid" }] },
        1: {
          battleArea: [{ card: "ST22-03", as: "opponentYellow", dp: 2000 }],
          hand: [{ card: "ST22-10", as: "option" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
          security: ["BT1-091", "BT1-092"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.some((card) => card.instanceId === optionId) &&
        s.state.pendingDecision === undefined,
    );
    await settle();

    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "ST22-06")).toBe(false);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.permanentId)).toEqual([
      s.perm("opponentYellow").permanentId,
    ]);
    expect(s.state.players[1]!.security).toHaveLength(3);
  });

  it("triggers when Amethyst Mandala trashes itself from your security to protect it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST22-06", as: "maid" }],
          security: [{ card: "ST22-10", as: "mandala", faceUp: true }, "BT1-090", "BT1-090"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "red", dp: 2000 },
            { card: "BT1-010", as: "other", dp: 5000 },
          ],
          hand: [{ card: "ST1-16", as: "gaiaForce" }],
          security: [{ card: "BT1-091", as: "opponentTop" }, "BT1-092"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "ST22-06") &&
        s.state.pendingDecision === undefined,
    );
    await settle();

    expect(s.state.players[0]!.battleArea.map((perm) => perm.permanentId)).toEqual([s.perm("maid").permanentId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("mandala").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("opponentTop").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("triggers when your used Plug-In links itself to one of your Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST22-06", as: "maid" }, "ST3-12"],
          hand: [{ card: "ST22-08", as: "plugIn" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 2000, as: "deleted" },
            { card: "BT1-010", dp: 3000, as: "placed" },
          ],
          security: [{ card: "BT1-091", as: "opponentTop" }, "BT1-092"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const plugInId = s.inst("plugIn").instanceId;
    const placedTopId = s.perm("placed").topCard.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: plugInId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.some((card) => card.instanceId === placedTopId));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("maid").linked.map((card) => card.instanceId)).toEqual([plugInId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("opponentTop").instanceId);
  });
});

describe("ST22-06 Sakuyamon: Maid Mode — KB Q&A rulings", () => {
  it.each([true, false])(
    "trashes an Option it used from under a Tamer unless that Option placed itself (linked=%s) (Q5421)",
    async (acceptLink) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "ST3-12", as: "tamer", under: [{ card: "ST22-09", as: "plugIn" }] }],
            hand: [{ card: "ST22-06", as: "maid" }],
          },
          1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
        },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          declinePrompts: acceptLink ? ["by placing"] : ["by placing", "Link"],
        },
      );
      s.state.memory = 11;
      await s.ready();
      const plugInId = s.inst("plugIn").instanceId;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("maid").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "beSuspended"));
      await settle(() => s.state.pendingDecision === undefined);

      expect(s.perm("tamer").stack).toHaveLength(0);
      const linked = s.state.players[0]!.battleArea.some((permanent) =>
        permanent.linked.some((card) => card.instanceId === plugInId),
      );
      expect(linked).toBe(acceptLink);
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === plugInId)).toBe(!acceptLink);
    },
  );

  it("activates its Option-use effect after the used Option's [Main] effect resolves (Q5422)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST22-06", as: "maid" }],
          hand: [{ card: "ST22-10", as: "option" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: {
          security: [{ card: "BT1-091", as: "opponentTop" }, "BT1-092"],
          battleArea: [{ card: "BT1-009", dp: 2000, as: "lowest" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const lowestTopId = s.perm("lowest").topCard.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.some((card) => card.instanceId === lowestTopId));

    const optionPlacedIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.to === "security" && event.instanceIds.includes(optionId),
    );
    const maidTriggeredIndex = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "ST22-06",
    );
    expect(optionPlacedIndex).toBeGreaterThanOrEqual(0);
    expect(maidTriggeredIndex).toBeGreaterThan(optionPlacedIndex);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("opponentTop").instanceId);
  });

  it("does not trigger when a <Delay> Option activates its effect without being used (Q5423)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST22-06", as: "maid" },
            { card: "BT10-100", as: "delayed" },
          ],
          hand: [{ card: "ST22-10", as: "option" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: {
          security: [{ card: "BT1-091", as: "opponentTop" }, "BT1-092"],
          battleArea: [{ card: "BT1-009", dp: 2000, as: "lowest" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const lowestId = s.perm("lowest").permanentId;
    const delayEffect = observe(s.engine).activatableEffects(s.perm("delayed"))[0]!;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("delayed").topCard.instanceId,
        effectKey: delayEffect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT10-100"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(7);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestId));
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("opponentTop").instanceId);
  });

  it("lets a checked [Security] effect resolve before its security-removal effect (Q5424)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST22-06", as: "maid" }],
          security: [{ card: "ST22-10", as: "mandala" }, "BT1-090"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 6000, as: "attacker" },
            { card: "BT1-009", dp: 2000, as: "lowest" },
          ],
          security: [{ card: "BT1-091", as: "opponentTop" }, "BT1-092"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("lowest").permanentId, s.perm("lowest").topCard.instanceId);
    s.state.turnSeat = 1;
    await s.ready();
    const attackerTopId = s.perm("attacker").topCard.instanceId;
    const lowestTopId = s.perm("lowest").topCard.instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 3000);

    const securityEffectIndex = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "ST22-10",
    );
    const maidIndex = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "ST22-06",
    );
    expect(securityEffectIndex).toBeGreaterThanOrEqual(0);
    expect(maidIndex).toBeGreaterThan(securityEffectIndex);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([lowestTopId, s.inst("opponentTop").instanceId]),
    );
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toContain(attackerTopId);
  });

  it("does not trash security when the lowest-DP Digimon is prevented from leaving (Q5425)", async () => {
    const s = setupEngine(
      {
        0: { security: ["BT1-090"], battleArea: [{ card: "ST22-06", as: "maid" }] },
        1: {
          security: [
            { card: "ST22-10", as: "mandala", faceUp: true },
            { card: "BT1-091", as: "mustRemain" },
          ],
          battleArea: [
            { card: "ST22-03", dp: 2000, as: "protectedLowest" },
            { card: "BT1-010", dp: 6000, as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("mandala").instanceId));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("protectedLowest").topCard.cardId).toBe("ST22-03");
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("mustRemain").instanceId]);
    expect(s.perm("high").topCard.cardId).toBe("BT1-010");
  });

  it("spends its [Once Per Turn] use even when the placement was prevented (Q5426)", async () => {
    const s = setupEngine(
      {
        0: { security: ["BT1-090", "BT1-090"], battleArea: [{ card: "ST22-06", as: "maid" }] },
        1: {
          security: [
            { card: "ST22-10", as: "mandala", faceUp: true },
            { card: "BT1-091", as: "opponentTop" },
            "BT1-092",
          ],
          battleArea: [
            { card: "ST22-03", dp: 2000, as: "protectedLowest" },
            { card: "BT1-010", dp: 6000, as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("mandala").instanceId));
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("protectedLowest").topCard.cardId).toBe("ST22-03");

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("protectedLowest").topCard.cardId).toBe("ST22-03");
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toContain(s.inst("opponentTop").instanceId);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "ST22-06" && req.kind === "optional")).toHaveLength(1);
  });
});
