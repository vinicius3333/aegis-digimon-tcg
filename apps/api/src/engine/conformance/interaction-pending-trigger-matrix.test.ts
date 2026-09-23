import { EffectTiming, type ServerEvent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

const PER_TURN_SHA256 = "b18368c15408ced59ec2cebcf84779b30e851cc34973ebf428203c4f4295e8cf";

describe("pending trigger matrix: ordinary digivolution", () => {
  it("keeps BT12-002's spent inherited When Attacking use through ordinary digivolution", async () => {
    cite(
      "comprehensive-0193",
      "§15-14-1-5: an ordinary digivolution keeps the card's Once Per Turn use on the same Digimon",
      PER_TURN_SHA256,
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-037", as: "lighdramon", under: [{ card: "BT12-002", as: "demiveemon" }] }],
          hand: [{ card: "BT12-028", as: "paildramon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-009"], deck: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const hostId = s.perm("lighdramon").permanentId;
    const inheritedId = s.inst("demiveemon").instanceId;
    const inheritedTriggers = () =>
      s.events.filter(
        (event: ServerEvent) => event.kind === "effectTriggered" && event.sourceInstanceId === inheritedId,
      ).length;

    // Spend the inherited use without suspending the host. The later attack is a public
    // intent, so a second draw would expose a mistaken ordinary-digivolution reset.
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("lighdramon"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(inheritedTriggers()).toBe(1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostId,
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lighdramon").topCard.cardId === "BT12-028" && s.state.pendingDecision === undefined);
    expect(s.perm("lighdramon").permanentId).toBe(hostId);
    expect(s.perm("lighdramon").stack.map(({ instanceId }) => instanceId)).toContain(inheritedId);
    const deckBeforeAttack = s.state.players[0]!.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(inheritedTriggers()).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(deckBeforeAttack);
  });
});

describe("pending trigger matrix: target changes before activation", () => {
  it("rechecks the target pool when an earlier PrinceMamemon deletion removes its only target", async () => {
    cite(
      "comprehensive-0165",
      "§15-4-4 pending effects activate one at a time against the current board",
      "137ce0b5cdb62243311b56cff2421d30b78d421a36fdab4d09672961629897f3",
    );
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX5-063", as: "leviamon" }], deck: ["BT1-009"] },
        1: {
          battleArea: [
            { card: "EX13-063", as: "firstPrince" },
            { card: "EX13-063", as: "secondPrince" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 13;
    await s.ready();
    const leviamonId = s.inst("leviamon").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: leviamonId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);

    const princeDeletes = s.events
      .filter((event) => event.kind === "effectTriggered")
      .filter(
        (event) =>
          event.kind === "effectTriggered" &&
          event.sourceCardId === "EX13-063" &&
          event.description.includes("Delete 1 of your opponent's highest play cost"),
      );
    expect(princeDeletes.map(({ sourceInstanceId }) => sourceInstanceId)).toEqual(
      expect.arrayContaining([s.inst("firstPrince").instanceId, s.inst("secondPrince").instanceId]),
    );
    expect(princeDeletes).toHaveLength(2);
    const firstDeleteIndex = s.events.indexOf(princeDeletes[0]!);
    const secondDeleteIndex = s.events.indexOf(princeDeletes[1]!);
    const leviamonLeaveIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.instanceIds.includes(leviamonId) && event.to === "trash",
    );
    expect(leviamonLeaveIndex).toBeGreaterThan(firstDeleteIndex);
    expect(secondDeleteIndex).toBeGreaterThan(leviamonLeaveIndex);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(leviamonId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

describe("pending trigger matrix: distinct occurrences while pending", () => {
  it("retains two BT24-086 when-played triggers from Nail Bone's sequential plays", async () => {
    cite(
      "comprehensive-0163",
      "§15-4-2-4: another distinct occurrence retriggers an effect that is already pending",
      "7522030f36eed2b3e119b50e1e61bcaa81f17ec521bd21b84fa972c38977119e",
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-086", as: "eiji" },
            { card: "ST6-03", as: "purpleSource" },
          ],
          hand: [{ card: "ST6-16", as: "nailBone" }],
          trash: [
            { card: "ST6-04", as: "rookie" },
            { card: "ST6-08", as: "champion" },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const watcherId = s.inst("eiji").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nailBone").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 4 && s.state.pendingDecision === undefined);
    const plays = s.events
      .filter((event) => event.kind === "cardPlayed")
      .filter((event) => event.kind === "cardPlayed" && ["ST6-04", "ST6-08"].includes(event.cardId));
    expect(plays.map(({ cardId }) => cardId)).toEqual(["ST6-04", "ST6-08"]);
    const watcherActivations = s.events.filter(
      (event) => event.kind === "effectTriggered" && event.sourceInstanceId === watcherId,
    );
    const watcherResolutions = s.events.filter(
      (event) => event.kind === "effectResolved" && event.sourceInstanceId === watcherId,
    );
    expect(watcherActivations).toHaveLength(2);
    expect(watcherResolutions).toHaveLength(2);
    const lastPlayIndex = s.events.indexOf(plays[1]!);
    expect(s.events.indexOf(watcherActivations[0]!)).toBeGreaterThan(lastPlayIndex);
    expect(s.events.indexOf(watcherActivations[1]!)).toBeGreaterThan(lastPlayIndex);
  });
});

describe("pending trigger matrix: immunity during a pending attack watcher", () => {
  it("keeps the Progress attacker selectable for Damemon's paid deletion but unaffected", async () => {
    cite(
      "comprehensive-0204",
      "§15-15-5-1/3 an unaffected Digimon may be chosen but the effect does not affect it",
      "a0c5026053b90aff403636e92356f3e30465f8c74a716171a4c2bde3d6fceb5c",
    );
    cite(
      "comprehensive-0258",
      "§16-39 Progress protects its Digimon from opposing effects while it attacks",
      "2fa0950f448b106aeb8bd953b8c02488f3a276133f598714afe0454dc0cedbec",
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-189", as: "attacker" },
            { card: "AD1-001", as: "otherTarget" },
          ],
        },
        1: {
          battleArea: [{ card: "BT10-070", as: "damemon", under: [{ card: "BT1-009", as: "cost" }] }],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision !== undefined);
    expect(s.state.pendingDecision?.kind).toBe("chooseTargets");
    const req = s.decisions.findLast(
      ({ req: request }) => request.decisionId === s.state.pendingDecision?.decisionId,
    )?.req;
    expect(req?.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([attackerId, s.perm("otherTarget").permanentId]),
    );
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: req!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [attackerId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual(
      expect.arrayContaining([attackerId, s.perm("otherTarget").permanentId]),
    );
  });
});
