import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-017.js";
import "../BT3/BT3-046.js";
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

  it("gains memory once from a naturally played Free Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-017", as: "host" }], hand: [{ card: "BT16-007", as: "freeSubject" }] },
    });
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("freeSubject").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("freeSubject").topCard?.cardId === "BT16-007");

    expect(s.state.memory).toBe(2);
  });

  it("does not gain memory from a naturally played non-Free non-green Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT16-017", as: "host" }],
        hand: [{ card: "BT1-009", as: "subject" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("subject").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("subject").topCard?.cardId === "BT1-009");

    expect(s.state.memory).toBe(0);
  });

  it("checks the post-evolution Digimon when a natural evolution fires the watcher (Q2616)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-017", as: "host" },
            { card: "BT3-046", as: "evolvingSubject" },
          ],
          hand: [{ card: "BT16-018", as: "evolvedSubject" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("evolvingSubject").permanentId,
        instanceId: s.inst("evolvedSubject").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("evolvingSubject").topCard?.cardId === "BT16-018");

    expect(s.state.memory).toBe(1);
  });

  it("adds +2000 DP to an inherited host during your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-018", as: "host", dp: 6000, under: ["BT16-017"] }] } });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(8000);
  });
});
