import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-017.js";
import "../index.js";

describe("BT16-017", () => {
  it("once per turn gains memory when a different Free or green Digimon is played or digivolves", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        { kind: "SubTrigger", event: "whenPlayed" },
        { kind: "SubTrigger", event: "whenOneOfYoursDigivolves" },
      ],
    }));
  it("gains +2000 DP as an inherited your-turn effect", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    }));

  it("gains memory once from qualifying Free and green plays", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT16-017", as: "host" },
          { card: "BT16-007", as: "freeSubject" },
          { card: "BT3-046", as: "greenSubject" },
        ],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("freeSubject").permanentId });
    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("greenSubject").permanentId });

    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory from a non-Free non-green play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT16-017", as: "host" },
          { card: "BT1-009", as: "subject" },
        ],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("subject").permanentId });

    expect(s.state.memory).toBe(0);
  });

  it("adds +2000 DP to an inherited host during your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-018", as: "host", dp: 6000, under: ["BT16-017"] }] } });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(8000);
  });
});
