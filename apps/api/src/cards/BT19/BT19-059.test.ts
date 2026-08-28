import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT19-059.js";

describe("BT19-059", () => {
  it("preserves Retaliation, Save, and inherited Reboot", () => {
    const card = runtimeCompiledCard("BT19-059");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Retaliation" }] },
      { trigger: "OnDeletion", keywords: [{ keyword: "Save" }] },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Reboot" }] },
    ]);
  });

  it("Save moves the deleted card under its controller's Tamer without leaving a trash copy", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT19-059", as: "axe" }, { card: "BT19-083", as: "tamer" },
    ] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    const instanceId = s.perm("axe").topCard!.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("axe").permanentId], "byEffect");
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === instanceId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === instanceId)).toBe(false);
  });

  it("has Retaliation itself and passes inherited Reboot to a host", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT19-059", as: "axe" }, { card: "BT19-058", as: "host", under: ["BT19-059"] },
    ] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("axe"), "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
  });
});
