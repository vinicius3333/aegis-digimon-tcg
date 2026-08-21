import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST22-01 Viximon inherited digivolution", () => {
  it("offers a matching evolution after a matching Option is used", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST22-03", as: "host", under: ["ST22-01"] }],
          hand: [{ card: "ST22-04", as: "taomon" }],
          trash: [{ card: "ST22-10", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const host = s.perm("host");
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOptionUsed", { subjectPermanentId: s.inst("option").instanceId });
    await settle(() => host.topCard?.cardId === "ST22-04");
    expect(host.topCard?.cardId).toBe("ST22-04");
  });

  it("does not trigger for an unrelated Option", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST22-03", as: "host", under: ["ST22-01"] }], hand: [{ card: "ST22-04", as: "taomon" }], trash: [{ card: "BT1-090", as: "option" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const host = s.perm("host");
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOptionUsed", { subjectPermanentId: s.inst("option").instanceId });
    await settle(() => false, 40);
    expect(host.topCard?.cardId).toBe("ST22-03");
  });
});
