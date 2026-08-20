import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-057.js";

describe("BT14-057", () => {
  it("has Save and places itself under an own Tamer on deletion", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({ keywords: [{ keyword: "Save" }], actions: [{ kind: "PlaceUnder", underFilter: { kind: ["Tamer"] } }] }));
  it("inherits Blocker", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" }));
});
