import { useNavigate } from "react-router";
import { ForgotPasswordScreen } from "../components/ForgotPasswordScreen";
import { handleBackNavigation } from "../utils/navigation";

/**
 * ForgotPasswordPage — wires ForgotPasswordScreen's onBack prop to real navigation.
 */
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  return <ForgotPasswordScreen onBack={() => handleBackNavigation(navigate, "/login")} />;
}
