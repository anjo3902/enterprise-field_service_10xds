import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useEffect,
} from "react";
import {
  Wind,
  Zap,
  MoveVertical,
  Droplets,
  Settings2,
} from "lucide-react";
import { getAllMachineHealth } from "../lib/machineHealth.service";
import { getHealthStatus } from "../utils/businessRules";

export type MachineStatus =
  | "Healthy"
  | "Warning"
  | "Critical";

export interface Machine {
  id: string; 
  name: string; 
  category: string;
  health: number; 
  status: MachineStatus;
  lastUpdated: string; 
  location: string; 
  vendor: string;
  incidents: number; 
  uptime: string;
  icon: React.ElementType; 
  iconColor: string; 
  iconTint: string;
  trend: number[];
  
  // New Detailed Fields
  installationDate: string;
  warranty: string;
  temperature: string;
  vibration: string;
  powerConsumption: string;
  aiDiagnosis: string;
  detectedIssues: string[];
  failureRisk: string;
  recommendedActions: string[];
  assignedTechnician: string;
  spareParts: string[];
}

const teal = "#0891B2";
const tealT = "#ECFEFF";
const amber = "#D97706";
const amberT = "#FFFBEB";
const blue = "#2563EB";
const blueTint = "#EFF6FF";
const red = "#DC2626";
const redT = "#FEF2F2";
function getMachineIcon(category: string) {
  switch (category) {
    case "HVAC":
      return Wind;

    case "Electrical":
      return Zap;

    case "Water Systems":
      return Droplets;

    case "Building Infrastructure":
      return MoveVertical;

    default:
      return Settings2;
  }
}
function getMachineIconColor(category: string) {
  switch (category) {
    case "HVAC":
      return teal;

    case "Electrical":
      return amber;

    case "Water Systems":
      return blue;

    case "Building Infrastructure":
      return red;

    default:
      return teal;
  }
}
function getMachineIconTint(category: string) {
  switch (category) {
    case "HVAC":
      return tealT;

    case "Electrical":
      return amberT;

    case "Water Systems":
      return blueTint;

    case "Building Infrastructure":
      return redT;

    default:
      return tealT;
  }
}


export interface MachineFilters {
  status: Set<string>;
  healthScore: Set<string>;
  category: Set<string>;
  location: Set<string>;
  vendor: Set<string>;
  lastUpdated: Set<string>;
}

export type SortOrder = "Health Score" | "Machine Name" | "Last Updated" | "Critical First" | "Healthy First";

interface MachineHealthContextValue {
  machines: Machine[];
  filteredMachines: Machine[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: MachineFilters;
  setFilters: (filters: MachineFilters) => void;
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  clearFilters: () => void;
  activeFilterCount: number;
}

const defaultFilters: MachineFilters = {
  status: new Set(),
  healthScore: new Set(),
  category: new Set(),
  location: new Set(),
  vendor: new Set(),
  lastUpdated: new Set()
};

export const MachineHealthContext = createContext<MachineHealthContextValue | undefined>(undefined);

export function MachineHealthProvider({ children }: { children: ReactNode }) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<MachineFilters>(defaultFilters);
  const [sortOrder, setSortOrder] = useState<SortOrder>("Critical First");
  useEffect(() => {
  loadMachines();
}, []);
async function loadMachines() {
  try {
    const data = await getAllMachineHealth();

    if (!data) return;

    const mappedMachines: Machine[] = data.map((item: any) => {
      const asset = item.assets;

      return {
        id: asset.asset_id,
        name: asset.asset_name,
        category: asset.category,
        health: asset.health_score,
       status: getHealthStatus(asset.health_score) as MachineStatus,

        location: asset.location,
        vendor: asset.vendor,

        lastUpdated: item.last_updated
          ? new Date(item.last_updated).toLocaleString()
          : "Not Available",

        incidents: item.failure_count,
        uptime: `${item.uptime_percentage}%`,

        installationDate: asset.installation_date,
        warranty: asset.warranty_expiry,

        temperature: `${item.temperature}°C`,
        vibration: `${item.vibration} mm/s`,
        powerConsumption: `${item.power_consumption} kW`,

        aiDiagnosis: "Not Available",
        detectedIssues: [],
        failureRisk: "Not Available",
        recommendedActions: [],
        assignedTechnician: "Not Assigned",
        spareParts: [],

        icon: getMachineIcon(asset.category),
        iconColor: getMachineIconColor(asset.category),
iconTint: getMachineIconTint(asset.category),

        trend: []
      };
    });

    setMachines(mappedMachines);

  } catch (err) {
    console.error(err);
  }
}

  const clearFilters = () => setFilters({
    status: new Set(),
    healthScore: new Set(),
    category: new Set(),
    location: new Set(),
    vendor: new Set(),
    lastUpdated: new Set()
  });

  const activeFilterCount = Object.values(filters).reduce((acc, set) => acc + set.size, 0);

  const filteredMachines = useMemo(() => {
    let result = machines;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.vendor.toLowerCase().includes(q) ||
        m.location.toLowerCase().includes(q) ||
        m.status.toLowerCase().includes(q)
      );
    }

    // Filters
    if (filters.status.size > 0) {
      result = result.filter(m => filters.status.has(m.status));
    }
    if (filters.category.size > 0) {
      result = result.filter(m => filters.category.has(m.category));
    }
    if (filters.vendor.size > 0) {
      result = result.filter(m => filters.vendor.has(m.vendor));
    }
    if (filters.location.size > 0) {
      result = result.filter(m => Array.from(filters.location).some(loc => m.location.includes(loc)));
    }
    if (filters.healthScore.size > 0) {
      result = result.filter(m => {
        return Array.from(filters.healthScore).some(range => {
          if (range === "0-25" && m.health >= 0 && m.health <= 25) return true;
          if (range === "26-50" && m.health >= 26 && m.health <= 50) return true;
          if (range === "51-75" && m.health >= 51 && m.health <= 75) return true;
          if (range === "76-100" && m.health >= 76 && m.health <= 100) return true;
          return false;
        });
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOrder) {
        case "Health Score":
          return a.health - b.health;
        case "Machine Name":
          return a.name.localeCompare(b.name);
        case "Critical First":
          return a.health - b.health;
        case "Healthy First":
          return b.health - a.health;
        default:
          return 0;
      }
    });

    return [...result];
  }, [machines, searchQuery, filters, sortOrder]);

  return (
    <MachineHealthContext.Provider value={{
      machines, filteredMachines, 
      searchQuery, setSearchQuery, 
      filters, setFilters, 
      sortOrder, setSortOrder, 
      clearFilters, activeFilterCount
    }}>
      {children}
    </MachineHealthContext.Provider>
  );
}

export function useMachineHealthContext() {
  const context = useContext(MachineHealthContext);
  if (context === undefined) {
    throw new Error("useMachineHealthContext must be used within a MachineHealthProvider");
  }
  return context;
}
