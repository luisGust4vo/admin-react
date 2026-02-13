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

type SurfaceKey = "oclusal" | "mesial" | "distal" | "vestibular" | "lingual";
type SurfaceStatus =
  | "saudavel"
  | "carie"
  | "restauracao"
  | "endodontia"
  | "ausente"
  | "protese";

type ToothClinicalDetail = {
  overallStatus: "estavel" | "atencao" | "critico";
  priority: "baixa" | "media" | "alta";
  plannedProcedure: string;
  estimatedCost: string;
  notes: string;
  surfaces: Record<SurfaceKey, SurfaceStatus>;
};

type OdontogramResponse = {
  selectedTeeth?: string[];
  toothNotes?: Record<string, string>;
  toothDetails?: Record<string, Partial<ToothClinicalDetail>>;
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

const defaultToothDetail = (): ToothClinicalDetail => ({
  overallStatus: "estavel",
  priority: "baixa",
  plannedProcedure: "",
  estimatedCost: "",
  notes: "",
  surfaces: {
    oclusal: "saudavel",
    mesial: "saudavel",
    distal: "saudavel",
    vestibular: "saudavel",
    lingual: "saudavel",
  },
});

const surfaceLabel: Record<SurfaceKey, string> = {
  oclusal: "Oclusal",
  mesial: "Mesial",
  distal: "Distal",
  vestibular: "Vestibular",
  lingual: "Lingual",
};

const surfaceStatusLabel: Record<SurfaceStatus, string> = {
  saudavel: "Saudável",
  carie: "Cárie",
  restauracao: "Restauração",
  endodontia: "Endodontia",
  ausente: "Ausente",
  protese: "Prótese",
};

const Odontogram: React.FC = () => {
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || "");
  const [selectedTeeth, setSelectedTeeth] = useState<ToothSelection[]>([]);
  const [toothNotes, setToothNotes] = useState<Record<string, string>>({});
  const [toothDetails, setToothDetails] = useState<
    Record<string, ToothClinicalDetail>
  >({});
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
          const incomingDetails = payload.toothDetails || {};
          const normalizedDetails: Record<string, ToothClinicalDetail> = {};
          Object.entries(incomingDetails).forEach(([toothId, detail]) => {
            normalizedDetails[toothId] = {
              ...defaultToothDetail(),
              ...detail,
              surfaces: {
                ...defaultToothDetail().surfaces,
                ...(detail?.surfaces || {}),
              },
              notes: detail?.notes || payload.toothNotes?.[toothId] || "",
            };
          });
          setToothDetails(normalizedDetails);
          setActiveToothId(hydrated[0]?.id || "");
        }
      } catch (error) {
        console.error("Load odontogram failed:", error);
        if (!cancelled) {
          setSelectedTeeth([]);
          setToothNotes({});
          setToothDetails({});
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

  const activeDetail = useMemo(() => {
    if (!selectedTooth) return null;
    return toothDetails[selectedTooth.id] || defaultToothDetail();
  }, [selectedTooth, toothDetails]);

  const selectedTeethIds = useMemo(
    () => selectedTeeth.map((tooth) => tooth.id),
    [selectedTeeth]
  );

  const overallStats = useMemo(() => {
    const total = selectedTeethIds.length;
    let estavel = 0;
    let atencao = 0;
    let critico = 0;

    selectedTeethIds.forEach((toothId) => {
      const status = toothDetails[toothId]?.overallStatus || "estavel";
      if (status === "estavel") estavel += 1;
      if (status === "atencao") atencao += 1;
      if (status === "critico") critico += 1;
    });
    return { total, estavel, atencao, critico };
  }, [selectedTeethIds, toothDetails]);

  const syncDetailsWithSelection = (teethList: ToothSelection[]) => {
    setToothDetails((prev) => {
      const next = { ...prev };
      teethList.forEach((tooth) => {
        if (!next[tooth.id]) {
          next[tooth.id] = defaultToothDetail();
        }
      });
      return next;
    });
  };

  const updateActiveToothDetail = (patch: Partial<ToothClinicalDetail>) => {
    if (!selectedTooth) return;
    setToothDetails((prev) => ({
      ...prev,
      [selectedTooth.id]: {
        ...(prev[selectedTooth.id] || defaultToothDetail()),
        ...patch,
      },
    }));
  };

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
            toothDetails,
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
                    const parsedTeeth = teeth as ToothSelection[];
                    setSelectedTeeth(parsedTeeth);
                    syncDetailsWithSelection(parsedTeeth);
                    if (parsedTeeth.length && !activeToothId) {
                      setActiveToothId(parsedTeeth[0].id);
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
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                <span>Total: {overallStats.total}</span>
                <span>Estável: {overallStats.estavel}</span>
                <span>Atenção: {overallStats.atencao}</span>
                <span>Crítico: {overallStats.critico}</span>
              </div>
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
                Detalhes clínicos por dente
              </h2>
              {selectedTooth && activeDetail ? (
                <div className="mt-3 space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Dente ativo:{" "}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {selectedTooth.notations.fdi || selectedTooth.id}
                    </span>
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={activeDetail.overallStatus}
                      onChange={(event) =>
                        updateActiveToothDetail({
                          overallStatus: event.target.value as ToothClinicalDetail["overallStatus"],
                        })
                      }
                      className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                    >
                      <option value="estavel">Status: Estável</option>
                      <option value="atencao">Status: Atenção</option>
                      <option value="critico">Status: Crítico</option>
                    </select>
                    <select
                      value={activeDetail.priority}
                      onChange={(event) =>
                        updateActiveToothDetail({
                          priority: event.target.value as ToothClinicalDetail["priority"],
                        })
                      }
                      className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                    >
                      <option value="baixa">Prioridade: Baixa</option>
                      <option value="media">Prioridade: Média</option>
                      <option value="alta">Prioridade: Alta</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    value={activeDetail.plannedProcedure}
                    onChange={(event) =>
                      updateActiveToothDetail({
                        plannedProcedure: event.target.value,
                      })
                    }
                    placeholder="Procedimento planejado"
                    className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                  />
                  <input
                    type="text"
                    value={activeDetail.estimatedCost}
                    onChange={(event) =>
                      updateActiveToothDetail({
                        estimatedCost: event.target.value,
                      })
                    }
                    placeholder="Custo estimado (R$)"
                    className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(surfaceLabel) as SurfaceKey[]).map((surface) => (
                      <div
                        key={surface}
                        className="rounded-lg border border-gray-200 p-2 dark:border-gray-700"
                      >
                        <p className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                          {surfaceLabel[surface]}
                        </p>
                        <select
                          value={activeDetail.surfaces[surface]}
                          onChange={(event) =>
                            updateActiveToothDetail({
                              surfaces: {
                                ...activeDetail.surfaces,
                                [surface]: event.target.value as SurfaceStatus,
                              },
                            })
                          }
                          className="h-8 w-full rounded border border-gray-300 bg-transparent px-2 text-xs dark:border-gray-700"
                        >
                          {(Object.keys(surfaceStatusLabel) as SurfaceStatus[]).map(
                            (status) => (
                              <option key={status} value={status}>
                                {surfaceStatusLabel[status]}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    ))}
                  </div>

                  <textarea
                    rows={4}
                    value={activeDetail.notes}
                    onChange={(event) => {
                      const nextNote = event.target.value;
                      updateActiveToothDetail({ notes: nextNote });
                      setToothNotes((prev) => ({
                        ...prev,
                        [selectedTooth.id]: nextNote,
                      }));
                    }}
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
