import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-083.js";
import "./index.js";

describe("BT20-083 Omekamon", () => {
  it("has Blocker without granting an unprinted alternate name", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Blocker" }],
    });
    expect(compiled.effects.flatMap((entry) => entry.actions)).not.toContainEqual(
      expect.objectContaining({ kind: "GrantStatic", grant: "name" }),
    );
  });

  it("limits the On Play Omnimon (X Antibody) digivolution to one or fewer security cards", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    expect(effect?.actions[0]).toMatchObject({
      kind: "Digivolve",
      condition: { kind: "securityAtMost", value: 1 },
      ignoreRequirements: true,
      payCost: false,
    });
  });

  it("places the deleted card under a King Drasil_7D6 in the breeding area", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnDeletion");
    expect(effect?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      target: { isSelf: true },
      underFilter: {
        controller: "mine",
        zone: "breeding",
        nameOrTrait: [{ tokens: ["King Drasil_7D6"], match: "name" }],
      },
      position: "bottom",
    });
  });

  it("only plays Omekamon from this stack when the owner's security is removed", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    const watcher = effect?.actions[0];
    if (watcher?.kind !== "SubTrigger") throw new Error("Inherited security-removal watcher missing");
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" },
    });
    expect(watcher.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      fromOwnDigivolutionStack: true,
      payCost: false,
      cost: { kind: "suspend", target: { isSelf: true } },
    });
    expect(effect?.isBreeding).toBe(true);
  });

  it("naturally free-evolves into Omnimon only at one or fewer security cards", async () => {
    for (const [securityCount, evolves] of [
      [1, true],
      [2, false],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "BT20-083", as: "omekamon" },
              { card: "BT10-086", as: "omnimon" },
            ],
            security: Array.from({ length: securityCount }, () => "BT20-010"),
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 5;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omekamon").instanceId })).toEqual({
        ok: true,
      });
      const expectedTop = evolves ? "BT10-086" : "BT20-083";
      await settle(() => s.state.players[0]!.battleArea[0]?.topCard.cardId === expectedTop);
      expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe(expectedTop);
    }
  });

  it("allows the printed On Play evolution to be declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT20-083", as: "omekamon" },
            { card: "BT10-086", as: "omnimon" },
          ],
          security: ["BT20-010"],
        },
      },
      { autoAcceptOptional: false, autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omekamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT20-083"));
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT20-083");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("omnimon").instanceId);
  });

  it("uses the public Blocker window when an opponent attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-083", as: "omekamon" }], security: ["BT20-010"] },
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
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("omekamon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it.each([true, false])("publicly resolves On Deletion placement under King Drasil (accept=%s)", async (accept) => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", under: [{ card: "BT20-083", as: "existingBottom" }], as: "kingDrasil" },
          battleArea: [{ card: "BT20-083", suspended: true, as: "omekamon" }],
        },
        1: { battleArea: [{ card: "BT20-076", dp: 20000, as: "attacker" }] },
      },
      { autoAcceptOptional: false, autoDeclineOptional: false, autoSelectCards: true },
    );
    const omekamonInstanceId = s.perm("omekamon").topCard.instanceId;
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("omekamon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.breeding?.stack[0]?.instanceId).toBe(
      accept ? omekamonInstanceId : s.inst("existingBottom").instanceId,
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === omekamonInstanceId)).toBe(!accept);
  });

  it("plays an Omekamon from its own breeding stack after the owner's security is removed", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", under: [{ card: "BT20-083", as: "stackOmekamon" }] },
          battleArea: [{ card: "BT23-072", under: [{ card: "BT20-083", as: "unrelatedOmekamon" }] }],
          security: [{ card: "BT20-010", as: "security" }],
        },
        1: { battleArea: [{ card: "BT20-076", dp: 20000, as: "attacker" }] },
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
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-083"));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT20-083");
    expect(s.state.players[0]!.breeding?.isSuspended).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((permanent) =>
        permanent.stack.some((card) => card.instanceId === s.inst("unrelatedOmekamon").instanceId),
      ),
    ).toBe(true);
    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-083");
    expect(played).toBeDefined();
    expect(observe(s.engine).hasKeyword(played!, "Blocker")).toBe(true);
  });

  it("does not fire the breeding inherited effect from a battle-area stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-072", under: [{ card: "BT20-083", as: "fieldStackOmekamon" }], as: "host" }],
          security: [{ card: "BT20-010", as: "security" }],
        },
        1: { battleArea: [{ card: "BT20-076", dp: 20000, as: "attacker" }] },
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
    await settle(
      () =>
        s.state.players[0]!.security.length === 0 &&
        !s.events.some((event) => event.kind === "attackDeclared" && event.attackerCardId === "BT20-083"),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT23-072");
    expect(
      s.state.players[0]!.battleArea[0]!.stack.some(
        (card) => card.instanceId === s.inst("fieldStackOmekamon").instanceId,
      ),
    ).toBe(true);
  });
});
