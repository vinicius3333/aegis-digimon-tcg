import { describe, expect, it } from "vitest";
import { EffectDuration, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-070.js";

describe("EX11-070 Unchained", () => {
  it("preserves the printed Tamer, inherited text, and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-070")).toMatchObject({
      nameEn: "Unchained",
      colors: ["White"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["LIBERATOR"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("sets memory to 3 at the start of your turn from 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-070", as: "unchained" }] } });
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("unchained"));
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("Mind Links without requiring the preceding DNA digivolution (Q5940, Q5942)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-070", as: "unchained" },
            { card: "EX11-029", as: "maquinamonText" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("unchained"));

    expect(s.perm("maquinamonText").stack.map(({ cardId }) => cardId)).toContain("EX11-070");
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX11-070")).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("Mind Links only with a Digimon that has [Maquinamon] in its text", async () => {
    // AD1-001 Greymon is listed first and would be taken by an unfiltered recipient pool.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-001", as: "plainDigimon" },
            { card: "EX11-070", as: "unchained" },
            { card: "EX11-029", as: "maquinamonText" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("unchained"));
    await settle();

    expect(s.perm("maquinamonText").stack.map(({ cardId }) => cardId)).toContain("EX11-070");
    expect(s.perm("plainDigimon").stack).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("DNA digivolves exactly 2 Digimon into ExMaquinamon from hand before Mind Link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-070", as: "unchained" },
            { card: "EX11-034", as: "firstMaterial" },
            { card: "EX11-045", as: "secondMaterial" },
          ],
          hand: [{ card: "EX11-073", as: "result" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("unchained"));

    expect(s.perm("result").topCard.cardId).toBe("EX11-073");
    expect(s.perm("result").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX11-034", "EX11-045"]),
    );
    expect(s.state.memory).toBe(7);
    assertNoLoudGap(s);
  });

  it("clamps the inherited host after summed DP changes and blocks only opposing stack trash (Q5941-Q5943)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-029", as: "host", under: [{ card: "EX11-070", as: "unchained" }] }],
      },
    });
    await s.ready();

    await advance(s.engine).verb.modifyDP(s.perm("host").permanentId, 2000, EffectDuration.UntilEachTurnEnd);
    await advance(s.engine).verb.modifyDP(s.perm("host").permanentId, -7000, EffectDuration.UntilEachTurnEnd);
    expect(s.perm("host").currentDP).toBe(1000);

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [s.inst("unchained").instanceId],
      1,
    );
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toContain("EX11-070");

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [s.inst("unchained").instanceId],
      0,
    );
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX11-070");
    assertNoLoudGap(s);
  });

  it("clamps a [Maquinamon] host but leaves a host without that text unprotected (Q5942/Q5943)", async () => {
    // Both hosts print 5000 DP and carry the same Unchained beneath them. Only EX11-029 has
    // [Maquinamon] in its text; AD1-001 Greymon does not, so `selfTopHasText` must reject it and
    // neither the 1000 DP floor nor the stack-trash lock may be installed on it.
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX11-029", as: "maquinamonHost", under: [{ card: "EX11-070", as: "protected" }] },
          { card: "AD1-001", as: "plainHost", under: [{ card: "EX11-070", as: "unprotected" }] },
        ],
      },
    });
    await s.ready();

    for (const alias of ["maquinamonHost", "plainHost"]) {
      await advance(s.engine).verb.modifyDP(s.perm(alias).permanentId, -4500, EffectDuration.UntilEachTurnEnd);
    }
    expect(s.perm("maquinamonHost").currentDP).toBe(1000);
    expect(s.perm("plainHost").currentDP).toBe(500);

    // Opponent-driven digivolution-card trash: locked on the [Maquinamon] host, allowed on the other.
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("maquinamonHost").permanentId,
      [s.inst("protected").instanceId],
      1,
    );
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("plainHost").permanentId,
      [s.inst("unprotected").instanceId],
      1,
    );

    expect(s.perm("maquinamonHost").stack.map(({ cardId }) => cardId)).toContain("EX11-070");
    expect(s.perm("plainHost").stack).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("plays inherited Unchained from its own stack at end of all turns (Q6523)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-029", as: "host", under: [{ card: "EX11-070", as: "unchained" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("host"));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-070")).toBe(true);
    expect(s.perm("host").stack).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("plays only the Unchained under the resolving host, never another Digimon's copy", async () => {
    // "from THIS Digimon's digivolution cards". The other host is listed FIRST, so an unscoped
    // candidate pool would offer its copy ahead of the resolving host's own.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-029", as: "otherHost", under: [{ card: "EX11-070", as: "otherUnchained" }] },
            { card: "EX11-029", as: "host", under: [{ card: "EX11-070", as: "unchained" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("host"));

    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.perm("otherHost").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("otherUnchained").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("publishes full exclusive IR for every printed clause", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")?.actions).toMatchObject([
      { kind: "DnaDigivolve", materials: { count: 2 }, payCost: true, optional: true },
      { kind: "MindLink", target: { filter: { textContains: "Maquinamon" } }, optional: true },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toMatchObject([
      { kind: "MinDpFloor", floor: 1000 },
      { kind: "StackTrashLock" },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfAllTurns")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["digivolutionCards"],
          // Scopes the play to the host's own stack; without it the pool is every
          // digivolution card the controller owns.
          target: { filter: { hostFilter: { isSelfRef: true } } },
        },
      ],
    });
  });
  it("may decline the Mind Link at the end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-070", as: "unchained" },
            { card: "EX11-029", as: "host" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("unchained"));
    await settle();
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-070")).toBe(true);
  });
});
