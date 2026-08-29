import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-025.js";
import "../index.js";

describe("BT24-025 Shellmon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-025")).toMatchObject({
      cardId: "BT24-025",
      nameEn: "Shellmon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Mollusk", "Iliad", "TS", "Aquatic"],
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
    });
  });

  it("digivolves on another blue TS Digimon's unsuspend, ignoring only level", () => {
    const sub = compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions?.[0] as any;
    expect(sub).toMatchObject({
      kind: "SubTrigger",
      event: "whenUnsuspended",
      sourceFilter: { excludeSelf: true, colors: ["Blue"] },
    });
    expect(sub.actions[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      payCost: true,
      ignoreLevelRequirement: true,
      optional: true,
    });
  });

  it("keeps the once-per-turn end-of-turn unsuspend and inherited Jamming", () => {
    const end = compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn") as any;
    expect(end.frequency).toBe("OncePerTurn");
    expect(end.actions[0]).toMatchObject({ kind: "Unsuspend", optional: true });
    expect(compiled.effects.find((effect) => effect.isInherited)?.keywords?.[0]?.keyword).toBe("Jamming");
  });

  it.each([
    ["printed blue requirement", 0, 4],
    ["TS alternate requirement", 1, 3],
  ])("ignores level but lets the player choose the %s for cost %i (Q5604)", async (_label, option, cost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-025", as: "shellmon" },
            { card: "BT24-020", as: "trigger" },
          ],
          hand: [{ card: "BT24-040", as: "venusmon" }],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: option,
      },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      unsuspendedPermanentId: s.perm("trigger").permanentId,
    });
    await settle(() => s.perm("shellmon").topCard.instanceId === s.inst("venusmon").instanceId);

    expect(s.state.memory).toBe(10 - cost);
  });

  it("does not ignore color or trait requirements for an incompatible Venusmon (Q5603)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-025", as: "shellmon" },
            { card: "BT24-020", as: "trigger" },
          ],
          hand: [{ card: "BT10-042", as: "venusmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      unsuspendedPermanentId: s.perm("trigger").permanentId,
    });

    expect(s.perm("shellmon").topCard.cardId).toBe("BT24-025");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("venusmon").instanceId);
    expect(s.state.memory).toBe(10);
  });

  it("only reacts to another blue TS Digimon's unsuspend", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-025", as: "shellmon" },
            { card: "BT24-011", as: "redTs" },
            { card: "BT24-020", as: "blueTs" },
          ],
          hand: [{ card: "BT24-040", as: "venusmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      unsuspendedPermanentId: s.perm("redTs").permanentId,
    });
    expect(s.perm("shellmon").topCard.cardId).toBe("BT24-025");
    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      unsuspendedPermanentId: s.perm("blueTs").permanentId,
    });
    await settle(() => s.perm("shellmon").topCard.cardId === "BT24-040");

    expect(s.perm("shellmon").topCard.cardId).toBe("BT24-040");
  });

  it("may unsuspend one other TS Digimon at end of turn and grants inherited Jamming", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-025", as: "shellmon" },
            { card: "BT24-020", as: "tsTarget", suspended: true },
            { card: "BT1-009", as: "nonTs", suspended: true, under: ["BT24-025"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("nonTs"), "Jamming")).toBe(true);
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("shellmon"));

    expect(s.perm("tsTarget").isSuspended).toBe(false);
    expect(s.perm("nonTs").isSuspended).toBe(true);
  });
});
