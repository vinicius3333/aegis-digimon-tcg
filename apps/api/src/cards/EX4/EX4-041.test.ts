import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-041.js";

describe("EX4-041 DeadlyAxemon", () => {
  it("draws two by optionally trashing a Blue Flare or Twilight card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Draw",
      amount: 2,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "trash",
        target: { filter: { nameOrTrait: [{ match: "trait", tokens: ["Blue Flare", "Twilight"] }] } },
      },
    });
  });
  it("reveals a Blue Flare or Twilight card on deletion and permanently gains 1000 DP inherited", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 1,
      rest: "trash",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-041");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("draws two only after paying the Blue Flare/Twilight trash cost", async () => {
    const paid = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-041", as: "subject" }],
          hand: [{ card: "EX4-014", as: "cost" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await paid.ready();
    const handBefore = paid.state.players[0]!.hand.length;
    await advance(paid.engine).fire(EffectTiming.OnPlay, paid.perm("subject"));
    await settle(() => paid.state.players[0]!.trash.some((card) => card.instanceId === paid.inst("cost").instanceId));
    expect(paid.state.players[0]!.trash.map((card) => card.instanceId)).toContain(paid.inst("cost").instanceId);
    expect(paid.state.players[0]!.hand.length).toBe(handBefore + 1);

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-041", as: "subject" }],
          hand: [{ card: "EX4-014", as: "cost" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await declined.ready();
    const deckBefore = declined.state.players[0]!.deck.length;
    await advance(declined.engine).fire(EffectTiming.OnPlay, declined.perm("subject"));
    await settle();
    expect(declined.state.players[0]!.deck).toHaveLength(deckBefore);
    expect(declined.state.players[0]!.hand.map((card) => card.instanceId)).toContain(declined.inst("cost").instanceId);
  });

  it("adds a matching deletion reveal and trashes a non-matching card", async () => {
    const matching = setupEngine(
      { 0: { battleArea: [{ card: "EX4-041", as: "subject" }], deck: ["EX4-021"] } },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await matching.ready();
    await advance(matching.engine).verb.deletePermanent([matching.perm("subject").permanentId], "byEffect");
    await settle(() => matching.state.players[0]!.hand.some((card) => card.cardId === "EX4-021"));
    expect(matching.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX4-021");

    const nonMatching = setupEngine(
      { 0: { battleArea: [{ card: "EX4-041", as: "subject" }], deck: ["BT1-012"] } },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await nonMatching.ready();
    await advance(nonMatching.engine).verb.deletePermanent([nonMatching.perm("subject").permanentId], "byEffect");
    await settle(() => nonMatching.state.players[0]!.trash.some((card) => card.cardId === "BT1-012"));
    expect(nonMatching.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT1-012");
    expect(nonMatching.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-012");
  });

  it("gives a host +1000 DP through the inherited All Turns effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "host", under: ["EX4-041"] }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(false);
    expect(s.perm("host").currentDP).toBe(3000);
  });
  ex4CardBehaviorTests("EX4-041");
});
