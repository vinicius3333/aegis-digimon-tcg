import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-073.js";
import "../index.js";
describe("BT21-073 Charismon", () => {
  it("links from trash or stack and grants the once-per-turn attack token", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
    );
    expect(compiled.effects.filter((e) => e.trigger === "OnPlay" || e.trigger === "WhenDigivolving")).toHaveLength(2);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        frequency: "OncePerTurn",
        actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenLinked" })],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        isLinked: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "Replacement",
            event: "wouldLeavePlay",
            actions: [
              expect.objectContaining({
                kind: "Prevent",
                cost: expect.objectContaining({
                  kind: "trash",
                  target: { filter: { isSelfRef: true, zone: "linked" }, count: 1 },
                }),
              }),
            ],
          }),
        ],
      }),
    );
    expect(compiled.effects.filter((e) => e.trigger === "OnPlay" || e.trigger === "WhenDigivolving")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actions: [
            expect.objectContaining({
              kind: "Link",
              recipient: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            }),
          ],
        }),
      ]),
    );
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Sociamon", "Gossipmon"], cost: 0 }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("links an eligible Appmon from trash when played", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-073", as: "charismon" }],
          trash: [{ card: "BT21-070", as: "gossipmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("charismon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("charismon").linked.some((card) => card.cardId === "BT21-070"));

    expect(s.perm("charismon").linked.some((card) => card.cardId === "BT21-070")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT21-070")).toBe(false);
  });

  it("links an eligible card from its own digivolution stack on evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-073",
              as: "charismon",
              under: [{ card: "BT21-070", as: "gossipmon" }],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("charismon"));
    await settle(() => s.perm("charismon").linked.length === 1);

    expect(s.perm("charismon").linked[0]?.instanceId).toBe(s.inst("gossipmon").instanceId);
    expect(s.perm("charismon").stack).toHaveLength(0);
  });

  it("does not link a card from another Digimon's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-073",
              as: "charismon",
            },
            {
              card: "BT21-041",
              as: "otherHost",
              under: [{ card: "BT21-070", as: "otherCard" }],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("charismon"));

    expect(s.perm("charismon").linked).toHaveLength(0);
    expect(s.perm("otherHost").stack).toHaveLength(1);
  });

  it.each([
    ["a card without Link", "BT1-009"],
    ["a level 5 Link card", "BT21-073"],
  ])("Q4581 does not link %s", async (_label, candidate) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-073", as: "charismon" }],
          trash: [{ card: candidate, as: "candidate" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("charismon"));
    expect(s.perm("charismon").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(true);
  });

  it("grants a selected opponent the forced start-of-main attack effect when linked", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-073", as: "charismon" }],
          hand: [{ card: "BT21-070", as: "gossipmon" }],
          security: [{ card: "BT1-009", as: "security" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 6000 }], deck: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("gossipmon").instanceId,
        targetPermanentId: s.perm("charismon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).customEffectGrants(s.perm("target")).length === 1);
    expect(observe(s.engine).customEffectGrants(s.perm("target"))).toHaveLength(1);

    // The grant's [Start of Your Main Phase] trigger is consumed through the public turn
    // lifecycle on the opponent's next turn, rather than by firing a synthetic timing hook.
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    // Charismon is itself a Blocker; explicitly decline that optional block so the granted
    // attack reaches the player's security and remains distinct from a blocked attack.
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("does not react when another Digimon gets linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-073", as: "charismon" },
            { card: "BT21-041", as: "otherHost" },
          ],
          hand: [{ card: "BT21-070", as: "gossipmon" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("gossipmon").instanceId,
        targetPermanentId: s.perm("otherHost").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("otherHost").linked.length === 1);

    expect(observe(s.engine).customEffectGrants(s.perm("target"))).toHaveLength(0);
  });

  it("Q5000 trashes one link card to prevent leaving only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              // BT21-101's printed Link +1 makes this two-link fixture legal.
              card: "BT21-101",
              as: "host",
              linked: [
                { card: "BT21-070", as: "gossipmon" },
                { card: "BT21-073", as: "charismon" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    // Keep Charismon itself linked so its inherited replacement remains installed for the
    // second leave attempt; pay the first prevention with the other Link card.
    preferred.push(s.inst("gossipmon").instanceId);

    expect(s.perm("host").linked.map((card) => card.instanceId)).toContain(s.inst("charismon").instanceId);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(0);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("gossipmon").instanceId));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("host").linked.some((card) => card.instanceId === s.inst("charismon").instanceId)).toBe(true);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("Q5000 may trash Charismon itself when it is the only Link card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-041", as: "host", linked: [{ card: "BT21-073", as: "charismon" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("charismon").instanceId);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(0);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("charismon").instanceId));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("has executable Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT21-073", as: "charismon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("charismon"), "Blocker")).toBe(true);
  });

  it("supports the printed zero-cost Sociamon plus Gossipmon App Fusion route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-043", as: "sociamon", linked: [{ card: "BT21-070", as: "gossipmon" }] }],
          hand: [{ card: "BT21-073", as: "charismon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;

    const fused = await advance(s.engine).verb.appFuseInto(
      s.perm("sociamon").permanentId,
      s.inst("charismon").instanceId,
    );
    expect(fused?.topCard.cardId).toBe("BT21-073");
    expect(fused?.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT21-043"]));
    expect(fused?.linked.map((card) => card.cardId)).toContain("BT21-070");
    expect(s.state.memory).toBe(0);
  });
});
