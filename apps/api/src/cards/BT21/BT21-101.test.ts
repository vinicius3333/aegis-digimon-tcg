import { EffectTiming } from "@aegis/shared";
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

  it("declines the optional attack-time link and rejects a non-Link candidate", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-101", as: "gaiamon" }], hand: [{ card: "BT21-005", as: "invalid" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("gaiamon"));
    expect(s.perm("gaiamon").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("invalid").instanceId)).toBe(true);
  });

  it("legally App Fuses Globemon and Charismon into Gaiamon at zero cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-023", as: "globemon", linked: [{ card: "BT21-073", as: "charismon" }] }],
          hand: [{ card: "BT21-101", as: "gaiamon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const fused = await advance(s.engine).verb.appFuseInto(
      s.perm("globemon").permanentId,
      s.inst("gaiamon").instanceId,
    );
    expect(fused?.topCard.cardId).toBe("BT21-101");
    // The recipe proof intentionally declines Gaiamon's unrelated optional Link window;
    // the public attack-link tests above cover that payload separately.
    expect(s.state.memory).toBe(0);
  });
});
