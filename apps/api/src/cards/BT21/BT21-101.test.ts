import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-101.js";
import "../index.js";

describe("BT21-101 Gaiamon", () => {
  it("verifies Blocker/Link +1, Appmon link windows, and the once-per-turn linked security cost", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Link", amount: 1, raw: "＜Link +1＞" }] }),
    );
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Link",
        payCost: false,
        optional: true,
        target: {
          filter: {
            kind: ["Digimon"],
            hasLinkRequirement: true,
            nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
          },
          count: 1,
          source: "thisDigimon",
        },
        from: ["hand", "digivolutionCards"],
        recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      });
    }
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn).toMatchObject({ frequency: "OncePerTurn" });
    expect(yourTurn?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
    });
    const subTrigger = yourTurn?.actions[0];
    expect(subTrigger?.kind).toBe("SubTrigger");
    if (subTrigger?.kind !== "SubTrigger") throw new Error("expected linked subtrigger");
    const nested = subTrigger.actions;
    expect(nested[0]).toMatchObject({
      kind: "Trash",
      target: { filter: { controller: "opponent", zone: "security", position: "top" } },
      cost: {
        kind: "unsuspend",
        target: { filter: { isSelfRef: true }, isSelf: true },
        raw: "by unsuspending this Digimon",
      },
      abortOnDecline: true,
    });
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Globemon", "Charismon"], cost: 0 }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("fires from a natural own-Digimon Link and ignores an opponent Digimon Link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-101", as: "gaiamon", suspended: true }],
          hand: [{ card: "BT21-009", as: "link" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("gaiamon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gaiamon").linked.length === 1);
    expect(s.perm("gaiamon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);

    await advance(s.engine).verb.suspend([s.perm("gaiamon").permanentId]);
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("opponent").permanentId });
    expect(s.perm("gaiamon").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("exposes Blocker and Link +1 through the live keyword surface", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT21-101", as: "gaiamon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("gaiamon"), "Blocker")).toBe(true);
    expect(observe(s.engine).linkMaxDelta(s.perm("gaiamon"))).toBe(1);
  });

  it("once per turn unsuspends after linking and trashes exactly one top security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-101", as: "gaiamon", suspended: true }] },
        1: { security: ["BT1-001", "BT1-002", "BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("gaiamon").permanentId });
    expect(s.perm("gaiamon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);

    await advance(s.engine).verb.suspend([s.perm("gaiamon").permanentId]);
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("gaiamon").permanentId });
    expect(s.perm("gaiamon").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("public attack links an Appmon from hand without paying its link cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-101", as: "gaiamon" }], hand: [{ card: "BT21-009", as: "link" }] },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gaiamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gaiamon").linked.some((card) => card.instanceId === s.inst("link").instanceId));
    expect(s.perm("gaiamon").linked.some((card) => card.instanceId === s.inst("link").instanceId)).toBe(true);
  });

  it("publicly declines the optional attack-time link and rejects a non-Link candidate", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-101", as: "gaiamon" }], hand: [{ card: "BT21-005", as: "invalid" }] },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gaiamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("gaiamon").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("invalid").instanceId)).toBe(true);
  });

  it.each([
    ["Globemon host", "BT21-023", "BT21-073"],
    ["Charismon host", "BT21-073", "BT21-023"],
  ])(
    "publicly links the second %s recipe material through Haru into zero-cost Gaiamon App Fusion",
    async (_label, hostCard, linkCard) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT21-084", as: "haru" },
              { card: hostCard, as: "host" },
            ],
            hand: [
              { card: linkCard, as: "link" },
              { card: "BT21-101", as: "gaiamon" },
            ],
            deck: ["BT1-001"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 3; // The public Link costs 3; App Fusion itself costs 0.
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "linkCard",
          instanceId: s.inst("link").instanceId,
          targetPermanentId: s.perm("host").permanentId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("host").topCard.cardId === "BT21-101");
      expect(s.perm("host").topCard.cardId).toBe("BT21-101");
      // App Fusion stacks both materials; Gaiamon's accepted evolution effect then
      // links one of those two sources. The unchosen material remains in the stack.
      await settle(() => s.perm("host").linked.length === 1);
      expect(s.perm("host").stack).toHaveLength(1);
      expect(s.perm("host").linked).toHaveLength(1);
      expect([...s.perm("host").stack, ...s.perm("host").linked].map((card) => card.cardId).sort()).toEqual(
        [hostCard, linkCard].sort(),
      );
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("gaiamon").instanceId)).toBe(false);
      expect(s.state.memory).toBe(0);
    },
  );

  it("public Haru linking rejects an ineligible Appmon recipe and preserves its cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-084", as: "haru" },
            { card: "BT21-023", as: "host" },
          ],
          hand: [
            { card: "BT21-009", as: "link" },
            { card: "BT21-101", as: "gaiamon" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("link").instanceId));
    expect(s.perm("host").topCard.cardId).toBe("BT21-023");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("gaiamon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });
});
