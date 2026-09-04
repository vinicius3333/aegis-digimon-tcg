import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-040.js";

describe("EX4-040 SkullKnightmon", () => {
  it("optionally plays Nene Amano from hand only when none is already in play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { filter: { nameOrTrait: [{ match: "nameExact", tokens: ["Nene Amano"] }] } },
      condition: { kind: "youHaveNone", filter: { nameOrTrait: [{ match: "nameExact", tokens: ["Nene Amano"] }] } },
    });
  });
  it("reveals one Blue Flare or Twilight card on deletion and has inherited unsuspend", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 1,
      rest: "trash",
      add: [{ filter: { nameOrTrait: [{ match: "trait", tokens: ["Blue Flare", "Twilight"] }] } }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "Reboot" }],
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-040");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("plays the Nene alias from hand only when no Nene is already in play", async () => {
    const positive = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-040", as: "subject" }],
          hand: [{ card: "EX4-062", as: "nene" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await positive.ready();
    await advance(positive.engine).fire(EffectTiming.OnPlay, positive.perm("subject"));
    await settle(() => positive.perm("nene").topCard?.cardId === "EX4-062");
    expect(positive.perm("nene").topCard?.cardId).toBe("EX4-062");

    const blocked = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-040", as: "subject" },
            { card: "EX4-062", as: "existing" },
          ],
          hand: [{ card: "EX4-062", as: "nene" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await blocked.ready();
    await advance(blocked.engine).fire(EffectTiming.OnPlay, blocked.perm("subject"));
    await settle();
    expect(blocked.state.players[0]!.hand.some((card) => card.instanceId === blocked.inst("nene").instanceId)).toBe(
      true,
    );
  });

  it("does not treat a longer Nene name as an exact Nene Amano target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-040", as: "subject" }],
          hand: [{ card: "EX10-064", as: "longNeneName" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("subject"));
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("longNeneName").instanceId);
  });

  it("adds only a trait-matching deletion reveal and trashes the non-matching card", async () => {
    const positive = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-040", as: "subject" }], deck: ["EX4-021"] },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await positive.ready();
    await advance(positive.engine).verb.deletePermanent([positive.perm("subject").permanentId], "byEffect");
    await settle(() => positive.state.players[0]!.hand.some((card) => card.cardId === "EX4-021"));
    expect(positive.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX4-021");

    const negative = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-040", as: "subject" }], deck: ["BT1-012"] },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await negative.ready();
    await advance(negative.engine).verb.deletePermanent([negative.perm("subject").permanentId], "byEffect");
    await settle(() => negative.state.players[0]!.trash.some((card) => card.cardId === "BT1-012"));
    expect(negative.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT1-012");
    expect(negative.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-012");
  });

  it("executes inherited Reboot during the opponent's unsuspend phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "host", suspended: true, under: ["EX4-040"] }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    await (s.engine as unknown as { unsuspendForActivePhase(seat: 0 | 1): Promise<string[]> }).unsuspendForActivePhase(
      1,
    );
    expect(s.perm("host").isSuspended).toBe(false);
  });
  ex4CardBehaviorTests("EX4-040");
});
