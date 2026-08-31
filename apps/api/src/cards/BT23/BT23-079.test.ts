import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-079.js";

describe("BT23-079 Eri Karan", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-079")).toMatchObject({
      cardId: "BT23-079",
      nameEn: "Eri Karan",
      colors: ["Blue"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["App Driver", "Appmon"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("gains start-main memory only with an opposing Digimon on Eri's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-079", as: "eri" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnStartMainPhase,
    );
    expect(s.state.memory).toBe(1);
    s.state.turnSeat = 1;
    await (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnStartMainPhase,
    );
    expect(s.state.memory).toBe(1);
  });

  it("suspends Eri and gives the linked trigger subject +3000 DP through the opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-079", as: "eri" },
            { card: "BT23-047", as: "linked" },
            { card: "BT1-009", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const linkedBefore = s.perm("linked").currentDP;
    const otherBefore = s.perm("other").currentDP;

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("linked").permanentId,
    });

    expect(s.perm("eri").isSuspended).toBe(true);
    expect(s.perm("linked").currentDP).toBe(linkedBefore + 3000);
    expect(s.perm("other").currentDP).toBe(otherBefore);
  });

  it("declining the suspend cost also aborts the linked DP boost and App Fuse", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-079", as: "eri" },
            { card: "BT23-047", as: "linked" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const before = s.perm("linked").currentDP;
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("linked").permanentId });
    expect(s.perm("eri").isSuspended).toBe(false);
    expect(s.perm("linked").currentDP).toBe(before);
  });

  it("targets the linked Digimon itself for the +3000 DP effect", () => {
    const watcher = (compiled.effects.find((entry) => entry.trigger === "YourTurn") as any).actions[0];
    expect(watcher.event).toBe("whenLinked");
    expect(watcher.actions[0].target.sourceRef).toBe("triggerSubject");
    expect(watcher.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 3000,
      duration: "untilOpponentTurnEnd",
      cost: { kind: "suspend", target: { isSelf: true, filter: { isSelfRef: true } } },
    });
  });

  it("models the follow-up App Fuse from hand into any Digimon fusion target", () => {
    const appFuse = (compiled.effects.find((entry) => entry.trigger === "YourTurn") as any).actions[0].actions[1];
    expect(appFuse).toMatchObject({
      kind: "AppFuse",
      from: ["hand"],
      into: { kind: ["Digimon"] },
      optional: true,
    });
  });

  it("keeps the App Fuse tail inside the linked trigger and behind the suspend cost", () => {
    const actions = (compiled.effects.find((entry) => entry.trigger === "YourTurn") as any).actions;
    expect(actions).toHaveLength(1);
    expect(actions[0].actions.map((action: any) => action.kind)).toEqual(["ModifyDP", "AppFuse"]);
    expect(actions[0].actions[0]).toMatchObject({ optional: true, abortOnDecline: true });
  });

  it("reacts to a naturally linked own Digimon and ignores an opponent link subject", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-079", as: "eri" },
            { card: "BT21-009", as: "host" },
          ],
          hand: [{ card: "BT21-009", as: "link" }],
        },
        1: { battleArea: [{ card: "BT21-009", as: "opponentHost" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 1);
    await settle(() => s.perm("eri").isSuspended);

    expect(s.perm("eri").isSuspended).toBe(true);
    expect(s.perm("host").currentDP).toBe(7000);

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("opponentHost").permanentId,
    });
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-079")).toBe(true);
  });
});
