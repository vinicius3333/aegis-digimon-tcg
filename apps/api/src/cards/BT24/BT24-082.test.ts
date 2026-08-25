import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_082 } from "./BT24-082.js";
import "../index.js";

describe("BT24-082 Owen Dreadnought", () => {
  it("returns itself to deck bottom and gates the chained Elizamon play", () => {
    const start = BT24_082.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(start?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: { filter: { namesExact: ["Owen Dreadnought"] } },
      cost: { kind: "return", to: "deckBottom" },
      from: ["hand"],
      abortOnDecline: true,
    });
    expect(start?.actions?.[1]).toMatchObject({
      kind: "PlayWithoutCost",
      target: { filter: { namesExact: ["Elizamon"] } },
      from: ["trash"],
      condition: { kind: "youHaveNone", filter: { kind: ["Digimon"] } },
    });
    const watcher = BT24_082.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0] as any;
    expect(watcher).toMatchObject({ event: "whenOneOfYoursDigivolves", cost: { kind: "suspend" } });
    expect(watcher.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "ModifyDP", amount: 3000 }),
        expect.objectContaining({ kind: "Attack" }),
      ]),
    );
  });

  it("returns itself to the deck, plays exact Owen, then plays exact Elizamon when no Digimon remains", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-082", as: "source" }],
          hand: [{ card: "BT21-081", as: "replacement" }],
          trash: [{ card: "BT24-008", as: "elizamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceId = s.perm("source").permanentId;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("source"));
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("elizamon").instanceId,
      ),
    );

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(sourceId);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("replacement").instanceId,
      ),
    ).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT24-082")).toBe(true);
  });

  it("does not process the Elizamon tail when the return-and-play cost is declined (Q5663)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-082", as: "source" }],
          hand: [{ card: "BT21-081", as: "replacement" }],
          trash: [{ card: "BT24-008", as: "elizamon" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("source"));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("elizamon").instanceId);
  });

  it("Q5664: does not activate a start-of-main effect on the Owen played during that window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-082", as: "source" }],
          hand: [{ card: "BT21-081", as: "replacement" }],
        },
        1: { battleArea: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireGlobal(EffectTiming.StartOfYourMainPhase);

    expect(s.state.memory).toBe(0);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("replacement").instanceId,
      ),
    ).toBe(true);
  });

  it("suspends Owen to give the digivolved Reptile 3000 DP and let it attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-082", as: "owen" },
            { card: "BT1-010", as: "reptile" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseDp = s.perm("reptile").currentDP;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("reptile").permanentId,
    });
    await settle(() => observe(s.engine).hasAttackedThisTurn(s.perm("reptile")));

    expect(s.perm("owen").isSuspended).toBe(true);
    expect(s.perm("reptile").currentDP).toBe(baseDp + 3000);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("reptile"))).toBe(true);
  });

  it("grants no DP and no attack when Owen cannot pay the suspension cost (Q5665)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-082", as: "owen", suspended: true },
            { card: "BT1-010", as: "reptile" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseDp = s.perm("reptile").currentDP;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("reptile").permanentId,
    });

    expect(s.perm("reptile").currentDP).toBe(baseDp);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("reptile"))).toBe(false);
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT24-082", as: "owen" }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("owen"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("owen").instanceId),
    );
  });
});
