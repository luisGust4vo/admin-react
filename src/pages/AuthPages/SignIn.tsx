import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Entrar | OdontoPro"
        description="Acesso à plataforma OdontoPro para gestão de consultórios odontológicos."
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
