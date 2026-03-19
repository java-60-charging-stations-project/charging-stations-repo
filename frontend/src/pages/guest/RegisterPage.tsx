import { getLogger } from "@/services/logging";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router";
import SignInForm from "@/components/SignInForm";
import NavButton from "@/components/NavButton";
import { useState } from "react";

const logger = getLogger("RegisterPage");


const RegisterPage = () => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const { signUp } = useAuth();

  const signUpHandler = async (email: string, password: string, confirmPassword?: string, name?: string) => {
    if (password !== confirmPassword) {
      logger.debug("Passwords do not match");
      setErrorMessage("Passwords do not match");
      return;
    }
    if (!name) {
      setErrorMessage("Name is required");
      return;
    }
    try {
      await signUp(email, password, name);
      logger.debug("Sign up successful");
      navigate("/confirm", { state: { email } });
    } catch (error) {
      setErrorMessage(`Sign up failed: ${(error as Error).message}`);
      logger.debug("Error while signing UP: ", error);
    }
  }
  
  return (
    <div className="guest-page">
      <SignInForm submitHandler={signUpHandler} isRegister={true} />
      {errorMessage && <p className="text-error-600">{errorMessage}</p>}
      <div className="flex gap-2 w-full">
        <NavButton to="/login" caption="Login" color="secondary" className="flex-1" />
        <NavButton to="/confirm" caption="Confirm Account" color="secondary" className="flex-1" />
      </div>
    </div>
  );
};

export default RegisterPage;
