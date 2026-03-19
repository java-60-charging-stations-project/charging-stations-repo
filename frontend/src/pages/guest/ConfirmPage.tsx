import { useState } from "react";
import { useLocation } from "react-router";
import { confirmSignUp, resendConfirmationCode } from "@/services/auth/authService";
import SimpleButton from "@/components/SimpleButton";
import NavButton from "@/components/NavButton";
import { getLogger } from "@/services/logging";

const logger = getLogger("ConfirmPage");
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ConfirmPage = () => {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const trimmedEmail = email.trim();
  const canResendConfirmationCode = EMAIL_PATTERN.test(trimmedEmail);

  const handleSubmit = async (e: {preventDefault: () => void}) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      await confirmSignUp(email, confirmationCode);
      logger.debug("Confirm Sign Up successful. Navigate to login");
      setSuccessMessage("Account confirmed! You can now log in.");
    } catch (error) {
      setErrorMessage(`Confirmation failed: ${(error as Error).message}`);
      logger.error("Confirm SignUp failed: ", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendConfirmationCode = async () => {
    if (!canResendConfirmationCode) return;
    try {
      setIsResending(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      await resendConfirmationCode(trimmedEmail);
      setSuccessMessage("Confirmation code resent. Please check your email.");
    } catch (error) {
      setErrorMessage(`Could not resend confirmation code: ${(error as Error).message}`);
      logger.error("Resend confirmation code failed: ", error);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="guest-page">
      <h1>Confirm Account</h1>
      <form onSubmit={handleSubmit} className="w-full flex flex-col space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="text"
          value={confirmationCode}
          onChange={(e) => setConfirmationCode(e.target.value)}
          placeholder="Confirmation Code"
          required
        />
        <SimpleButton
          buttonType="submit"
          caption={isSubmitting ? "Confirming..." : "Confirm Account"}
          isLoading={isSubmitting}
          loadingCaption="Confirming..."
          color="primary"
          className="w-full"
        />
      </form>
      <SimpleButton
        handleClick={handleResendConfirmationCode}
        caption="Resend Confirmation Code"
        isLoading={isResending}
        loadingCaption="Resending..."
        color="tertiary"
        className="w-full"
      />
      {errorMessage && <p className="text-error-600">{errorMessage}</p>}
      {successMessage && <p className="text-success-600">{successMessage}</p>}
      <div className="flex gap-2 w-full">
        <NavButton to="/login" caption="Login" color="secondary" className="flex-1" />
        <NavButton to="/register" caption="Create Account" color="secondary" className="flex-1" />
      </div>
    </div>
  );
};

export default ConfirmPage;
