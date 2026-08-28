import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-057.js";

describe("BT18-057 KoKabuterimon", () => {
  it("reduces a qualifying multicolor black-and-yellow digivolution by one", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          sourceFilter: { controller: "mine", or: [{ isSelfRef: true }, { kind: ["Tamer"] }] },
          into: { multicolor: true, colors: ["Yellow", "Black"] },
          actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-057", as: "koKabuterimon" }], hand: [{ card: "BT11-040", as: "sukamon" }] },
    });
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("koKabuterimon").permanentId,
        instanceId: s.inst("sukamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koKabuterimon").topCard?.cardId === "BT11-040");
    expect(s.state.memory).toBe(9);
    expect(getCardDefinition("BT11-040")?.colors).toEqual(["Yellow", "Black"]);
    assertNoLoudGap(s);
  });

  it("reduces a friendly Tamer evolution but only once in the turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-057", as: "koKabuterimon" },
          { card: "BT18-091", as: "jp" },
        ],
        hand: [
          { card: "BT11-040", as: "sukamon" },
          { card: "BT18-063", as: "beetle" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(observe(s.engine).costReduction("wouldDigivolve", s.perm("jp"), getCardDefinition("BT18-063"))).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("koKabuterimon").permanentId,
        instanceId: s.inst("sukamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koKabuterimon").topCard?.cardId === "BT11-040");
    expect(s.state.memory).toBe(4);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("jp").permanentId,
        instanceId: s.inst("beetle").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("jp").topCard?.cardId === "BT18-063");
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("does not reduce another friendly Digimon's qualifying evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-057", as: "koKabuterimon" },
          { card: "BT11-036", as: "other" },
        ],
        hand: [{ card: "BT11-040", as: "sukamon" }],
      },
    });
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("other").permanentId,
        instanceId: s.inst("sukamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("other").topCard?.cardId === "BT11-040");

    expect(s.state.memory).toBe(8);
    assertNoLoudGap(s);
  });

  it("covers Q2989 and destination/turn boundaries", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-057", as: "koKabuterimon" },
          { card: "BT18-091", as: "jp" },
        ],
        breeding: { card: "BT18-057", as: "breedingKoKabuterimon" },
      },
    });
    await s.ready();

    expect(
      observe(s.engine).costReduction("wouldDigivolve", s.perm("breedingKoKabuterimon"), getCardDefinition("BT11-040")),
    ).toBe(0);
    expect(
      observe(s.engine).costReduction("wouldDigivolve", s.perm("koKabuterimon"), getCardDefinition("AD1-004")),
    ).toBe(1);
    expect(
      observe(s.engine).costReduction("wouldDigivolve", s.perm("koKabuterimon"), getCardDefinition("BT1-030")),
    ).toBe(0);
    expect(
      observe(s.engine).costReduction("wouldDigivolve", s.perm("koKabuterimon"), getCardDefinition("BT10-012")),
    ).toBe(0);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).costReduction("wouldDigivolve", s.perm("jp"), getCardDefinition("BT18-063"))).toBe(0);
    assertNoLoudGap(s);
  });

  it("grants inherited Blocker only to its host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-030", as: "host", under: ["BT18-057"] },
          { card: "BT1-030", as: "other" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(false);
    assertNoLoudGap(s);
  });
});
