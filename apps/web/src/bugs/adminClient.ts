import { accountApi } from "../account/client";
import { BugReportApiError, type BugReportDraft } from "./client";

export type FeedbackRecord = {
  id: number;
  report: BugReportDraft & {
    reporterName?: string;
    clientRevision?: string;
    userAgent?: string;
    serverRevision?: string;
    publicVersion?: string;
  };
  createdAt: number;
  githubStatus: "pending" | "sent" | "failed" | "disabled";
  githubNumber: number | null;
  githubUrl: string | null;
};

export type FeedbackPage = { items: FeedbackRecord[]; nextBefore: number | null };

export async function listFeedback(before?: number, signal?: AbortSignal): Promise<FeedbackPage> {
  const query = before === undefined ? "" : `?before=${before}`;
  const response = await fetch(`${accountApi.base}/account/feedback${query}`, {
    credentials: "include",
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new BugReportApiError(response.status);
  return response.json() as Promise<FeedbackPage>;
}
