import { useState, type FC } from "react";
import { useNavigate } from "react-router";

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
  
  const navigate = useNavigate();

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const combinedName = isRegister ? `${firstName.trim()} ${lastName.trim()}`.trim() : undefined;
    submitHandler(email, password, confirmPassword, combinedName);
  };

  const handleConfirmExistingAccount = () => {
    const trimmedEmail = email.trim();
    navigate("/confirm", {
      state: {
        email: trimmedEmail || undefined,
      },
    });
  };

  return (
  <div className="bg-gray-100 flex flex-col items-center justify-center min-h-screen w-full">
      <h1>{isRegister?"SIGN UP PAGE": "LOGIN PAGE"}</h1>
      <h4>
          {isRegister ? "Sign up to create an account" : "Sign in to your account"}
      </h4>
    <form onSubmit={ handleSubmit }>
      <div>
        <label className="block text-gray-700 font-medium mb-1">Email</label>
        <input
          className="inputText"
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
      </div>
      {isRegister && (
        <div>
          <label className="block text-gray-700 font-medium mb-1">First Name</label>
          <input
            className="inputText"
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First Name"
            required
          />
        </div>
      )}
      {isRegister && (
        <div>
          <input
            className="inputText"
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last Name"
            required
          />
        </div>
      )}
      <div>
        <input
          className="inputText"
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
      </div>
      {isRegister && (
        <div>
          <input
            className="inputText"
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
            required
          />
        </div>
      )}
      <button type="submit">{isRegister ? "Sign Up" : "Sign In"}</button>
    </form>
    <button type="button" onClick={handleConfirmExistingAccount}>
      Confirm existing account
    </button>
    <button type="button" onClick={isRegister? () => navigate("/login"): () => navigate("/register")}>
      {isRegister
        ? "Already have an account? Sign In"
        : "Need an account? Sign Up"}
      </button>
  </div>
  );
};

export default SignInForm;