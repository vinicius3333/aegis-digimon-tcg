import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-007.js";
import "../index.js";

describe("BT16-007", () => {
  it("once per turn gains memory when a different Free or yellow Digimon is played or digivolves", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        { kind: "SubTrigger", event: "whenPlayed" },
        { kind: "SubTrigger", event: "whenOneOfYoursDigivolves" },
      ],
    });
  });
  it("once per turn suspends an opposing Digimon when attacking", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Suspend" }],
    }));

  it("gains memory once for qualifying Free and yellow plays", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT16-007", as: "host" },
          { card: "BT8-053", as: "freeSubject" },
          { card: "BT16-029", as: "yellowSubject" },
        ],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("freeSubject").permanentId });
    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("yellowSubject").permanentId });

    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory for a different-color non-Free play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT16-007", as: "host" },
          { card: "BT1-009", as: "subject" },
        ],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("subject").permanentId });

    expect(s.state.memory).toBe(0);
  });

  it("suspends an opponent Digimon when the inherited host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-008", as: "host", under: ["BT16-007"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.perm("target").isSuspended).toBe(true);
  });
});
