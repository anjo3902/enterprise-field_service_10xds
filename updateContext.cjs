const fs = require('fs');
const path = require('path');

const contextPath = path.join(__dirname, 'src/app/contexts/VendorContext.tsx');
let content = fs.readFileSync(contextPath, 'utf8');

// 1. Add notification types at the top
if (!content.includes('type NotificationCategory')) {
  const typeInjection = `
export type NotificationCategory = "operational" | "business" | "technician" | "assets" | "ai";
export type NotificationPriority = "high" | "medium" | "low";

export interface VendorNotification {
  id: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  description: string;
  relatedEntityId?: string;
  timestamp: string;
  read: boolean;
  dismissed: boolean;
  archived: boolean;
  actionCompleted: boolean;
}
`;
  content = content.replace('export interface VendorContextType {', typeInjection + 'export interface VendorContextType {');
}

// 2. Add notification state and methods to VendorContextType
if (!content.includes('notifications: VendorNotification[];')) {
  const contextTypeInjection = `
  notifications: VendorNotification[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
  archiveNotification: (id: string) => void;
  markNotificationActionCompleted: (id: string) => void;
`;
  content = content.replace('// ─── Activity', contextTypeInjection + '\n  // ─── Activity');
}

// 3. Add mock notifications
if (!content.includes('const mockNotifications: VendorNotification[] = [')) {
  const mockInjection = `
const mockNotifications: VendorNotification[] = [
  { id: "NOT-1", category: "operational", priority: "high", title: "New ticket assigned for review", description: "Ticket TKT-0021 requires your approval.", relatedEntityId: "TKT-0021", timestamp: new Date(Date.now() - 3600000).toISOString(), read: false, dismissed: false, archived: false, actionCompleted: false },
  { id: "NOT-2", category: "business", priority: "medium", title: "AMC renewal due", description: "AMC for AST-10024 expires in 30 days.", relatedEntityId: "AST-10024", timestamp: new Date(Date.now() - 86400000).toISOString(), read: false, dismissed: false, archived: false, actionCompleted: false },
  { id: "NOT-3", category: "ai", priority: "high", title: "AI predicts SLA breach", description: "Ticket TKT-0014 is at risk of breaching resolution SLA.", relatedEntityId: "TKT-0014", timestamp: new Date(Date.now() - 7200000).toISOString(), read: false, dismissed: false, archived: false, actionCompleted: false },
  { id: "NOT-4", category: "assets", priority: "high", title: "Asset health critical", description: "Repeated breakdown detected for AST-10045.", relatedEntityId: "AST-10045", timestamp: new Date(Date.now() - 172800000).toISOString(), read: true, dismissed: false, archived: false, actionCompleted: false },
  { id: "NOT-5", category: "technician", priority: "medium", title: "Technician checked in", description: "Michael T. arrived at TKT-0015.", relatedEntityId: "TKT-0015", timestamp: new Date(Date.now() - 1800000).toISOString(), read: false, dismissed: false, archived: false, actionCompleted: false }
];
`;
  content = content.replace('const mockActivity: ActivityItem[] = [', mockInjection + '\nconst mockActivity: ActivityItem[] = [');
}

// 4. Add state initialization to VendorProvider
if (!content.includes('const [notifications, setNotifications] = useState<VendorNotification[]>(mockNotifications);')) {
  content = content.replace('const [activity, setActivity] = useState<ActivityItem[]>(mockActivity);', 'const [activity, setActivity] = useState<ActivityItem[]>(mockActivity);\n  const [notifications, setNotifications] = useState<VendorNotification[]>(mockNotifications);');
}

// 5. Add derived notification metrics
if (!content.includes('const unreadNotificationCount = notifications.filter(n => !n.read && !n.dismissed && !n.archived).length;')) {
  content = content.replace('const unreadActivityCount = activity.filter(a => !a.read).length;', 'const unreadActivityCount = activity.filter(a => !a.read).length;\n  const unreadNotificationCount = notifications.filter(n => !n.read && !n.dismissed && !n.archived).length;');
}

// 6. Add notification actions (markAsRead, etc.)
if (!content.includes('const markNotificationRead = useCallback((id: string) => {')) {
  const actionsInjection = `
  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, dismissed: true } : n));
  }, []);

  const archiveNotification = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, archived: true } : n));
  }, []);

  const markNotificationActionCompleted = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, actionCompleted: true, read: true } : n));
  }, []);
`;
  content = content.replace('const markActivityRead = useCallback((id: string) => {', actionsInjection + '\n  const markActivityRead = useCallback((id: string) => {');
}

// 7. Inject pushNotification logic inside existing actions
// approveForAssignment
content = content.replace(
  'const approveForAssignment = useCallback((ticketId: string) => {',
  'const approveForAssignment = useCallback((ticketId: string) => {\n    const newNotif: VendorNotification = { id: `NOT-$\\{Date.now()}`, category: "operational", priority: "medium", title: "New ticket approved for assignment", description: `Ticket $\\{ticketId} is approved and ready for dispatch.`, relatedEntityId: ticketId, timestamp: new Date().toISOString(), read: false, dismissed: false, archived: false, actionCompleted: false };\n    setNotifications(prev => [newNotif, ...prev]);'
);

// assignTicket
content = content.replace(
  'const assignTicket = useCallback((ticketId: string, techId: string, techName: string) => {',
  'const assignTicket = useCallback((ticketId: string, techId: string, techName: string) => {\n    const newNotif: VendorNotification = { id: `NOT-$\\{Date.now()}`, category: "technician", priority: "high", title: "Technician accepted assignment", description: `$\\{techName} has been assigned to ticket $\\{ticketId}.`, relatedEntityId: ticketId, timestamp: new Date().toISOString(), read: false, dismissed: false, archived: false, actionCompleted: false };\n    setNotifications(prev => [newNotif, ...prev]);'
);

// completeWorkOrder
content = content.replace(
  'const completeWorkOrder = useCallback((workOrderId: string, notes: string) => {',
  'const completeWorkOrder = useCallback((workOrderId: string, notes: string) => {\n    const newNotif: VendorNotification = { id: `NOT-$\\{Date.now()}`, category: "operational", priority: "low", title: "Work order completed", description: `Work order $\\{workOrderId} has been successfully completed.`, relatedEntityId: workOrderId, timestamp: new Date().toISOString(), read: false, dismissed: false, archived: false, actionCompleted: false };\n    setNotifications(prev => [newNotif, ...prev]);'
);

// escalateTicket
content = content.replace(
  'const escalateTicket = useCallback((ticketId: string, reason: string) => {',
  'const escalateTicket = useCallback((ticketId: string, reason: string) => {\n    const newNotif: VendorNotification = { id: `NOT-$\\{Date.now()}`, category: "operational", priority: "high", title: "Ticket escalated", description: `Ticket $\\{ticketId} was escalated: $\\{reason}`, relatedEntityId: ticketId, timestamp: new Date().toISOString(), read: false, dismissed: false, archived: false, actionCompleted: false };\n    setNotifications(prev => [newNotif, ...prev]);'
);

// 8. Add notifications to return value
content = content.replace(
  'activity,\n    unreadActivityCount,',
  'notifications,\n    unreadNotificationCount,\n    markNotificationRead,\n    markAllNotificationsRead,\n    dismissNotification,\n    archiveNotification,\n    markNotificationActionCompleted,\n    activity,\n    unreadActivityCount,'
);

fs.writeFileSync(contextPath, content, 'utf8');
console.log('Successfully updated VendorContext.tsx');
