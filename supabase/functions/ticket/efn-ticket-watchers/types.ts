/**
 * ticket/efn-ticket-watchers/types.ts
 */

export type WatcherAction = "add" | "remove";

export interface WatcherResult {
  ticket_id:  string;
  profile_id: string;
  action:     WatcherAction;
}
