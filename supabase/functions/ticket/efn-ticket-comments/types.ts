/**
 * ticket/efn-ticket-comments/types.ts
 */

export type CommentAction = "add" | "edit" | "delete";

export interface CommentResult {
  comment_id: string;
  ticket_id:  string;
  action:     CommentAction;
}
