/**
 * dispatch/efn-dispatch-calendar/types.ts
 */

export interface CalendarResult {
  technician_id?:   string;
  vendor_id?:       string;
  org_id?:          string;
  period:           { start: string; end: string };
  shifts:           ShiftEntry[];
  dispatches:       DispatchCalEntry[];
  leaves:           LeaveEntry[];
  holidays:         HolidayEntry[];
}

export interface ShiftEntry {
  id: string; shift_name: string; start_time: string;
  end_time: string; working_days: number[]; timezone: string; status: string;
}

export interface DispatchCalEntry {
  id: string; work_order_id: string; scheduled_start_at: string;
  scheduled_end_at: string; dispatch_status: string; route_status: string;
}

export interface LeaveEntry {
  id: string; technician_id: string; start_date: string; end_date: string; reason: string | null;
}

export interface HolidayEntry {
  id: string; holiday_name: string; holiday_date: string; is_recurring: boolean;
}
