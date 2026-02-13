import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";
import Alert from "../ui/alert/Alert";

type LoginApiResponse = {
  token?: string;
  accessToken?: string;
  jwt?: string;
  message?: string;
  user?: unknown;
  data?: {
    token?: string;
    accessToken?: string;
    user?: unknown;
  };
};

const resolveLoginApiCandidates = () => {
  const explicitUrl = import.meta.env.VITE_LOGIN_API_URL as string | undefined;
  if (explicitUrl) {
    return [explicitUrl.replace(/\/$/, "")];
  }

  const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
  if (!rawApiUrl) return ["/auth/login", "/login"];

  const normalized = rawApiUrl.replace(/\/$/, "");
  const derivedFromRegister = normalized
    .replace(/\/auth\/register$/, "/auth/login")
    .replace(/\/register$/, "/login");

  const candidates = [derivedFromRegister];
  try {
    const parsed = new URL(rawApiUrl);
    candidates.push(`${parsed.origin}/auth/login`, `${parsed.origin}/login`);
  } catch {
    candidates.push(`${normalized}/auth/login`, `${normalized}/login`);
  }

  candidates.push("/auth/login", "/login");
  return [...new Set(candidates)];
};

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({
    email: "",
    password: "",
  });
  const navigate = useNavigate();

  const handleChange =
    (field: keyof typeof formValues) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const email = formValues.email.trim();
    const password = formValues.password;

    if (!email || !password) {
      setFormError("Preencha email e senha.");
      return;
    }

    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);

    const candidates = resolveLoginApiCandidates();
    let lastErrorMessage = "Não foi possível entrar com as credenciais informadas.";
    let authenticated = false;

    for (const endpoint of candidates) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | LoginApiResponse
            | null;
          const message =
            payload?.message || "Não foi possível autenticar com este endpoint.";
          lastErrorMessage = message;
          if (response.status >= 500) continue;
          if (response.status === 404 || response.status === 405) continue;
          break;
        }

        const payload = (await response.json().catch(() => ({}))) as LoginApiResponse;
        const token =
          payload.token ||
          payload.accessToken ||
          payload.jwt ||
          payload.data?.token ||
          payload.data?.accessToken;
        const user = payload.user || payload.data?.user;

        const storage = isChecked ? localStorage : sessionStorage;
        if (token) {
          storage.setItem("odonto_auth_token", token);
        }
        if (user) {
          storage.setItem("odonto_auth_user", JSON.stringify(user));
        }
        storage.setItem("odonto_auth_email", email);

        authenticated = true;
        break;
      } catch (error) {
        console.error(`Login request failed for ${endpoint}:`, error);
        lastErrorMessage = "Falha ao conectar com o servidor.";
      }
    }

    if (!authenticated) {
      setFormError(lastErrorMessage);
      setIsSubmitting(false);
      return;
    }

    setFormSuccess("Login realizado com sucesso.");
    setTimeout(() => navigate("/"), 700);
    setIsSubmitting(false);
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Voltar ao painel clínico
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-6 sm:mb-8">
            <span className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
              Acesso seguro
            </span>
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Entrar na sua clínica
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Use seu email profissional para acessar agenda, prontuários e
              laudos odontológicos.
            </p>
          </div>
          <div>
            {formError && (
              <div className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="mb-4">
                <Alert
                  variant="success"
                  title="Sucesso"
                  message={formSuccess}
                  showLink={false}
                />
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <Label>
                    Email <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    placeholder="contato@suaclinica.com.br"
                    value={formValues.email}
                    onChange={handleChange("email")}
                  />
                </div>
                <div>
                  <Label>
                    Senha <span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua senha"
                      value={formValues.password}
                      onChange={handleChange("password")}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      Manter conectado neste dispositivo
                    </span>
                  </div>
                  <Link
                    to="/reset-password"
                    className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <div>
                  <Button className="w-full" size="sm" disabled={isSubmitting}>
                    {isSubmitting ? "Entrando..." : "Entrar"}
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Ainda não tem conta?{" "}
                <Link
                  to="/signup"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Criar cadastro
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
