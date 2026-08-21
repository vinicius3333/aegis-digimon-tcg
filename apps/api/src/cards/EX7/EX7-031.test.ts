import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-031.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-031", () => {
  it("reduces the cost of its Bird or Avian digivolution by 1", () => expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({ kind: "Replacement", event: "wouldDigivolve", actions: [{ mode: "reduceCost", amount: 1 }] }));
  it("inherits once-per-turn memory gain after a Digimon is deleted in battle", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle", actions: [{ kind: "GainMemory", amount: 1 }] }] }));
  it("gains memory once after its inherited Digimon wins battle", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX7-030", as: "host", under: ["EX7-031"] }] } });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });
    expect(s.state.memory).toBe(1);
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });
    expect(s.state.memory).toBe(1);
  });
});
