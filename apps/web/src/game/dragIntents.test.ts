import { describe, expect, it } from "vitest";
import {
  DRAG_INTENT_LABEL_OFFSET_PX,
  DRAG_INTENT_LABEL_OFFSET_TOUCH_PX,
  dragIntentFor,
  dragIntentLabelKey,
  dragIntentLabelOffsetPx,
  type DragIntent,
} from "./dragIntents";

const playing = { kind: "play" as const, isOption: false, isDigiEgg: false, playable: true };
const option = { kind: "play" as const, isOption: true, isDigiEgg: false, playable: true };
const egg = { kind: "play" as const, isOption: false, isDigiEgg: true, playable: false };
const attacking = { kind: "attack" as const };

describe("dragIntentFor", () => {
  it("offers only evolution destinations when a card cannot be played", () => {
    const evolutionOnly = { ...playing, playable: false };
    expect(dragIntentFor({ drag: evolutionOnly, target: "battle-you" })).toBeNull();
    expect(dragIntentFor({ drag: evolutionOnly, target: "perm-you" })).toBeNull();
    expect(dragIntentFor({ drag: evolutionOnly, target: "perm-you", evolutionRoute: "dna" })).toBe("evolve");
    expect(dragIntentFor({ drag: evolutionOnly, target: "breeding-you", digivolvable: true })).toBe("breeding");
    expect(dragIntentFor({ drag: { ...option, playable: false }, target: "battle-you" })).toBeNull();
  });
  it("plays a Digimon dropped on the battle area", () => {
    expect(dragIntentFor({ drag: playing, target: "battle-you" })).toBe("play");
  });

  it("uses an Option dropped on the battle area", () => {
    expect(dragIntentFor({ drag: option, target: "battle-you" })).toBe("use");
  });

  it("evolves onto a permanent the server offered as a base", () => {
    for (const evolutionRoute of ["normal", "dna", "both"] as const) {
      expect(dragIntentFor({ drag: playing, target: "perm-you", evolutionRoute })).toBe("evolve");
    }
  });

  it("still plays a Digimon dropped on a permanent it cannot evolve", () => {
    expect(dragIntentFor({ drag: playing, target: "perm-you" })).toBe("play");
  });

  it("refuses an Option dropped on a permanent", () => {
    expect(dragIntentFor({ drag: option, target: "perm-you" })).toBeNull();
  });

  it("names the breeding area only while the raised Digimon can be digivolved", () => {
    expect(dragIntentFor({ drag: playing, target: "breeding-you", digivolvable: true })).toBe("breeding");
    expect(dragIntentFor({ drag: playing, target: "breeding-you", digivolvable: false })).toBeNull();
  });

  it("refuses every area for a Digi-Egg, which is hatched rather than dragged", () => {
    expect(dragIntentFor({ drag: egg, target: "battle-you" })).toBeNull();
    expect(dragIntentFor({ drag: egg, target: "breeding-you", digivolvable: true })).toBeNull();
  });

  it("refuses the opponent's half for a hand card", () => {
    expect(dragIntentFor({ drag: playing, target: "opp-security" })).toBeNull();
    expect(dragIntentFor({ drag: playing, target: "perm-opp" })).toBeNull();
  });

  it("attacks only where the server says the attacker may", () => {
    expect(dragIntentFor({ drag: attacking, target: "opp-security", canAttackPlayer: true })).toBe("attack");
    expect(dragIntentFor({ drag: attacking, target: "opp-security", canAttackPlayer: false })).toBeNull();
    expect(dragIntentFor({ drag: attacking, target: "perm-opp", attackable: true })).toBe("attack");
    expect(dragIntentFor({ drag: attacking, target: "perm-opp", attackable: false })).toBeNull();
  });

  it("refuses the viewer's own half for an attack", () => {
    expect(dragIntentFor({ drag: attacking, target: "battle-you" })).toBeNull();
    expect(dragIntentFor({ drag: attacking, target: "perm-you" })).toBeNull();
    expect(dragIntentFor({ drag: attacking, target: "breeding-you" })).toBeNull();
  });
});

describe("dragIntentLabelKey", () => {
  it("gives every intent its own label", () => {
    const intents: DragIntent[] = ["play", "evolve", "breeding", "use", "attack"];
    expect(new Set(intents.map(dragIntentLabelKey)).size).toBe(intents.length);
  });
});

describe("dragIntentLabelOffsetPx", () => {
  it("floats the label further above a finger than above a cursor", () => {
    // A mouse offset only has to clear the ghost card; a fingertip covers a ~40px
    // disc around the contact point and the hand covers everything below it.
    expect(dragIntentLabelOffsetPx(false)).toBe(DRAG_INTENT_LABEL_OFFSET_PX);
    expect(dragIntentLabelOffsetPx(true)).toBe(DRAG_INTENT_LABEL_OFFSET_TOUCH_PX);
    expect(DRAG_INTENT_LABEL_OFFSET_TOUCH_PX).toBeGreaterThan(DRAG_INTENT_LABEL_OFFSET_PX + 40);
  });
});
