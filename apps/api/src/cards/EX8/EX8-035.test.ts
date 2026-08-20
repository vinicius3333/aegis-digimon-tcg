import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-035.js";

describe("EX8-035", () => {
  it("has a security effect that gives two opposing Digimon Security Attack -1 and returns itself to hand", () => expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions).toMatchObject([{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 }, target: { count: 2 } }, { kind: "AddToHandSelf" }]));
  it("disables opposing Digimon When Digivolving effects while you have at least 1 memory", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ condition: { kind: "memoryAtLeast", value: 1 }, actions: [{ kind: "DisableTimingEffect", timings: ["whenDigivolving"], target: { count: "all" } }] }));
});
