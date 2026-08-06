/**
 * dispatch/efn-dispatch-board/types.ts
 */

export interface DispatchBoardResult {
  org_id:      string;
  generated_at: string;
  technicians:  TechBoardEntry[];
  work_orders:  WoBoardEntry[];
  summary: {
    total_techs:        number;
    available_techs:    number;
    busy_techs:         number;
    offline_techs:      number;
    active_work_orders: number;
    overdue_count:      number;
    scheduled_today:    number;
  };
}

export interface TechBoardEntry {
  technician_id:     string;
  availability_status: string;
  current_work_order_id: string | null;
  current_lat?:      number;
  current_lng?:      number;
  next_available_at?: string;
}

export interface WoBoardEntry {
  work_order_id:     string;
  work_order_number: string;
  status:            string;
  priority:          string;
  technician_id:     string | null;
  scheduled_start_at: string | null;
  scheduled_end_at:   string | null;
  is_overdue:        boolean;
}
