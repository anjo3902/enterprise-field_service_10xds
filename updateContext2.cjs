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
  content = content.replace('interface VendorContextType {', typeInjection + '\nexport interface VendorContextType {');
} else {
  // If it did inject partially but without export, fix it
  content = content.replace('interface VendorContextType {', 'export interface VendorContextType {');
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

// 7. Add notifications to return value of VendorProvider
if (!content.includes('unreadNotificationCount,')) {
  content = content.replace(
    'activity,\n    unreadActivityCount,',
    'notifications,\n    unreadNotificationCount,\n    markNotificationRead,\n    markAllNotificationsRead,\n    dismissNotification,\n    archiveNotification,\n    markNotificationActionCompleted,\n    activity,\n    unreadActivityCount,'
  );
}

fs.writeFileSync(contextPath, content, 'utf8');
console.log('Successfully updated VendorContext.tsx');
