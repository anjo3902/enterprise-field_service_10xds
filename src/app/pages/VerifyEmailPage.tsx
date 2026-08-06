import { useNavigate } from "react-router";
import { VerifyEmailScreen } from "../components/VerifyEmailScreen";
import { handleBackNavigation } from "../utils/navigation";

/**
 * VerifyEmailPage — wires VerifyEmailScreen's onBack / onNext to real navigation.
 *   onBack → /register
 *   onNext → /registration-success
 */
export default function VerifyEmailPage() {
  const navigate = useNavigate();
  return (
    <VerifyEmailScreen
      email="admin@company.com"
      onBack={() => handleBackNavigation(navigate, "/register")}
      onNext={() => navigate("/registration-success")}
    />
  );
}
