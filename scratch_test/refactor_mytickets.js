const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/app/components/MyTickets.tsx');
let code = fs.readFileSync(file, 'utf8');

// 1. Add `customer` to Ticket interface
code = code.replace(
  'progress: number; category: string;',
  'progress: number; category: string; customer: string;'
);

// 2. Add `customer` mock data to ALL_TICKETS
code = code.replace(/category: "HVAC",/g, 'category: "HVAC", customer: "Alpha Corp",');
code = code.replace(/category: "Power",/g, 'category: "Power", customer: "Beta Industries",');
code = code.replace(/category: "IT",/g, 'category: "IT", customer: "Gamma Tech",');
code = code.replace(/category: "Plumbing",/g, 'category: "Plumbing", customer: "Delta Operations",');
code = code.replace(/category: "Security",/g, 'category: "Security", customer: "Omega Logistics",');

// 3. Update SearchBar props
code = code.replace(
  'function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {',
  'function SearchBar({ value, onChange, onFilterClick }: { value: string; onChange: (v: string) => void; onFilterClick: () => void; }) {'
);
code = code.replace(
  '<button type="button" style={{ width:"30px"',
  '<button type="button" onClick={onFilterClick} style={{ width:"30px"'
);

// 4. Update SortRow props
code = code.replace(
  'function SortRow({ count, total }: { count: number; total: number }) {',
  'function SortRow({ count, total, onFilterClick }: { count: number; total: number; onFilterClick: () => void; }) {'
);
code = code.replace(
  '<button type="button" style={{ display:"inline-flex",alignItems:"center",gap:"4px",height:"28px",borderRadius:"8px",padding:"0 10px",backgroundColor:card,border:`1px solid ${border}`,cursor:"pointer",fontFamily:inter,boxShadow:"0 1px 2px rgba(0,0,0,0.04)" }}>\n          <SlidersHorizontal',
  '<button type="button" onClick={onFilterClick} style={{ display:"inline-flex",alignItems:"center",gap:"4px",height:"28px",borderRadius:"8px",padding:"0 10px",backgroundColor:card,border:`1px solid ${border}`,cursor:"pointer",fontFamily:inter,boxShadow:"0 1px 2px rgba(0,0,0,0.04)" }}>\n          <SlidersHorizontal'
);

// 5. Update TicketCard props and interactivity
code = code.replace(
  'function TicketCard({ ticket }: { ticket: Ticket }) {',
  'function TicketCard({ ticket, onClick, onMoreClick }: { ticket: Ticket; onClick: () => void; onMoreClick: (e: React.MouseEvent) => void }) {'
);
code = code.replace(
  '      style={{ backgroundColor:card,borderRadius:"18px"',
  '      onClick={onClick}\n      style={{ backgroundColor:card,borderRadius:"18px"'
);
code = code.replace(
  '<button type="button" style={{ width:"26px"',
  '<button type="button" onClick={onMoreClick} style={{ width:"26px"'
);

// 6. Add new Modals at the top (after types)
const modalsCode = `
// ─── Modals ───────────────────────────────────────────────────────────────────
function TicketActionsModal({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
  return (
    <div style={{ position:"absolute",inset:0,backgroundColor:"rgba(15,23,42,0.65)",zIndex:100,display:"flex",flexDirection:"column",justifyContent:"flex-end" }} onClick={onClose}>
      <div style={{ backgroundColor:card,borderTopLeftRadius:"24px",borderTopRightRadius:"24px",padding:"24px",paddingBottom:"40px",animation:"slideUp 0.2s ease-out" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px" }}>
          <h3 style={{ fontSize:"18px",fontWeight:700,color:ink,margin:0,fontFamily:inter }}>Ticket Actions</h3>
          <button type="button" onClick={onClose} style={{ width:"32px",height:"32px",borderRadius:"100px",backgroundColor:divider,border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}><X size={16} color={inkMut}/></button>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
          <button style={{ height:"52px",borderRadius:"12px",backgroundColor:bg,border:\`1px solid \${border}\`,display:"flex",alignItems:"center",gap:"12px",padding:"0 16px",cursor:"pointer" }}>
            <FileText size={18} color={blue}/> <span style={{ fontSize:"15px",fontWeight:600,color:ink,fontFamily:inter }}>View Details ({ticketId})</span>
          </button>
          <button style={{ height:"52px",borderRadius:"12px",backgroundColor:bg,border:\`1px solid \${border}\`,display:"flex",alignItems:"center",gap:"12px",padding:"0 16px",cursor:"pointer" }}>
            <User size={18} color={purple}/> <span style={{ fontSize:"15px",fontWeight:600,color:ink,fontFamily:inter }}>Reassign Ticket</span>
          </button>
          <button style={{ height:"52px",borderRadius:"12px",backgroundColor:bg,border:\`1px solid \${border}\`,display:"flex",alignItems:"center",gap:"12px",padding:"0 16px",cursor:"pointer" }}>
            <AlertTriangle size={18} color={amber}/> <span style={{ fontSize:"15px",fontWeight:600,color:ink,fontFamily:inter }}>Escalate Priority</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position:"absolute",inset:0,backgroundColor:"rgba(15,23,42,0.65)",zIndex:100,display:"flex",flexDirection:"column",justifyContent:"flex-end" }} onClick={onClose}>
      <div style={{ backgroundColor:card,borderTopLeftRadius:"24px",borderTopRightRadius:"24px",padding:"24px",paddingBottom:"40px",animation:"slideUp 0.2s ease-out" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px" }}>
          <h3 style={{ fontSize:"18px",fontWeight:700,color:ink,margin:0,fontFamily:inter }}>Advanced Filters</h3>
          <button type="button" onClick={onClose} style={{ width:"32px",height:"32px",borderRadius:"100px",backgroundColor:divider,border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}><X size={16} color={inkMut}/></button>
        </div>
        <p style={{ fontSize:"14px",color:inkMut,fontFamily:inter }}>Filter implementation stub. In a real app, this would contain date pickers, customer dropdowns, etc.</p>
        <button type="button" onClick={onClose} style={{ marginTop:"24px",width:"100%",height:"48px",borderRadius:"12px",background:\`linear-gradient(135deg,\${blue},\${blueDark})\`,border:"none",color:"white",fontSize:"15px",fontWeight:700,fontFamily:inter,cursor:"pointer",boxShadow:blueShadow }}>Apply Filters</button>
      </div>
    </div>
  );
}
`;
code = code.replace('// ─── Data ─────────────────────────────────────────────────────────────────────', modalsCode + '\n// ─── Data ─────────────────────────────────────────────────────────────────────');

// 7. Update MyTickets component
code = code.replace(
  'const [activeFilter, setFilter]    = useState<FilterKey>("All");',
  'const [activeFilter, setFilter]    = useState<FilterKey>("All");\n  const [actionsTicketId, setActionsTicketId] = useState<string | null>(null);\n  const [showFilterModal, setShowFilterModal] = useState(false);'
);

// update synthetic ticket customer
code = code.replace(
  'category: nt.category,',
  'category: nt.category,\n        customer: "Internal",\n'
);

// update qMatch logic
code = code.replace(
  't.location.toLowerCase().includes(query.toLowerCase());',
  't.location.toLowerCase().includes(query.toLowerCase()) ||\n      t.category.toLowerCase().includes(query.toLowerCase()) ||\n      t.customer.toLowerCase().includes(query.toLowerCase());'
);

// Pass down props
code = code.replace(
  '<SearchBar value={query} onChange={setQuery}/>',
  '<SearchBar value={query} onChange={setQuery} onFilterClick={() => setShowFilterModal(true)}/>'
);
code = code.replace(
  '<SortRow count={filtered.length} total={ALL_TICKETS.length}/>',
  '<SortRow count={filtered.length} total={ALL_TICKETS.length} onFilterClick={() => setShowFilterModal(true)}/>'
);
code = code.replace(
  '{showList && filtered.map(t=><TicketCard key={t.id} ticket={t}/>)}',
  '{showList && filtered.map(t=><TicketCard key={t.id} ticket={t} onClick={() => navigate(`/ticket-details/${t.id}`)} onMoreClick={(e) => { e.stopPropagation(); setActionsTicketId(t.id); }}/>)}'
);

// Add modal renders at the end
code = code.replace(
  '      <style>{`',
  '      {actionsTicketId && <TicketActionsModal ticketId={actionsTicketId} onClose={() => setActionsTicketId(null)} />}\n      {showFilterModal && <FilterModal onClose={() => setShowFilterModal(false)} />}\n\n      <style>{`\n        @keyframes slideUp {\n          from { transform: translateY(100%); }\n          to { transform: translateY(0); }\n        }'
);


fs.writeFileSync(file, code);
console.log('Refactored MyTickets.tsx successfully!');
