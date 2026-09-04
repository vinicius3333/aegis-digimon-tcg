import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-031.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-031", () => {
  it("reduces the cost of its Bird or Avian digivolution by 1", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      into: { nameOrTrait: [{ tokens: ["Bird", "Avian"], match: "traitContains" }] },
      actions: [{ mode: "reduceCost", amount: 1 }],
    }));
  it("inherits once-per-turn memory gain after a Digimon is deleted in battle", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    }));
  it("gains memory once after its inherited Digimon wins battle", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX7-030", as: "host", under: ["EX7-031"] }] } });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });
    expect(s.state.memory).toBe(1);
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });
    expect(s.state.memory).toBe(1);
  });

  it("reduces a Bird digivolution cost by 1, but not a non-Bird digivolution", async () => {
    const bird = setupEngine({
      0: { battleArea: [{ card: "EX7-031", as: "host" }], hand: [{ card: "EX7-032", as: "bird" }] },
    });
    bird.state.memory = 2;
    await bird.ready();
    expect(
      bird.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: bird.perm("host").permanentId,
        instanceId: bird.inst("bird").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => bird.perm("host").topCard?.cardId === "EX7-032");
    expect(bird.state.memory).toBe(1);

    const nonBird = setupEngine({
      0: { battleArea: [{ card: "EX7-031", as: "host" }], hand: [{ card: "BT1-069", as: "other" }] },
    });
    nonBird.state.memory = 2;
    await nonBird.ready();
    expect(
      nonBird.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: nonBird.perm("host").permanentId,
        instanceId: nonBird.inst("other").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => nonBird.perm("host").topCard?.cardId === "BT1-069");
    expect(nonBird.state.memory).toBe(0);
  });
});
