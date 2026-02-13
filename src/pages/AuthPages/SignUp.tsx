import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Cadastro | OdontoPro"
        description="Criação de conta para clínica na plataforma OdontoPro."
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
