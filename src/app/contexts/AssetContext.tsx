import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import { Wind, Zap, MoveVertical, Droplets, Shield, Cpu, Flame, Monitor, Settings2 } from "lucide-react";
import { getHealthStatus } from "../utils/businessRules";
import { getAllAssets } from "../lib/assets.service";
type AssetStatus = "Active" | "Maintenance";

type HealthStatus = "Healthy" | "Warning" | "Critical";



export interface Asset {
  id: string;
  name: string;
  assetId: string;
  category: string;
  vendor: string;
  health: number;
  status: AssetStatus;
healthStatus: HealthStatus;
  lastService: string;
  location: string;
purchaseDate?: string;
installationDate?: string;
  // NEW
  warrantyExpiry?: string;
  amcExpiry?: string;

  icon: React.ElementType;
  iconColor: string;
  iconTint: string;
}

// Reuse the colors from the app constants for the mock data
const blue     = "#2563EB";
const blueTint = "#EFF6FF";
const green    = "#16A34A";
const greenT   = "#DCFCE7";
const orange   = "#EA580C";
const orangeT  = "#FFF7ED";
const purple   = "#7C3AED";
const purpleT  = "#F5F3FF";
const red      = "#DC2626";
const redT     = "#FEF2F2";
const amber    = "#D97706";
const amberT   = "#FFFBEB";
const teal     = "#0891B2";
const tealT    = "#ECFEFF";
const inkMut   = "#64748B";
const divider  = "#F1F5F9";


export interface Filters {
  categories: Set<string>;
  health: Set<string>;
  vendors: Set<string>;

  warranty: string;
  amc: string | null;

  serviceDateFrom: string;
  serviceDateTo: string;
}

interface AssetContextValue {
  assets: Asset[];
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  clearFilters: () => void;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  resetAll: () => void;
  filteredAssets: Asset[];
  activeFilterCount: number;
}

export const AssetContext = createContext<AssetContextValue | undefined>(undefined);

export function AssetProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  
  const [filters, setFilters] = useState<Filters>({
  categories: new Set(),
  health: new Set(),
  vendors: new Set(),

  warranty: "",
  amc: null,

  serviceDateFrom: "",
  serviceDateTo: "",
});

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
  loadAssets();
}, []);

  const clearFilters = () => {
    setFilters({
    categories: new Set(),
    health: new Set(),
    vendors: new Set(),

    warranty: "",
    amc: null,

    serviceDateFrom: "",
    serviceDateTo: "",
});
  };
async function loadAssets() {
  try {
    const data = await getAllAssets();

    if (!data) return;

    const mappedAssets: Asset[] = data.map((asset: any) => ({
      id: asset.id,
      name: asset.asset_name,
      assetId: asset.asset_id,
      category: asset.category,
      vendor: asset.vendor,
      health: asset.health_score,
      status: asset.status,

healthStatus: getHealthStatus(asset.health_score),
     lastService: asset.last_service_date,
location: asset.location,

purchaseDate: asset.purchase_date,
installationDate: asset.installation_date,

warrantyExpiry: asset.warranty_expiry,
amcExpiry: asset.amc_expiry,
icon: Settings2,
      iconColor: blue,
      iconTint: blueTint,
    }));

    setAssets(mappedAssets);
  } catch (err) {
    console.error(err);
  }
}
  const resetAll = () => {
    clearFilters();
    setSearchQuery("");
  };

  const filteredAssets = assets.filter(asset => {
    // Check categories
    if (filters.categories.size > 0 && !filters.categories.has(asset.category)) return false;
    // Warranty filter
if (filters.warranty) {
  const today = new Date();
  const expiry = new Date(asset.warrantyExpiry || "");

  const daysRemaining = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (
    (filters.warranty === "Active" && daysRemaining <= 30) ||
    (filters.warranty === "Expiring Soon" &&
      (daysRemaining <= 0 || daysRemaining > 30)) ||
    (filters.warranty === "Expired" && daysRemaining > 0)
  ) {
    return false;
  }
}

// AMC filter
if (filters.amc) {
  const today = new Date();
  const expiry = new Date(asset.amcExpiry || "");

  const daysRemaining = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (
    (filters.amc === "Active" && daysRemaining <= 30) ||
    (filters.amc === "Expiring Soon" &&
      (daysRemaining <= 0 || daysRemaining > 30)) ||
    (filters.amc === "Expired" && daysRemaining > 0)
  ) {
    return false;
  }
}
    
    // Check health
    if (filters.health.size > 0 && !filters.health.has(asset.status)) return false;

    // Check vendor
    if (filters.vendors.size > 0 && !filters.vendors.has(asset.vendor)) return false;

    // Check service dates
    if (filters.serviceDateFrom) {
      if (new Date(asset.lastService) < new Date(filters.serviceDateFrom)) return false;
    }
    if (filters.serviceDateTo) {
      if (new Date(asset.lastService) > new Date(filters.serviceDateTo)) return false;
    }

    // Check search query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const match = 
        asset.name.toLowerCase().includes(q) ||
        asset.assetId.toLowerCase().includes(q) ||
        asset.category.toLowerCase().includes(q) ||
        asset.vendor.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  const activeFilterCount =
  filters.categories.size +
  filters.health.size +
  filters.vendors.size +
  (filters.warranty ? 1 : 0) +
  (filters.amc ? 1 : 0) +
  (filters.serviceDateFrom ? 1 : 0) +
  (filters.serviceDateTo ? 1 : 0);

  return (
    <AssetContext.Provider value={{
      assets,
      filters,
      setFilters,
      clearFilters,
      searchQuery,
      setSearchQuery,
      resetAll,
      filteredAssets,
      activeFilterCount
    }}>
      {children}
    </AssetContext.Provider>
  );
}

export function useAssetContext() {
  const context = useContext(AssetContext);
  if (context === undefined) {
    throw new Error("useAssetContext must be used within an AssetProvider");
  }
  return context;
}
