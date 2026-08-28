import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-058.js";

describe("EX11-058 Yao Qinglan", () => {
  it("preserves the printed Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-058")).toMatchObject({
      nameEn: "Yao Qinglan",
      colors: ["Blue"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("places an Aqua or Sea Animal card under a matching Digimon and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-008", as: "host" },
            { card: "EX11-058", as: "yao" },
          ],
          hand: ["BT23-023"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("yao"));
    expect(s.state.memory).toBe(1);
    expect(s.perm("host").stack.some((card) => card.cardId === "BT23-023")).toBe(true);
    assertNoLoudGap(s);
  });

  it("suspends to draw when an Aqua or Sea Animal Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-008", as: "gizamon" },
            { card: "EX11-058", as: "yao" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("gizamon").permanentId });
    await settle(() => s.perm("yao").isSuspended);

    expect(s.perm("yao").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.length).toBe(handBefore + 1);
    assertNoLoudGap(s);
  });

  it("leaves Yao unsuspended and draws nothing when the suspend cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-008", as: "gizamon" },
            { card: "EX11-058", as: "yao" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("gizamon").permanentId });
    await settle(() => false, 30);

    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
    expect(s.perm("yao").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.length).toBe(handBefore);
    assertNoLoudGap(s);
  });

  it("locks an opponent Digimon only when the triggering play carries Decode provenance (Q5911-Q5912)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-008", as: "decoded" },
            { card: "EX11-058", as: "yao" },
          ],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("decoded").permanentId,
      playedByDecode: true,
    });

    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "beSuspended"));

    expect(observe(s.engine).isRestricted(s.perm("target"), "beSuspended")).toBe(true);
    assertNoLoudGap(s);
  });

  it("publishes full IR with Aqua-or-Sea-Animal filters and Decode only on the play watcher", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const watchers = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions ?? [];
    const played = watchers.find((action) => action.kind === "SubTrigger" && action.event === "whenPlayed");
    const evolved = watchers.find(
      (action) => action.kind === "SubTrigger" && action.event === "whenOneOfYoursDigivolves",
    );
    expect(played).toMatchObject({
      sourceFilter: {
        nameOrTrait: [
          { tokens: ["Aqua"], match: "trait" },
          { tokens: ["Sea Animal"], match: "trait", orPrevious: true },
        ],
      },
      actions: [
        { kind: "Draw", cost: { kind: "suspend" }, abortOnDecline: true },
        { kind: "Restrict", condition: { kind: "triggerPlayedByDecode" } },
      ],
    });
    expect(evolved).toMatchObject({ actions: [{ kind: "Draw" }] });
  });
});
