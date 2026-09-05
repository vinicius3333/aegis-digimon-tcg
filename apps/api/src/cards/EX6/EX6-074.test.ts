import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-074.js";
import { matchNameOrTrait, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX6-074 Mirei Mikagura", () => {
  it("gains memory when an exact printed-trait Digimon is played, then can digivolve from trash and DNA digivolve at end of turn", () => {
    const runtime = runtimeCompiledCard("EX6-074");
    expect(runtime).toMatchObject({ coverage: "full", residual: [] });
    expect(runtime?.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Holy Beast", "Archangel", "Fallen Angel"], match: "trait" }],
      },
      actions: [
        { kind: "GainMemory", amount: 1, optional: true, abortOnDecline: true, cost: { kind: "suspend" } },
        {
          kind: "Digivolve",
          from: ["trash"],
          reduceCost: 1,
          optional: true,
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          into: {
            nameOrTrait: [{ tokens: ["Angewomon", "LadyDevimon"], match: "nameExact" }],
          },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "DnaDigivolve",
          optional: true,
          payCost: true,
          into: { hasDnaDigivolutionRequirement: true },
        },
      ],
    });
    const digivolveReference = { tokens: ["Angewomon", "LadyDevimon"], match: "nameExact" as const };
    expect(matchNameOrTrait({ nameEn: "Angewomon" }, digivolveReference)).toBe(true);
    expect(matchNameOrTrait({ nameEn: "Angewomon (X Antibody)" }, digivolveReference)).toBe(false);
  });
  it("plays itself without cost from security", () =>
    expect(runtimeCompiledCard("EX6-074")?.effects?.find((entry) => entry.isSecurity)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
    }));
  it("publicly suspends Mirei and gains memory when a Holy Beast is played", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-074", as: "mirei" }], hand: [{ card: "BT1-046", as: "holy" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).verb.playInstances([s.inst("holy").instanceId]);
    expect(s.perm("mirei").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("publicly digivolves another own Digimon from trash after a qualifying play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-074", as: "mirei" },
            { card: "BT1-055", as: "base" },
            { card: "BT1-053", as: "other" },
          ],
          hand: [{ card: "BT1-046", as: "holy" }],
          trash: [{ card: "BT11-042", as: "angewomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("other").topCard!.instanceId);
    s.state.memory = 2;
    await advance(s.engine).verb.playInstances([s.inst("holy").instanceId]);

    expect(s.perm("other").topCard?.cardId).toBe("BT11-042");
    expect(s.perm("base").topCard?.cardId).toBe("BT1-055");
    expect(s.perm("mirei").isSuspended).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("publicly DNA digivolves once at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-074", as: "mirei" },
            { card: "BT10-061", as: "blackOne" },
            { card: "BT10-035", as: "yellowOne" },
            { card: "BT10-061", as: "blackTwo" },
            { card: "BT10-035", as: "yellowTwo" },
          ],
          hand: [
            { card: "BT16-063", as: "resultOne" },
            { card: "BT16-063", as: "resultTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("mirei"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT16-063"));
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("mirei"));

    expect(s.state.players[0]!.battleArea.filter((perm) => perm.topCard?.cardId === "BT16-063")).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("resultTwo").instanceId)).toBe(true);
  });

  it("publicly plays Mirei from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "EX6-074", as: "mirei", faceUp: true }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("mirei"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-074"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-074")).toBe(true);
  });
});
