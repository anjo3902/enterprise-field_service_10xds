import { useNavigate } from "react-router";
import { RegistrationSuccessScreen } from "../components/RegistrationSuccessScreen";
import { handleBackNavigation } from "../utils/navigation";

/**
 * RegistrationSuccessPage — wires RegistrationSuccessScreen's callbacks to real navigation.
 *   onContinue    → /dashboard
 *   onBackToLogin → /login
 */
export default function RegistrationSuccessPage() {
  const navigate = useNavigate();
  return (
    <RegistrationSuccessScreen
      orgName="Acme Corporation"
      onContinue={() => navigate("/dashboard")}
      onBackToLogin={() => handleBackNavigation(navigate, "/login")}
    />
  );
}
