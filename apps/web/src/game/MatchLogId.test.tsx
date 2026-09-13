// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { MatchLogId } from "./MatchLogId";

it("copies the complete match identifier", async () => {
  const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  const id = "aa7d2399-2dab-47be-bb6c-762432037ad2";
  render(
    <I18nProvider>
      <MatchLogId id={id} />
    </I18nProvider>,
  );
  expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe(id);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(id));
  await waitFor(() => expect(screen.getByRole("status").textContent).not.toBe(""));
});
