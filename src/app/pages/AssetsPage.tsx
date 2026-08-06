import { useEffect } from "react";
import { AssetDashboard } from "../components/AssetDashboard";
import { testConnection } from "../lib/test";

export default function AssetsPage() {

  useEffect(() => {
    testConnection();
  }, []);

  return <AssetDashboard />;
}