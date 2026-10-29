export const CommunityHubSection = {
  DECKS: { name: "DECKS", value: "decks" },
  ROADMAP: { name: "ROADMAP", value: "roadmap" },
  TOURNAMENTS: { name: "TOURNAMENTS", value: "tournaments" },
} as const;
export type CommunityHubSection = (typeof CommunityHubSection)[keyof typeof CommunityHubSection]["value"];
