import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-141.js";

describe("P-141 MameTyramon", () => {
  it("encodes Collision, Blocker, and the Rule name treatment", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-141", as: "source" }] } });

    const effects = getCompiledCard("P-141")?.effects ?? [];
    expect(effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Collision", raw: "＜Collision＞" }] }),
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
        expect.objectContaining({
          trigger: "Rule",
          actions: [expect.objectContaining({ kind: "GrantStatic", grant: "name", tokens: ["Mamemon", "Tyrannomon"] })],
        }),
      ]),
    );
    assertNoLoudGap(s);
  });

  it("encodes the once-per-turn unsuspend triggers for both top and inherited effects", () => {
    const effects = getCompiledCard("P-141")?.effects ?? [];
    expect(effects.filter((effect) => effect.trigger === "AllTurns")).toHaveLength(2);
    expect(effects.filter((effect) => effect.trigger === "AllTurns")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          frequency: "OncePerTurn",
          actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenSuspended" })],
        }),
        expect.objectContaining({
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenSuspended" })],
        }),
      ]),
    );
    expect(getCompiledCard("P-141")?.digivolutionRequirement).toEqual([
      { level: 4, names: ["Mamemon", "Tyrannomon"], cost: 3, isAlternate: true },
    ]);
  });

  it("unsuspends after an opponent Digimon becomes suspended", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-141", as: "mame", suspended: true }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId], 1);
    await settle();
    expect(s.perm("mame").isSuspended).toBe(false);
  });

  it("exposes both printed battle keywords and the Mamemon/Tyrannomon rule names", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-141", as: "mame" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("mame"), "Collision")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("mame"), "Blocker")).toBe(true);
    expect(observe(s.engine).effectiveNames(s.perm("mame"))).toEqual(expect.arrayContaining(["mamemon", "tyrannomon"]));
  });

  it("runs the inherited unsuspend trigger through a higher host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", suspended: true, under: [{ card: "P-141", as: "inherited" }] }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId], 1);
    await settle();
    expect(s.perm("host").isSuspended).toBe(false);
  });
});
