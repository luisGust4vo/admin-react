import { useEffect, useMemo, useState } from "react";
import { Odontogram as ReactOdontogram } from "react-odontogram";
import "../styles/react-odontogram.css";
import PageMeta from "../components/common/PageMeta";

type OdontogramPatient = {
  id: string;
  name: string;
};

type ToothSelection = {
  id: string;
  notations: {
    fdi: string;
    universal: string;
    palmer: string;
  };
  type: string;
};

type OdontogramResponse = {
  selectedTeeth?: string[];
  toothNotes?: Record<string, string>;
};

const resolveOdontogramApiUrl = () => {
  const explicitUrl = import.meta.env.VITE_ODONTOGRAM_API_URL as
    | string
    | undefined;
  if (explicitUrl) return explicitUrl.replace(/\/$/, "");

  const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
  if (!rawApiUrl) return "/clinic/odontogram";

  try {
    const parsed = new URL(rawApiUrl);
    return `${parsed.origin}/clinic/odontogram`;
  } catch {
    return `${rawApiUrl.replace(/\/$/, "").replace(/\/auth\/register$/, "")}/clinic/odontogram`;
  }
};

const ODONTOGRAM_API_URL = resolveOdontogramApiUrl();

const patients: OdontogramPatient[] = [
  { id: "p1", name: "Mariana Ferreira" },
  { id: "p2", name: "Roberto Almeida" },
  { id: "p3", name: "Eduarda Nogueira" },
];

const Odontogram: React.FC = () => {
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || "");
  const [selectedTeeth, setSelectedTeeth] = useState<ToothSelection[]>([]);
  const [toothNotes, setToothNotes] = useState<Record<string, string>>({});
  const [activeToothId, setActiveToothId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPatientId) return;
    let cancelled = false;

    const loadOdontogram = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await fetch(
          `${ODONTOGRAM_API_URL}?patientId=${encodeURIComponent(selectedPatientId)}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );
        if (!response.ok) throw new Error(`Falha ao carregar: ${response.status}`);

        const payload = (await response.json().catch(() => ({}))) as OdontogramResponse;
        const selectedFromApi = payload.selectedTeeth || [];
        const hydrated: ToothSelection[] = selectedFromApi.map((id) => ({
          id,
          notations: {
            fdi: id.replace("teeth-", ""),
            universal: "",
            palmer: "",
          },
          type: "Tooth",
        }));

        if (!cancelled) {
          setSelectedTeeth(hydrated);
          setToothNotes(payload.toothNotes || {});
          setActiveToothId(hydrated[0]?.id || "");
        }
      } catch (error) {
        console.error("Load odontogram failed:", error);
        if (!cancelled) {
          setSelectedTeeth([]);
          setToothNotes({});
          setActiveToothId("");
          setErrorMessage(
            "Não foi possível carregar do backend. Você pode editar localmente."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadOdontogram();

    return () => {
      cancelled = true;
    };
  }, [selectedPatientId]);

  const selectedTooth = useMemo(
    () => selectedTeeth.find((tooth) => tooth.id === activeToothId) || null,
    [selectedTeeth, activeToothId]
  );

  const selectedTeethIds = useMemo(
    () => selectedTeeth.map((tooth) => tooth.id),
    [selectedTeeth]
  );

  const saveOdontogram = async () => {
    if (!selectedPatientId || isSaving) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await fetch(
        `${ODONTOGRAM_API_URL}/${encodeURIComponent(selectedPatientId)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            patientId: selectedPatientId,
            selectedTeeth: selectedTeethIds,
            toothNotes,
          }),
        }
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Falha ao salvar odontograma.");
      }
      setSuccessMessage("Odontograma salvo com sucesso.");
    } catch (error) {
      console.error("Save odontogram failed:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Erro ao salvar odontograma."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Odontograma Interativo | Clínica"
        description="Mapa dentário visual com padrão clínico."
      />
      <section className="space-y-6">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-linear-to-r from-emerald-700 via-teal-700 to-sky-700 p-6 text-white shadow-theme-xl dark:border-gray-800">
          <div className="absolute -left-10 top-0 h-44 w-44 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute -right-10 bottom-0 h-44 w-44 rounded-full bg-black/15 blur-2xl"></div>
          <div className="relative z-10">
            <h1 className="text-2xl font-semibold sm:text-3xl">
              Odontograma Interativo
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-white/90 sm:text-base">
              Visual clínico completo no padrão odontograma para marcação de dentes.
            </p>
          </div>
        </div>

        {(errorMessage || successMessage || isLoading) && (
          <div className="space-y-2">
            {errorMessage && (
              <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-2.5 text-sm text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="rounded-xl border border-success-200 bg-success-50 px-4 py-2.5 text-sm text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-200">
                {successMessage}
              </div>
            )}
            {isLoading && (
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
                Carregando odontograma...
              </div>
            )}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-12">
          <div className="space-y-5 xl:col-span-8">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <select
                  value={selectedPatientId}
                  onChange={(event) => setSelectedPatientId(event.target.value)}
                  className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                >
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={saveOdontogram}
                  disabled={isSaving}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
                >
                  {isSaving ? "Salvando..." : "Salvar odontograma"}
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                <ReactOdontogram
                  key={selectedPatientId}
                  defaultSelected={selectedTeethIds}
                  onChange={(teeth) => {
                    setSelectedTeeth(teeth as ToothSelection[]);
                    if (teeth.length && !activeToothId) {
                      setActiveToothId(teeth[0].id);
                    }
                  }}
                  theme="light"
                  notation="FDI"
                  maxTeeth={8}
                  showHalf="full"
                  showTooltip={true}
                  colors={{
                    darkBlue: "#0f766e",
                    baseBlue: "#94a3b8",
                    lightBlue: "#67e8f9",
                  }}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <aside className="space-y-5 xl:col-span-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Dentes selecionados
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedTeeth.map((tooth) => (
                  <button
                    key={tooth.id}
                    type="button"
                    onClick={() => setActiveToothId(tooth.id)}
                    className={`rounded-md border px-2 py-1 text-xs font-medium ${
                      tooth.id === activeToothId
                        ? "border-cyan-500 bg-cyan-50 text-cyan-700 dark:border-cyan-500/50 dark:bg-cyan-500/10 dark:text-cyan-300"
                        : "border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {tooth.notations.fdi || tooth.id.replace("teeth-", "")}
                  </button>
                ))}
                {!selectedTeeth.length && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Nenhum dente selecionado.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Nota por dente
              </h2>
              {selectedTooth ? (
                <div className="mt-3 space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Dente ativo:{" "}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {selectedTooth.notations.fdi || selectedTooth.id}
                    </span>
                  </p>
                  <textarea
                    rows={4}
                    value={toothNotes[selectedTooth.id] || ""}
                    onChange={(event) =>
                      setToothNotes((prev) => ({
                        ...prev,
                        [selectedTooth.id]: event.target.value,
                      }))
                    }
                    placeholder="Observação clínica deste dente"
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
                  />
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Selecione um dente para registrar observações.
                </p>
              )}
            </div>
          </aside>
        </div>
      </section>
    </>
  );
};

export default Odontogram;
