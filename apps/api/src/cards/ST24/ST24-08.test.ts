import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("ST24-08 Lalamon", () => {
  it("reduces only DATA SQUAD digivolutions by 1 and inherits +1000 DP", () => {
    const compiled = registeredCompiledCards.get("ST24-08") ?? getCompiledCard("ST24-08")!;
    expect(compiled.effects.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }],
          },
          actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    });
  });

  it("reduces a qualifying battle-area digivolution in the live engine", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST24-08", as: "lalomon" }], hand: [{ card: "ST24-09", as: "qualifying" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lalomon").permanentId,
        instanceId: s.inst("qualifying").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 9);
    expect(s.state.memory).toBe(9);
  });

  it("does not reduce a non-DATA SQUAD green digivolution", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST24-08", as: "lalomon" }], hand: [{ card: "BT1-072", as: "nonqualifying" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lalomon").permanentId,
        instanceId: s.inst("nonqualifying").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 8);
    expect(s.state.memory).toBe(8);
  });

  it("does not reduce a breeding-area digivolution", async () => {
    const s = setupEngine({
      0: { breeding: { card: "ST24-08", as: "lalomon" }, hand: [{ card: "ST24-09", as: "qualifying" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lalomon").permanentId,
        instanceId: s.inst("qualifying").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 8);
    expect(s.state.memory).toBe(8);
  });

  it("applies inherited +1000 DP when Lalamon is under a battle-area Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST24-09", as: "host", under: [{ card: "ST24-08", as: "lalomon" }] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
  });
});
