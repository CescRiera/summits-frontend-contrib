import LoginForm from "./desktop-LoginForm.tsx";
import AuthShell from "./desktop-AuthShell.tsx";
import { RegisterFlowContent } from "./desktop-RegisterFlow.tsx";

type LoginRegisterProps = {
  footer?: React.ReactNode;
  mode?: "login" | "register";
};

const LoginRegister: React.FC<LoginRegisterProps> = ({ footer, mode = "login" }) => {
  return (
    <AuthShell mode={mode} footer={footer}>
      {mode === "login" ? <LoginForm /> : <RegisterFlowContent />}
    </AuthShell>
  );
};

export default LoginRegister;
