import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import PageMeta from "../components/common/PageMeta";

type RecordAttachment = {
  id: string;
  fileName: string;
  fileType: "xray" | "photo" | "document";
  uploadedAt: string;
  url?: string;
};

type ClinicalEntry = {
  id: string;
  createdAt: string;
  professional: string;
  type: "anamnesis" | "evolution" | "procedure" | "alert";
  content: string;
};

type TreatmentItem = {
  id: string;
  tooth: string;
  procedure: string;
  status: "planned" | "in_progress" | "done";
  estimatedCost: number;
  scheduledDate?: string;
};

type PatientRecord = {
  id: string;
  name: string;
  phone: string;
  birthDate: string;
  riskLevel: "low" | "medium" | "high";
  allergies: string[];
  lastVisit: string;
  nextVisit?: string;
  attachments: RecordAttachment[];
  timeline: ClinicalEntry[];
  treatmentPlan: TreatmentItem[];
};

type RecordsPayload = {
  patients?: PatientRecord[];
};

const resolveRecordsApiUrl = () => {
  const explicitUrl = import.meta.env.VITE_SMART_RECORDS_API_URL as
    | string
    | undefined;
  if (explicitUrl) return explicitUrl.replace(/\/$/, "");

  const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
  if (!rawApiUrl) return "/clinic/records";

  try {
    const parsed = new URL(rawApiUrl);
    return `${parsed.origin}/clinic/records`;
  } catch {
    return `${rawApiUrl.replace(/\/$/, "").replace(/\/auth\/register$/, "")}/clinic/records`;
  }
};

const RECORDS_API_URL = resolveRecordsApiUrl();

const samplePatients: PatientRecord[] = [
  {
    id: "p1",
    name: "Mariana Ferreira",
    phone: "(11) 98888-1200",
    birthDate: "1992-03-18",
    riskLevel: "low",
    allergies: ["Nenhuma"],
    lastVisit: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    nextVisit: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    attachments: [
      {
        id: "at1",
        fileName: "rx-periapical-16.jpg",
        fileType: "xray",
        uploadedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "at2",
        fileName: "foto-inicial-arcada.jpg",
        fileType: "photo",
        uploadedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    timeline: [
      {
        id: "t1",
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        professional: "Dra. Juliana",
        type: "anamnesis",
        content: "Paciente relata sensibilidade no quadrante superior direito.",
      },
      {
        id: "t2",
        createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
        professional: "Dra. Juliana",
        type: "procedure",
        content: "Restauração em resina no dente 16 sem intercorrências.",
      },
    ],
    treatmentPlan: [
      {
        id: "tr1",
        tooth: "16",
        procedure: "Ajuste oclusal",
        status: "planned",
        estimatedCost: 300,
        scheduledDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      },
      {
        id: "tr2",
        tooth: "26",
        procedure: "Avaliação de infiltração",
        status: "in_progress",
        estimatedCost: 420,
      },
    ],
  },
  {
    id: "p2",
    name: "Roberto Almeida",
    phone: "(11) 97777-5500",
    birthDate: "1981-10-04",
    riskLevel: "high",
    allergies: ["Dipirona"],
    lastVisit: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    nextVisit: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    attachments: [
      {
        id: "at3",
        fileName: "tomografia-maxila.pdf",
        fileType: "document",
        uploadedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    timeline: [
      {
        id: "t3",
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        professional: "Dr. Marcelo",
        type: "alert",
        content: "Atenção para alergia medicamentosa (dipirona).",
      },
      {
        id: "t4",
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        professional: "Dr. Marcelo",
        type: "evolution",
        content: "Boa cicatrização pós-extração. Sem edema importante.",
      },
    ],
    treatmentPlan: [
      {
        id: "tr3",
        tooth: "48",
        procedure: "Revisão pós-operatória",
        status: "planned",
        estimatedCost: 0,
        scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      },
    ],
  },
];

const typeLabel: Record<ClinicalEntry["type"], string> = {
  anamnesis: "Anamnese",
  evolution: "Evolução",
  procedure: "Procedimento",
  alert: "Alerta",
};

const riskClass: Record<PatientRecord["riskLevel"], string> = {
  low: "border-success-200 bg-success-50 text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300",
  medium:
    "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/40 dark:bg-warning-500/10 dark:text-warning-300",
  high: "border-error-200 bg-error-50 text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300",
};

const riskLabel: Record<PatientRecord["riskLevel"], string> = {
  low: "Baixo",
  medium: "Médio",
  high: "Alto",
};

const treatmentStatusLabel: Record<TreatmentItem["status"], string> = {
  planned: "Planejado",
  in_progress: "Em andamento",
  done: "Concluído",
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const SmartRecords: React.FC = () => {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [newEntryType, setNewEntryType] = useState<ClinicalEntry["type"]>(
    "evolution"
  );
  const [newEntryText, setNewEntryText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadPatients = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await fetch(RECORDS_API_URL, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Falha ao carregar prontuários: ${response.status}`);
        }

        const payload = (await response.json().catch(() => ({}))) as RecordsPayload;
        const list = payload.patients?.length ? payload.patients : samplePatients;

        if (!cancelled) {
          setPatients(list);
          setSelectedPatientId(list[0]?.id || "");
        }
      } catch (error) {
        console.error("Load smart records failed:", error);
        if (!cancelled) {
          setErrorMessage(
            "Não foi possível carregar do backend. Exibindo prontuários de exemplo."
          );
          setPatients(samplePatients);
          setSelectedPatientId(samplePatients[0]?.id || "");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadPatients();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPatients = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return patients;
    return patients.filter(
      (patient) =>
        patient.name.toLowerCase().includes(term) ||
        patient.phone.toLowerCase().includes(term)
    );
  }, [patients, searchTerm]);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) || null,
    [patients, selectedPatientId]
  );

  const totalTreatmentValue = useMemo(() => {
    if (!selectedPatient) return 0;
    return selectedPatient.treatmentPlan.reduce(
      (sum, item) => sum + item.estimatedCost,
      0
    );
  }, [selectedPatient]);

  const pendingTreatments = useMemo(() => {
    if (!selectedPatient) return 0;
    return selectedPatient.treatmentPlan.filter((item) => item.status !== "done")
      .length;
  }, [selectedPatient]);

  const handleAddEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPatient || isSavingEntry) return;
    if (!newEntryText.trim()) {
      setErrorMessage("Escreva uma observação clínica antes de salvar.");
      return;
    }

    setIsSavingEntry(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const entryPayload = {
      type: newEntryType,
      content: newEntryText.trim(),
      patientId: selectedPatient.id,
    };

    try {
      const response = await fetch(
        `${RECORDS_API_URL}/${encodeURIComponent(selectedPatient.id)}/timeline`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(entryPayload),
        }
      );

      const saved = response.ok
        ? await response.json().catch(() => null)
        : null;

      const createdEntry: ClinicalEntry = {
        id: saved?.id ? String(saved.id) : `local-${Date.now()}`,
        createdAt: saved?.createdAt || new Date().toISOString(),
        professional: saved?.professional || "Profissional da clínica",
        type: saved?.type || newEntryType,
        content: saved?.content || newEntryText.trim(),
      };

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient.id
            ? { ...patient, timeline: [createdEntry, ...patient.timeline] }
            : patient
        )
      );
      setSuccessMessage("Evolução registrada no prontuário.");
      setNewEntryText("");
    } catch (error) {
      console.error("Save clinical entry failed:", error);
      setErrorMessage("Falha ao salvar a evolução no backend.");
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleAttachmentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedPatient) return;

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const attachmentType: RecordAttachment["fileType"] =
      ext === "jpg" || ext === "jpeg" || ext === "png"
        ? "photo"
        : ext === "pdf"
          ? "document"
          : "xray";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", attachmentType);

    setErrorMessage(null);
    try {
      await fetch(
        `${RECORDS_API_URL}/${encodeURIComponent(selectedPatient.id)}/attachments`,
        {
          method: "POST",
          body: formData,
        }
      );

      const createdAttachment: RecordAttachment = {
        id: `att-${Date.now()}`,
        fileName: file.name,
        fileType: attachmentType,
        uploadedAt: new Date().toISOString(),
      };

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient.id
            ? {
                ...patient,
                attachments: [createdAttachment, ...patient.attachments],
              }
            : patient
        )
      );
      setSuccessMessage("Anexo incluído no prontuário.");
    } catch (error) {
      console.error("Attachment upload failed:", error);
      setErrorMessage("Falha ao anexar arquivo no backend.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <>
      <PageMeta
        title="Prontuário Inteligente | Clínica"
        description="Histórico clínico, anexos e plano de tratamento do paciente."
      />

      <section className="space-y-6">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-linear-to-r from-slate-800 via-cyan-800 to-teal-700 p-6 text-white shadow-theme-xl dark:border-gray-800">
          <div className="absolute -left-12 top-2 h-48 w-48 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute -right-16 bottom-1 h-52 w-52 rounded-full bg-black/15 blur-2xl"></div>
          <div className="relative z-10">
            <h1 className="text-2xl font-semibold sm:text-3xl">
              Prontuário Odontológico Inteligente
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-white/90 sm:text-base">
              Linha do tempo clínica, anexos de raio-x/fotos e plano de tratamento
              em uma visão única por paciente.
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
                Carregando prontuários...
              </div>
            )}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-12">
          <aside className="space-y-4 xl:col-span-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar paciente por nome ou telefone"
                className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
              />
            </div>
            <div className="max-h-[760px] space-y-3 overflow-y-auto pr-1">
              {filteredPatients.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => setSelectedPatientId(patient.id)}
                  className={`w-full rounded-2xl border p-4 text-left ${
                    selectedPatientId === patient.id
                      ? "border-cyan-400 bg-cyan-50 dark:border-cyan-500/50 dark:bg-cyan-500/10"
                      : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {patient.name}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${riskClass[patient.riskLevel]}`}
                    >
                      Risco {riskLabel[patient.riskLevel]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {patient.phone}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Última consulta: {formatDateTime(patient.lastVisit)}
                  </p>
                </button>
              ))}
              {!filteredPatients.length && (
                <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  Nenhum paciente encontrado.
                </div>
              )}
            </div>
          </aside>

          <div className="space-y-5 xl:col-span-8">
            {selectedPatient ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Paciente
                    </p>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                      {selectedPatient.name}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Próxima consulta
                    </p>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                      {selectedPatient.nextVisit
                        ? formatDateTime(selectedPatient.nextVisit)
                        : "Não agendada"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Itens pendentes
                    </p>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                      {pendingTreatments}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Valor plano
                    </p>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(totalTreatmentValue)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      Linha do tempo clínica
                    </h2>
                    <div className="mt-4 space-y-3">
                      {selectedPatient.timeline.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-700"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                              {typeLabel[entry.type]}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDateTime(entry.createdAt)}
                            </p>
                          </div>
                          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                            {entry.content}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {entry.professional}
                          </p>
                        </div>
                      ))}
                      {!selectedPatient.timeline.length && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Sem histórico registrado.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <form
                      onSubmit={handleAddEntry}
                      className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
                    >
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        Nova evolução
                      </h2>
                      <div className="mt-4 space-y-3">
                        <select
                          value={newEntryType}
                          onChange={(event) =>
                            setNewEntryType(event.target.value as ClinicalEntry["type"])
                          }
                          className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                        >
                          <option value="evolution">Evolução</option>
                          <option value="procedure">Procedimento</option>
                          <option value="anamnesis">Anamnese</option>
                          <option value="alert">Alerta</option>
                        </select>
                        <textarea
                          rows={4}
                          value={newEntryText}
                          onChange={(event) => setNewEntryText(event.target.value)}
                          placeholder="Descreva a observação clínica..."
                          className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
                        />
                        <button
                          type="submit"
                          disabled={isSavingEntry}
                          className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
                        >
                          {isSavingEntry ? "Salvando..." : "Salvar evolução"}
                        </button>
                      </div>
                    </form>

                    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        Anexos e imagens
                      </h2>
                      <div className="mt-4">
                        <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                          <input
                            type="file"
                            onChange={handleAttachmentUpload}
                            className="hidden"
                          />
                          Adicionar anexo
                        </label>
                        <div className="mt-3 space-y-2">
                          {selectedPatient.attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
                            >
                              <p className="font-medium text-gray-800 dark:text-white/90">
                                {attachment.fileName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Tipo: {attachment.fileType} -{" "}
                                {formatDateTime(attachment.uploadedAt)}
                              </p>
                            </div>
                          ))}
                          {!selectedPatient.attachments.length && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Nenhum anexo registrado.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Plano de tratamento
                  </h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[680px]">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-800">
                          <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Dente
                          </th>
                          <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Procedimento
                          </th>
                          <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Status
                          </th>
                          <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Previsto
                          </th>
                          <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Custo
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPatient.treatmentPlan.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-gray-100 text-sm dark:border-gray-800"
                          >
                            <td className="px-2 py-3 text-gray-700 dark:text-gray-300">
                              {item.tooth}
                            </td>
                            <td className="px-2 py-3 text-gray-700 dark:text-gray-300">
                              {item.procedure}
                            </td>
                            <td className="px-2 py-3 text-gray-700 dark:text-gray-300">
                              {treatmentStatusLabel[item.status]}
                            </td>
                            <td className="px-2 py-3 text-gray-700 dark:text-gray-300">
                              {item.scheduledDate
                                ? new Date(
                                    `${item.scheduledDate}T00:00:00`
                                  ).toLocaleDateString("pt-BR")
                                : "-"}
                            </td>
                            <td className="px-2 py-3 text-gray-900 dark:text-white">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(item.estimatedCost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-16 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                Selecione um paciente para visualizar o prontuário.
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default SmartRecords;
