import { useState, type FC } from "react";
import SimpleButton from "./SimpleButton";

interface SignInFormProps{
  isRegister: boolean;
  submitHandler: (
    email: string,
    password: string,
    confirmPassword?: string,
    name?: string
  ) => void;
}

const SignInForm: FC<SignInFormProps> = ({isRegister, submitHandler}) => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string | undefined>(undefined);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const combinedName = isRegister ? `${firstName.trim()} ${lastName.trim()}`.trim() : undefined;
    submitHandler(email, password, confirmPassword, combinedName);
  };

  return (
    <>
      <h1>{isRegister ? "SIGN UP PAGE" : "LOGIN PAGE"}</h1>
      <h4>{isRegister ? "Sign up to create an account" : "Sign in to your account"}</h4>
      <form onSubmit={handleSubmit} className="w-full flex flex-col space-y-3">
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        {isRegister && (
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First Name"
            required
          />
        )}
        {isRegister && (
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last Name"
            required
          />
        )}
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        {isRegister && (
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
            required
          />
        )}
        <SimpleButton
          buttonType="submit"
          caption={isRegister ? "Sign Up" : "Sign In"}
          color="primary"
          className="w-full"
        />
      </form>
    </>
  );
};

export default SignInForm;
