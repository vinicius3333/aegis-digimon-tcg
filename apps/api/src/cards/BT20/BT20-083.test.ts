import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
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
            security: Array.from({ length: securityCount }, () => "BT1-001"),
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

  it("places the deleted card at the bottom of an own breeding King Drasil stack", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "kingDrasil" },
          battleArea: [{ card: "BT20-083", as: "omekamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("omekamon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.breeding?.stack.some((card) => card.cardId === "BT20-083") === true);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.breeding?.stack.at(-1)?.cardId).toBe("BT20-083");
  });

  it("plays an Omekamon from its own breeding stack after the owner's security is removed", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", under: [{ card: "BT20-083", as: "stackOmekamon" }] },
          battleArea: [{ card: "BT23-072", under: [{ card: "BT20-083", as: "unrelatedOmekamon" }] }],
          security: [{ card: "BT1-001", as: "security" }],
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
          security: [{ card: "BT1-001", as: "security" }],
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
