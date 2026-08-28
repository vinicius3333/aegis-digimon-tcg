// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { accountApi } from "./client";
import { RankedStart } from "./RankedStart";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ranked sign-in prompt", () => {
  it("opens settings when an unauthenticated player chooses to sign in", async () => {
    vi.spyOn(accountApi, "me").mockResolvedValue(null);
    const onOpenSettings = vi.fn();

    render(
      <I18nProvider>
        <RankedStart
          disabled={false}
          buttonLabel="Enter queue"
          onOpenSettings={onOpenSettings}
          onStart={() => undefined}
        />
      </I18nProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Sign in to enable ranked" }));

    expect(onOpenSettings).toHaveBeenCalledOnce();
  });
});
