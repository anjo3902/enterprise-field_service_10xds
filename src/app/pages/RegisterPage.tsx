import { useNavigate } from "react-router";
import { RegisterScreen } from "../components/RegisterScreen";
import { handleBackNavigation } from "../utils/navigation";

/**
 * RegisterPage — wires RegisterScreen's onBack / onNext to real navigation.
 *   onBack → /login
 *   onNext → /verify-email  (continues the registration flow)
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  return (
    <RegisterScreen
      onBack={() => handleBackNavigation(navigate, "/login")}
      onNext={() => navigate("/verify-email")}
    />
  );
}
