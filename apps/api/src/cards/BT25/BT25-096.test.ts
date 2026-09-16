import { beforeEach, describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT25-096.js";
import { cite } from "../../engine/conformance/_kb.js";

describe("BT25-096 Mirage Beast Knight", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0034",
      "Bracket-only Gaomon-line and Thomas references require exact names",
      "c0ee1524e24827189e2dcfae2543a217540028723a55d660c84d63e4f29505f2",
    );
  });
  it("binds both required materials and 'that Digimon' evolution to one Gaomon", () => {
    const block = compiled.effects.find((effect) => effect.trigger === "Main")?.actions[0];
    expect(block).toMatchObject({
      kind: "CostGatedBlock",
      cost: {
        kind: "compound",
        costs: [
          { kind: "place", bindHostAs: "gaomonHost" },
          { kind: "place", host: { filter: { boundRef: "gaomonHost" } } },
        ],
      },
      actions: [{ kind: "Digivolve", target: { fromSelectionRef: "gaomonHost" } }],
    });
  });

  it("pays the bottom face-down Tamer card to reduce the use cost from 5 to 3", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-096", as: "option" }],
          battleArea: [
            { card: "BT25-021", as: "blueSource" },
            {
              card: "BT25-087",
              as: "thomas",
              under: [
                { card: "AD1-001", faceUp: false, as: "bottomCost" },
                { card: "AD1-002", faceUp: false, as: "upper" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: false },
    );
    await s.ready();
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT25-096"));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("bottomCost").instanceId);
    expect(s.perm("thomas").stack.map((card) => card.instanceId)).toEqual([s.inst("upper").instanceId]);
  });

  it("requires both materials, places them in chosen bottom order, then optionally digivolves for free (Q6456)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-096", as: "option" },
            { card: "BT25-029", as: "mirage" },
          ],
          trash: [
            { card: "BT25-023", as: "gaogamon" },
            { card: "BT25-027", as: "mach" },
          ],
          battleArea: [{ card: "BT25-021", as: "gaomon", under: [{ card: "BT25-002", as: "existing" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: false },
    );
    await s.ready();
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("gaogamon").instanceId, s.inst("mach").instanceId]),
    );
    const ordering = s.state.pendingDecision!;
    const offeredOrder = s.decisions.findLast((entry) => entry.req.kind === "orderCards")?.req.options
      ?.candidateInstanceIds ?? [s.inst("gaogamon").instanceId, s.inst("mach").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order: [...offeredOrder].reverse() },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gaomon").topCard?.instanceId === s.inst("mirage").instanceId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("gaomon").stack.map((card) => card.instanceId)).toEqual([
      s.inst("mach").instanceId,
      s.inst("gaogamon").instanceId,
      s.inst("existing").instanceId,
      s.inst("gaomon").instanceId,
    ]);
    expect(
      s
        .perm("gaomon")
        .stack.slice(0, 2)
        .every((card) => card.faceUp),
    ).toBe(true);
    expect(s.perm("gaomon").topCard.cardId).toBe("BT25-029");
    expect(s.state.memory).toBe(0);

    const incomplete = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-096", as: "option" }],
          trash: [{ card: "BT25-023", as: "onlyMaterial" }],
          battleArea: [{ card: "BT25-021", as: "gaomon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await incomplete.ready();
    incomplete.state.memory = 5;
    expect(
      incomplete.engine.applyIntent(0, { type: "playCard", instanceId: incomplete.inst("option").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => incomplete.state.players[0]!.trash.some((card) => card.cardId === "BT25-096"));
    expect(incomplete.perm("gaomon").stack).toHaveLength(0);
    expect(incomplete.state.players[0]!.trash.map((card) => card.instanceId)).toContain(
      incomplete.inst("onlyMaterial").instanceId,
    );
  });

  it("accepts the other legal bottom-stack order for the two simultaneous materials", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-096", as: "option" },
            { card: "BT25-029", as: "mirage" },
          ],
          trash: [
            { card: "BT25-023", as: "gaogamon" },
            { card: "BT25-027", as: "mach" },
          ],
          battleArea: [{ card: "BT25-021", as: "gaomon", under: [{ card: "BT25-002", as: "existing" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("gaomon").topCard?.instanceId === s.inst("mirage").instanceId);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("gaomon").stack.map((card) => card.instanceId)).toEqual([
      s.inst("gaogamon").instanceId,
      s.inst("mach").instanceId,
      s.inst("existing").instanceId,
      s.inst("gaomon").instanceId,
    ]);
  });

  it("does not evolve into an opponent's exact MirageGaogamon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-096", as: "option" },
            { card: "BT13-033", as: "burst" },
          ],
          trash: [
            { card: "BT25-023", as: "gaogamon" },
            { card: "BT25-027", as: "mach" },
          ],
          battleArea: [{ card: "BT25-021", as: "gaomon" }],
        },
        1: { hand: [{ card: "BT25-029", as: "opponentMirage" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT25-096"));
    expect(s.perm("gaomon").topCard.cardId).toBe("BT25-021");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("burst").instanceId);
    expect([...s.perm("gaomon").stack, s.perm("gaomon").topCard].map((card) => card.instanceId)).toEqual([
      s.inst("gaogamon").instanceId,
      s.inst("mach").instanceId,
      s.inst("gaomon").instanceId,
    ]);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("opponentMirage").instanceId);
  });

  it.each([
    ["Gaogamon", "BT5-064", "BT25-027"],
    ["MachGaogamon", "BT25-023", "BT5-068"],
  ])("rejects near-named %s processing material without partial payment", async (_name, first, second) => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-096", as: "option" },
            { card: "BT25-029", as: "mirage" },
          ],
          trash: [
            { card: first, as: "first" },
            { card: second, as: "second" },
          ],
          battleArea: [{ card: "BT25-021", as: "host" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.perm("host").topCard.cardId).toBe("BT25-021");
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId, optionId]),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("mirage").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["BT25-087", "ST24-13"])(
    "Security may free-play Thomas alias %s from trash, then adds itself to hand",
    async (thomasId) => {
      const s = setupEngine(
        {
          0: {
            trash: [{ card: thomasId, as: "thomas" }],
            security: [{ card: "BT25-096", as: "securityOption" }],
          },
          1: { battleArea: [{ card: "AD1-003", as: "attacker" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;

      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("securityOption").instanceId),
      );

      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === thomasId)).toBe(true);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
    },
  );

  it("Security searches only your hand/trash across the mixed Gaomon/Thomas pool", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-021", as: "ownGaomon" }],
          security: [{ card: "BT25-096", as: "securityOption" }],
        },
        1: {
          trash: [
            { card: "BT25-021", as: "opponentGaomon" },
            { card: "ST24-13", as: "nearThomas" },
          ],
          battleArea: [{ card: "AD1-003", as: "attacker" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("securityOption").instanceId),
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("ownGaomon").instanceId)).toBe(
      true,
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("opponentGaomon").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("nearThomas").instanceId);
  });

  it("Security cannot play an exact opponent card when your pool is empty", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "BT25-088", as: "wrongNameTamer" }],
          security: [{ card: "BT25-096", as: "securityOption" }],
        },
        1: {
          trash: [{ card: "BT25-021", as: "opponentGaomon" }],
          battleArea: [{ card: "AD1-003", as: "attacker" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("securityOption").instanceId),
    );
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("wrongNameTamer").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("opponentGaomon").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("pays the first face-down Tamer card above a face-up bottom (Q4785)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-096", as: "option" }],
          battleArea: [
            { card: "BT25-021" },
            {
              card: "BT25-087",
              as: "thomas",
              under: [
                { card: "AD1-001", faceUp: true, as: "bottom" },
                { card: "AD1-002", faceUp: false, as: "upper" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT25-096"));
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("upper").instanceId);
    expect(s.perm("thomas").stack.map((card) => card.instanceId)).toEqual([s.inst("bottom").instanceId]);
  });
});
