const fs = require('fs');
const path = require('path');

const contextPath = path.join(__dirname, 'src/app/contexts/VendorContext.tsx');
let content = fs.readFileSync(contextPath, 'utf8');

// 1. Add Support Ticket type
if (!content.includes('export interface VendorSupportTicket {')) {
  const typeInjection = `
export interface VendorSupportTicket {
  id: string;
  category: string;
  priority: string;
  subject: string;
  description: string;
  status: "Open" | "In Progress" | "Closed";
  timestamp: string;
}
`;
  content = content.replace('export interface VendorNotification {', typeInjection + '\nexport interface VendorNotification {');
}

// 2. Add properties to VendorContextType
if (!content.includes('updateVendorProfile: (updates: Partial<VendorInfo>) => void;')) {
  const contextTypeInjection = `
  updateVendorProfile: (updates: Partial<VendorInfo>) => void;

  // Support Tickets
  supportTickets: VendorSupportTicket[];
  createSupportTicket: (ticket: Omit<VendorSupportTicket, 'id' | 'status' | 'timestamp'>) => void;
`;
  content = content.replace('  vendor: VendorInfo;\n  slaContract: SLAContract;', '  vendor: VendorInfo;\n  slaContract: SLAContract;' + contextTypeInjection);
}

// 3. Add mock support tickets state to VendorProvider
if (!content.includes('const [supportTickets, setSupportTickets] = useState<VendorSupportTicket[]>(')) {
  const mockStateInjection = `
  const [supportTickets, setSupportTickets] = useState<VendorSupportTicket[]>([
    { id: "SUP-001", category: "Technical Issue", priority: "Low", subject: "App sync delay", description: "Sometimes the app takes a while to sync tickets.", status: "Closed", timestamp: new Date(Date.now() - 5 * 86400000).toISOString() }
  ]);
`;
  content = content.replace('const [vendor] = useState<VendorInfo>(mockVendor);', 'const [vendor, setVendor] = useState<VendorInfo>(mockVendor);' + mockStateInjection);
}

// 4. Add methods to VendorProvider
if (!content.includes('const updateVendorProfile = useCallback')) {
  const methodsInjection = `
  const updateVendorProfile = useCallback((updates: Partial<VendorInfo>) => {
    setVendor(prev => ({ ...prev, ...updates }));
  }, []);

  const createSupportTicket = useCallback((ticket: Omit<VendorSupportTicket, 'id' | 'status' | 'timestamp'>) => {
    const newTicket: VendorSupportTicket = {
      ...ticket,
      id: \`SUP-\${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}\`,
      status: "Open",
      timestamp: new Date().toISOString()
    };
    setSupportTickets(prev => [newTicket, ...prev]);
  }, []);
`;
  content = content.replace('const markAllActivityRead = useCallback(() => {', 'const markAllActivityRead = useCallback(() => { // marker\n' + methodsInjection + '\n');
  content = content.replace('const markAllActivityRead = useCallback(() => { // marker\n', ''); // clean up
}

// 5. Add to Provider value
if (!content.includes('updateVendorProfile, supportTickets, createSupportTicket,')) {
  content = content.replace(
    'vendor, slaContract: mockSLAContract, customers,',
    'vendor, updateVendorProfile, supportTickets, createSupportTicket, slaContract: mockSLAContract, customers,'
  );
}

fs.writeFileSync(contextPath, content, 'utf8');
console.log('Successfully updated VendorContext.tsx for profile & support');
