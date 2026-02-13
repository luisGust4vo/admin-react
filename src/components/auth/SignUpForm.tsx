import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Alert from "../ui/alert/Alert";

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const navigate = useNavigate();

  const handleChange = (field: keyof typeof formValues) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const name = `${formValues.firstName.trim()} ${formValues.lastName.trim()}`
      .trim()
      .replace(/\s+/g, " ");
    const email = formValues.email.trim();
    const password = formValues.password;

    if (!isChecked) {
      setFormError("Você precisa aceitar os termos para continuar.");
      return;
    }

    if (!email || !name || !password) {
      setFormError("Preencha todos os campos obrigatórios.");
      return;
    }

    if (name.length < 2) {
      setFormError("Nome deve ter pelo menos 2 caracteres.");
      return;
    }

    if (password.length < 8) {
      setFormError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);

    try {
      const apiBase = import.meta.env.VITE_API_URL ?? "";
      const normalizedBase = apiBase.replace(/\/$/, "");
      const registerUrl = normalizedBase.endsWith("/register")
        ? normalizedBase
        : `${normalizedBase}/register`;
      const response = await fetch(registerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          name,
          password,
          termsAccepted: isChecked,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload?.message || "Não foi possível criar sua conta.";
        setFormError(message);
        return;
      }

      setFormSuccess("Cadastro realizado com sucesso.");
      setFormValues({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
      });
      setIsChecked(false);
      setTimeout(() => navigate("/signin"), 1200);
    } catch (error) {
      console.error("Register request failed:", error);
      setFormError("Falha ao conectar com o servidor. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <div className="w-full max-w-md mx-auto mb-5 sm:pt-10">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Voltar ao menu principal
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <span className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
              Comece em minutos
            </span>
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Crie sua conta
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure sua clínica e ative agenda, odontograma e laudos
              digitais.
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
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* <!-- First Name --> */}
                  <div className="sm:col-span-1">
                    <Label>
                      Nome<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="fname"
                      name="fname"
                      placeholder="Primeiro nome"
                      value={formValues.firstName}
                      onChange={handleChange("firstName")}
                    />
                  </div>
                  {/* <!-- Last Name --> */}
                  <div className="sm:col-span-1">
                    <Label>
                      Sobrenome<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="lname"
                      name="lname"
                      placeholder="Sobrenome"
                      value={formValues.lastName}
                      onChange={handleChange("lastName")}
                    />
                  </div>
                </div>
                {/* <!-- Email --> */}
                <div>
                  <Label>
                    Email<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="contato@suaclinica.com.br"
                    value={formValues.email}
                    onChange={handleChange("email")}
                  />
                </div>
                {/* <!-- Password --> */}
                <div>
                  <Label>
                    Senha de acesso<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Mínimo de 8 caracteres"
                      type={showPassword ? "text" : "password"}
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
                {/* <!-- Checkbox --> */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    className="w-5 h-5"
                    checked={isChecked}
                    onChange={setIsChecked}
                  />
                  <p className="inline-block font-normal text-gray-500 dark:text-gray-400">
                    Ao criar a conta da clínica você concorda com os{" "}
                    <span className="text-gray-800 dark:text-white/90">
                      Termos e Condições,
                    </span>{" "}
                    e nossa{" "}
                    <span className="text-gray-800 dark:text-white">
                      Política de Privacidade
                    </span>
                  </p>
                </div>
                {/* <!-- Button --> */}
                <div>
                  <button
                    className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? "Criando conta..." : "Criar conta"}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Você já possui uma conta?{" "}
                <Link
                  to="/signin"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Entrar
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
