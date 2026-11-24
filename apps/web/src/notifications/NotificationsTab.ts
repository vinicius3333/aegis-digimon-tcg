export const NotificationsTab = {
  ALL: { name: "ALL", value: "all" },
  FEEDBACK: { name: "FEEDBACK", value: "feedback" },
  OPEN_BUGS: { name: "OPEN_BUGS", value: "openBugs" },
} as const;

export type NotificationsTab = (typeof NotificationsTab)[keyof typeof NotificationsTab]["value"];
