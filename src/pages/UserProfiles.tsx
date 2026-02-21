import { FormEvent, useEffect, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import {
  getAuthProfile,
  getProfileInitials,
  updateAuthProfile,
  type AuthProfile,
} from "../utils/auth";

type ProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatarUrl: string;
};

const toFormValues = (profile: AuthProfile): ProfileForm => ({
  firstName: profile.firstName,
  lastName: profile.lastName,
  email: profile.email,
  role: profile.role,
  avatarUrl: profile.avatarUrl,
});

export default function UserProfiles() {
  const [profile, setProfile] = useState<AuthProfile>(getAuthProfile);
  const [formValues, setFormValues] = useState<ProfileForm>(() =>
    toFormValues(getAuthProfile())
  );
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState<string>("");

  useEffect(() => {
    const syncProfile = () => {
      const nextProfile = getAuthProfile();
      setProfile(nextProfile);
      if (!isEditing) {
        setFormValues(toFormValues(nextProfile));
      }
    };

    syncProfile();
    window.addEventListener("focus", syncProfile);
    window.addEventListener("storage", syncProfile);

    return () => {
      window.removeEventListener("focus", syncProfile);
      window.removeEventListener("storage", syncProfile);
    };
  }, [isEditing]);

  const handleInputChange =
    (field: keyof ProfileForm) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const firstName = formValues.firstName.trim();
    const lastName = formValues.lastName.trim();
    const email = formValues.email.trim();
    const role = formValues.role.trim();

    if (!firstName) {
      setFeedback("O nome é obrigatório.");
      return;
    }

    if (!email) {
      setFeedback("O email é obrigatório.");
      return;
    }

    updateAuthProfile({
      firstName,
      lastName,
      email,
      role: role || "Clínica",
      avatarUrl: formValues.avatarUrl,
    });

    const nextProfile = getAuthProfile();
    setProfile(nextProfile);
    setFormValues(toFormValues(nextProfile));
    setFeedback("Perfil atualizado com sucesso.");
    setIsEditing(false);
  };

  return (
    <>
      <PageMeta
        title="Perfil da Clínica | OdontoPro"
        description="Dados do usuário autenticado na OdontoPro."
      />
      <PageBreadcrumb pageTitle="Perfil" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          Perfil da clínica
        </h3>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.02] lg:col-span-1">
            {profile.avatarUrl ? (
              <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-full border border-gray-200 dark:border-gray-800">
                <img
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-cyan-100 text-2xl font-semibold text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300">
                {getProfileInitials(profile.fullName)}
              </div>
            )}
            <h4 className="text-center text-lg font-semibold text-gray-900 dark:text-white">
              {profile.fullName}
            </h4>
            <p className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
              {profile.role}
            </p>
            <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500">
              {profile.avatarUrl ? "Foto de perfil ativa" : "Sem foto de perfil"}
            </p>
          </div>

          <form
            onSubmit={handleSave}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.02] lg:col-span-2"
          >
            <div className="mb-4 flex items-center justify-between">
              <h5 className="text-base font-semibold text-gray-900 dark:text-white">
                Informações da conta
              </h5>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => {
                    setFeedback("");
                    setIsEditing(true);
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  Editar
                </button>
              ) : null}
            </div>

            <div className="mb-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                Foto de perfil
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5">
                  Escolher foto
                  <input
                    type="file"
                    accept="image/*"
                    disabled={!isEditing}
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (!file.type.startsWith("image/")) {
                        setFeedback("Selecione um arquivo de imagem válido.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        const result = reader.result;
                        if (typeof result === "string") {
                          setFormValues((prev) => ({ ...prev, avatarUrl: result }));
                          setFeedback("");
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={!isEditing}
                  onClick={() =>
                    setFormValues((prev) => ({ ...prev, avatarUrl: "" }))
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  Remover foto
                </button>
              </div>
              <div className="mt-3">
                {formValues.avatarUrl ? (
                  <div className="h-16 w-16 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700">
                    <img
                      src={formValues.avatarUrl}
                      alt="Pré-visualização da foto"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-100 text-sm font-semibold text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300">
                    {getProfileInitials(
                      `${formValues.firstName} ${formValues.lastName}`.trim() ||
                        "Usuário"
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Nome
                </label>
                <input
                  type="text"
                  value={formValues.firstName}
                  onChange={handleInputChange("firstName")}
                  disabled={!isEditing}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-700 dark:text-white/90 dark:disabled:bg-white/5"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Sobrenome
                </label>
                <input
                  type="text"
                  value={formValues.lastName}
                  onChange={handleInputChange("lastName")}
                  disabled={!isEditing}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-700 dark:text-white/90 dark:disabled:bg-white/5"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Email
                </label>
                <input
                  type="email"
                  value={formValues.email}
                  onChange={handleInputChange("email")}
                  disabled={!isEditing}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-700 dark:text-white/90 dark:disabled:bg-white/5"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Cargo
                </label>
                <input
                  type="text"
                  value={formValues.role}
                  onChange={handleInputChange("role")}
                  disabled={!isEditing}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-700 dark:text-white/90 dark:disabled:bg-white/5"
                />
              </div>
            </div>

            {feedback ? (
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{feedback}</p>
            ) : null}

            {isEditing ? (
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFormValues(toFormValues(profile));
                    setFeedback("");
                    setIsEditing(false);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                >
                  Salvar
                </button>
              </div>
            ) : null}
          </form>
        </div>
      </div>
    </>
  );
}
