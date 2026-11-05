import { describe, expect, it } from "vitest";
import { CLIENT_ERROR_KINDS, ClientErrorKind } from "#shared/clientErrors/ClientErrorKind";
import { isClientErrorKind } from "#shared/clientErrors/isClientErrorKind";

describe("client error kinds", () => {
  it("serializes the capture sources and arena fallback", () => {
    expect(CLIENT_ERROR_KINDS).toEqual(["error", "unhandledRejection", "render", "arena3dFallback"]);
  });

  it.each([ClientErrorKind.ERROR.value, ClientErrorKind.RENDER.value])("accepts %s", (kind) => {
    expect(isClientErrorKind(kind)).toBe(true);
  });

  it.each(["ERROR", "crash", "constructor", 1, null, undefined])("refuses %s", (value) => {
    expect(isClientErrorKind(value)).toBe(false);
  });
});
