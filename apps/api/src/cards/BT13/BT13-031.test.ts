import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-031.js";

describe("BT13-031 MirageGaogamon", () => {
  it("registers Evade, Tamer bounce, and the once-per-turn Thomas trigger", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [expect.objectContaining({ keyword: "Evade" })],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Return", to: "hand", target: { filter: { controller: "opponent", kind: ["Tamer"] }, count: 1 } },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToOpponentHand",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["hand"],
              payCost: false,
              optional: true,
              target: {
                filter: { controller: "mine", nameOrTrait: [{ match: "nameExact", tokens: ["Thomas H. Norstein"] }] },
                count: 1,
              },
            },
          ],
        },
      ],
    });
  });

  it("plays Thomas when an effect adds a card to the opponent's hand", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-031", as: "mirage" }], hand: [{ card: "BT13-097", as: "thomas" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 0 });
    expect(s.state.players[0]!.hand).toContain(s.inst("thomas"));

    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });
    await settle(
      () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-097"),
      3000,
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-097")).toBe(true);
  });

  it("returns only an opposing Tamer when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-029", as: "base" }],
          hand: [{ card: "BT13-031", as: "mirage" }],
        },
        1: {
          battleArea: [
            { card: "BT9-086", as: "tamer" },
            { card: "BT13-021", as: "digimon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    const tamerTop = s.perm("tamer").topCard;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mirage").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.includes(tamerTop));

    expect(s.state.players[1]!.hand).toContain(tamerTop);
    expect(s.state.players[1]!.battleArea).toContain(s.perm("digimon"));
    expect(s.state.memory).toBe(2);
  });

  it("uses Evade to suspend and prevent effect deletion", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-031", as: "mirage" }] } });
    const mirageId = s.perm("mirage").permanentId;
    await s.ready();

    const deletion = advance(s.engine).verb.deletePermanent([mirageId], "byEffect");
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId: mirageId, accept: true })).toEqual({ ok: true });
    expect(await deletion).toBe(0);

    expect(s.perm("mirage").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("mirage"));
  });

  it("plays at most one Thomas per turn across repeated qualifying events", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-031", as: "mirage" }],
          hand: [
            { card: "BT13-097", as: "first-thomas" },
            { card: "BT13-097", as: "second-thomas" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });
    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });

    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "BT13-097")).toHaveLength(1);
    expect(s.state.players[0]!.hand.filter(({ cardId }) => cardId === "BT13-097")).toHaveLength(1);
  });

  it("allows its controller to decline playing Thomas", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-031", as: "mirage" }],
          hand: [{ card: "BT13-097", as: "thomas" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });

    expect(s.state.players[0]!.hand).toContain(s.inst("thomas"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("exposes Evade as an active keyword", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-031", as: "mirage" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("mirage"), "Evade")).toBe(true);
  });
});
