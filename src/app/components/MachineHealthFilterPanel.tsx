import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { useMachineHealthContext, MachineFilters, SortOrder } from "../contexts/MachineHealthContext";
import { Drawer, DrawerContent, DrawerOverlay, DrawerHeader, DrawerTitle, DrawerFooter } from "./ui/drawer";

const ink = "#0F172A";
const inkMut = "#64748B";
const border = "#E2E8F0";
const card = "#FFFFFF";
const blue = "#2563EB";
const blueTint = "#EFF6FF";
const inter = "'Inter', 'Roboto', sans-serif";

export default function MachineHealthFilterPanel({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { filters, setFilters, sortOrder, setSortOrder } = useMachineHealthContext();
  
  // Keep draft state in sync when opened
  const [draftFilters, setDraftFilters] = useState<MachineFilters>(() => ({
    status: new Set(filters.status),
    healthScore: new Set(filters.healthScore),
    category: new Set(filters.category),
    location: new Set(filters.location),
    vendor: new Set(filters.vendor),
    lastUpdated: new Set(filters.lastUpdated)
  }));
  const [draftSort, setDraftSort] = useState<SortOrder>(sortOrder);

  useEffect(() => {
    if (open) {
      setDraftFilters({
        status: new Set(filters.status),
        healthScore: new Set(filters.healthScore),
        category: new Set(filters.category),
        location: new Set(filters.location),
        vendor: new Set(filters.vendor),
        lastUpdated: new Set(filters.lastUpdated)
      });
      setDraftSort(sortOrder);
    }
  }, [open, filters, sortOrder]);

  const toggleFilter = (key: keyof MachineFilters, value: string) => {
    setDraftFilters(prev => {
      const next = new Set(prev[key]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, [key]: next };
    });
  };

  const resetFilters = () => {
    setDraftFilters({
      status: new Set(),
      healthScore: new Set(),
      category: new Set(),
      location: new Set(),
      vendor: new Set(),
      lastUpdated: new Set()
    });
    setDraftSort("Critical First");
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setSortOrder(draftSort);
    onOpenChange(false);
  };

  const FilterSection = ({ title, filterKey, options }: { title: string; filterKey: keyof MachineFilters; options: string[] }) => (
    <div style={{ padding: "20px 24px", borderBottom: `1px solid ${border}` }}>
      <h3 style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "12px" }}>{title}</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {options.map(opt => {
          const active = draftFilters[filterKey].has(opt);
          return (
            <button key={opt} type="button" onClick={() => toggleFilter(filterKey, opt)} style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "8px 12px", borderRadius: "100px", cursor: "pointer",
              backgroundColor: active ? blueTint : card,
              border: `1px solid ${active ? blue : border}`,
              color: active ? blue : inkMut, fontSize: "13px", fontWeight: 600, fontFamily: inter,
              transition: "all 0.15s"
            }}>
              {active && <Check size={12} strokeWidth={3} />} {opt}
            </button>
          );
        })}
      </div>
    </div>
  );

  const sortOptions: SortOrder[] = ["Health Score", "Machine Name", "Last Updated", "Critical First", "Healthy First"];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent style={{ maxHeight: '90vh', maxWidth: '390px', margin: '0 auto' }}>
        <DrawerHeader style={{ borderBottom: `1px solid ${border}`, padding: "20px 24px" }}>
          <DrawerTitle style={{ fontSize: "18px", fontWeight: 800, color: ink, fontFamily: inter, margin: 0 }}>
            Filters & Sort
          </DrawerTitle>
        </DrawerHeader>

        <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
          
          <div style={{ padding: "20px 24px", borderBottom: `1px solid ${border}` }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: ink, fontFamily: inter, marginBottom: "12px" }}>Sort By</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {sortOptions.map(opt => {
                const active = draftSort === opt;
                return (
                  <button key={opt} type="button" onClick={() => setDraftSort(opt)} style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "8px 12px", borderRadius: "100px", cursor: "pointer",
                    backgroundColor: active ? blueTint : card,
                    border: `1px solid ${active ? blue : border}`,
                    color: active ? blue : inkMut, fontSize: "13px", fontWeight: 600, fontFamily: inter,
                    transition: "all 0.15s"
                  }}>
                    {active && <Check size={12} strokeWidth={3} />} {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <FilterSection title="Health Status" filterKey="status" options={["Healthy", "Warning", "Critical"]} />
          <FilterSection title="Health Score" filterKey="healthScore" options={["0-25", "26-50", "51-75", "76-100"]} />
          <FilterSection title="Machine Category" filterKey="category" options={["HVAC", "Power Systems", "Infrastructure", "Water Systems", "Electrical", "IT", "Security", "Manufacturing"]} />
          <FilterSection title="Location" filterKey="location" options={["Block A", "Block B", "Block C", "Tower A", "Basement"]} />
          <FilterSection title="Vendor" filterKey="vendor" options={["Carrier HVAC", "Cummins Power", "Otis Elevators", "Grundfos", "Industrial Systems"]} />
          <FilterSection title="Last Updated" filterKey="lastUpdated" options={["Today", "This Week", "This Month"]} />
        </div>

        <DrawerFooter style={{ 
          borderTop: `1px solid ${border}`, padding: "20px 24px 34px", 
          display: "flex", flexDirection: "row", gap: "12px", backgroundColor: card 
        }}>
          <button type="button" onClick={resetFilters} style={{
            flex: 1, padding: "14px", borderRadius: "14px",
            backgroundColor: card, border: `1.5px solid ${border}`,
            fontSize: "14.5px", fontWeight: 700, color: ink, fontFamily: inter, cursor: "pointer"
          }}>
            Reset
          </button>
          <button type="button" onClick={applyFilters} style={{
            flex: 2, padding: "14px", borderRadius: "14px",
            backgroundColor: blue, border: "none",
            fontSize: "14.5px", fontWeight: 700, color: "white", fontFamily: inter, cursor: "pointer"
          }}>
            Apply Filters
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
