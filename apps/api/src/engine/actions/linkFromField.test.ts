import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { makeDigimon, makeInstance, settle, setupEngine } from "../testkit/harness.js";
import "../../cards/index.js";

// BT21-009 (Gatchmon): printed "[Link] [Appmon] trait: Cost 1" and carries the [Appmon]
// form itself, so one copy can link to another.
const GATCHMON = "BT21-009";

describe("linkCard from the battle area (§6-5-1-4)", () => {
  it("links one battle-area Digimon's top card to another and trashes its stack", async () => {
    const s = setupEngine();
    const p0 = s.state.players[0]!;
    const recipient = makeDigimon(0, 2000, GATCHMON);
    const source = makeDigimon(0, 2000, GATCHMON);
    const stacked = makeInstance("BT1-009", 0, true);
    source.stack.push(stacked);
    p0.battleArea.push(recipient, source);
    s.state.memory = 1;

    const result = s.engine.applyIntent(0, {
      type: "linkCard",
      instanceId: source.topCard.instanceId,
      targetPermanentId: recipient.permanentId,
    });
    expect(result).toEqual({ ok: true });
    await settle(() => recipient.linked.some((card) => card.instanceId === source.topCard.instanceId));

    expect(p0.battleArea.some((permanent) => permanent.permanentId === source.permanentId)).toBe(false);
    expect(p0.trash.some((card) => card.instanceId === stacked.instanceId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("refuses to link a permanent onto itself", () => {
    const s = setupEngine();
    const p0 = s.state.players[0]!;
    const only = makeDigimon(0, 2000, GATCHMON);
    p0.battleArea.push(only);
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: only.topCard.instanceId,
        targetPermanentId: only.permanentId,
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("refuses the opponent's battle-area card as a link source", () => {
    const s = setupEngine();
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    const recipient = makeDigimon(0, 2000, GATCHMON);
    const theirs = makeDigimon(1, 2000, GATCHMON);
    p0.battleArea.push(recipient);
    p1.battleArea.push(theirs);
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: theirs.topCard.instanceId,
        targetPermanentId: recipient.permanentId,
      }),
    ).toEqual({ ok: false, reason: "card-not-in-zone" });
  });
});

describe("linkTargetPermanentIds projection", () => {
  it("lists the recipients a hand card and a battle-area top card may link to", async () => {
    const s = setupEngine();
    const p0 = s.state.players[0]!;
    const recipient = makeDigimon(0, 2000, GATCHMON);
    const source = makeDigimon(0, 2000, GATCHMON);
    const plain = makeDigimon(0, 3000, "BT1-009");
    const inHand = makeInstance(GATCHMON, 0, false);
    p0.battleArea.push(recipient, source, plain);
    p0.hand.push(inHand);
    s.state.memory = 3;

    await s.engine.recomputeContinuousEffects();

    expect([...inHand.linkTargetPermanentIds].sort()).toEqual([recipient.permanentId, source.permanentId].sort());
    expect([...source.topCard.linkTargetPermanentIds]).toEqual([recipient.permanentId]);
    expect([...plain.topCard.linkTargetPermanentIds]).toEqual([]);
  });

  it("projects nothing when memory cannot cover the link cost", async () => {
    const s = setupEngine();
    const p0 = s.state.players[0]!;
    const recipient = makeDigimon(0, 2000, GATCHMON);
    const inHand = makeInstance(GATCHMON, 0, false);
    p0.battleArea.push(recipient);
    p0.hand.push(inHand);
    // The gauge allows paying down to -10, so only a seat already at the floor cannot pay.
    s.state.memory = -10;

    await s.engine.recomputeContinuousEffects();
    expect([...inHand.linkTargetPermanentIds]).toEqual([]);
  });

  it("clears the projection outside the Main phase", async () => {
    const s = setupEngine();
    const p0 = s.state.players[0]!;
    const recipient = makeDigimon(0, 2000, GATCHMON);
    const inHand = makeInstance(GATCHMON, 0, false);
    p0.battleArea.push(recipient);
    p0.hand.push(inHand);
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();
    expect(inHand.linkTargetPermanentIds.length).toBe(1);

    s.state.phase = Phase.End;
    await s.engine.recomputeContinuousEffects();
    expect([...inHand.linkTargetPermanentIds]).toEqual([]);
  });
});
