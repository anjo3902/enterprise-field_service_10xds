import React, { createContext, useContext, useState, ReactNode } from "react";
import { Shield, TrendingUp, Settings2, BarChart3, CheckCircle2 } from "lucide-react";

const blue=  "#2563EB"; const blueTint="#EFF6FF";
const green= "#16A34A"; const greenT=  "#DCFCE7";
const orange="#EA580C"; const orangeT= "#FFF7ED";
const purple="#7C3AED"; const purpleT= "#F5F3FF";
const amber= "#D97706"; const amberT=  "#FFFBEB";

export interface Report {
  id: number;
  name: string;
  type: string;
  generated: string;
  size: string;
  color: string;
  tint: string;
  icon: React.ElementType;
  scheduled?: boolean;
  favorite?: boolean;
}

export interface Schedule {
  id: number;
  reportType: string;
  frequency: string;
  recipients: string;
  format: string;
  deliveryTime: string;
  enabled: boolean;
  color: string;
  tint: string;
}

export interface DownloadHistoryEntry {
  id: number;
  reportId: number;
  reportName: string;
  format: string;
  timestamp: string;
  status: "success" | "failed";
}

const INITIAL_REPORTS: Report[] = [
  {id:1,name:"Monthly SLA Performance Report",type:"SLA",generated:"Today, 08:00 AM",size:"2.4 MB",color:blue,tint:blueTint,icon:Shield,scheduled:true,favorite:true},
  {id:2,name:"Q4 Revenue Intelligence Summary",type:"Revenue",generated:"Yesterday, 06:00 PM",size:"1.8 MB",color:green,tint:greenT,icon:TrendingUp},
  {id:3,name:"Asset Health & Maintenance Log",type:"Asset",generated:"2 days ago",size:"3.1 MB",color:orange,tint:orangeT,icon:Settings2,favorite:true},
  {id:4,name:"Technician Productivity Analysis",type:"Operational",generated:"3 days ago",size:"1.2 MB",color:purple,tint:purpleT,icon:BarChart3},
  {id:5,name:"Customer Satisfaction Survey",type:"Operational",generated:"5 days ago",size:"0.8 MB",color:amber,tint:amberT,icon:CheckCircle2},
];

const INITIAL_SCHEDULES: Schedule[] = [
  {id: 101, reportType: "SLA", frequency: "Weekly", recipients: "team@company.com", format: "PDF", deliveryTime: "08:00 AM", enabled: true, color: orange, tint: orangeT}
];

interface ReportsContextType {
  reports: Report[];
  schedules: Schedule[];
  downloadHistory: DownloadHistoryEntry[];
  addReport: (r: Report) => void;
  updateReport: (id: number, r: Partial<Report>) => void;
  deleteReport: (id: number) => void;
  addSchedule: (s: Schedule) => void;
  updateSchedule: (id: number, s: Partial<Schedule>) => void;
  deleteSchedule: (id: number) => void;
  exportReport: (report: Report | null, format: "PDF" | "Excel" | "CSV", customName?: string) => Promise<void>;
}

const ReportsContext = createContext<ReportsContextType | undefined>(undefined);

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>(INITIAL_REPORTS);
  const [schedules, setSchedules] = useState<Schedule[]>(INITIAL_SCHEDULES);
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistoryEntry[]>([]);

  const addReport = (r: Report) => setReports(prev => [r, ...prev]);
  const updateReport = (id: number, r: Partial<Report>) => setReports(prev => prev.map(item => item.id === id ? { ...item, ...r } : item));
  const deleteReport = (id: number) => setReports(prev => prev.filter(item => item.id !== id));

  const addSchedule = (s: Schedule) => setSchedules(prev => [s, ...prev]);
  const updateSchedule = (id: number, s: Partial<Schedule>) => setSchedules(prev => prev.map(item => item.id === id ? { ...item, ...s } : item));
  const deleteSchedule = (id: number) => setSchedules(prev => prev.filter(item => item.id !== id));

  const exportReport = (report: Report | null, format: "PDF" | "Excel" | "CSV", customName?: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const entry: DownloadHistoryEntry = {
          id: Date.now(),
          reportId: report ? report.id : 0,
          reportName: report ? report.name : (customName || "Custom Report"),
          format,
          timestamp: new Date().toISOString(),
          status: "success"
        };
        setDownloadHistory(prev => [entry, ...prev]);
        console.log(`[Export Service] Exported ${entry.reportName} as ${format}`);
        resolve();
      }, 1500); // Simulate network delay
    });
  };

  return (
    <ReportsContext.Provider value={{ reports, schedules, downloadHistory, addReport, updateReport, deleteReport, addSchedule, updateSchedule, deleteSchedule, exportReport }}>
      {children}
    </ReportsContext.Provider>
  );
}

export function useReports() {
  const context = useContext(ReportsContext);
  if (context === undefined) {
    throw new Error("useReports must be used within a ReportsProvider");
  }
  return context;
}
