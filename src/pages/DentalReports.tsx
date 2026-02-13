import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import PageMeta from "../components/common/PageMeta";

type DentalReportForm = {
  clinicName: string;
  city: string;
  reportDate: string;
  patientName: string;
  patientBirthDate: string;
  patientDocument: string;
  dentistName: string;
  cro: string;
  anamnesis: string;
  clinicalFindings: string;
  radiographicFindings: string;
  diagnosticHypothesis: string;
  treatmentPlan: string;
  prescriptions: string;
  recommendations: string;
  additionalNotes: string;
};

type DentalReportApiResponse = {
  id?: string | number;
  message?: string;
  reportNumber?: string;
};

const resolveReportsApiUrl = () => {
  const explicitUrl = import.meta.env.VITE_DENTAL_REPORTS_API_URL as
    | string
    | undefined;
  if (explicitUrl) return explicitUrl.replace(/\/$/, "");

  const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
  if (!rawApiUrl) return "/odontology/reports";

  try {
    const parsed = new URL(rawApiUrl);
    return `${parsed.origin}/odontology/reports`;
  } catch {
    return `${rawApiUrl.replace(/\/$/, "").replace(/\/auth\/register$/, "")}/odontology/reports`;
  }
};

const REPORTS_API_URL = resolveReportsApiUrl();

const todayIso = new Date().toISOString().split("T")[0];

const initialForm: DentalReportForm = {
  clinicName: "",
  city: "",
  reportDate: todayIso,
  patientName: "",
  patientBirthDate: "",
  patientDocument: "",
  dentistName: "",
  cro: "",
  anamnesis: "",
  clinicalFindings: "",
  radiographicFindings: "",
  diagnosticHypothesis: "",
  treatmentPlan: "",
  prescriptions: "",
  recommendations: "",
  additionalNotes: "",
};

const formatPrettyDate = (date: string) => {
  if (!date) return "";
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR");
};

const DentalReports: React.FC = () => {
  const [formValues, setFormValues] = useState<DentalReportForm>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdReportId, setCreatedReportId] = useState<string | null>(null);
  const [signatureTouched, setSignatureTouched] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const reportPreviewDate = useMemo(
    () => formatPrettyDate(formValues.reportDate),
    [formValues.reportDate]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;

    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 2;
    context.strokeStyle = "#111827";
  }, []);

  const setField =
    (field: keyof DentalReportForm) =>
    (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const getCanvasCoordinates = (
    event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in event) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top,
      };
    }

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startDrawing = (
    event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const { x, y } = getCanvasCoordinates(event);
    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
    setSignatureTouched(true);
  };

  const draw = (
    event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const { x, y } = getCanvasCoordinates(event);
    context.lineTo(x, y);
    context.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSignatureTouched(false);
  };

  const validateForm = () => {
    if (!formValues.patientName.trim()) return "Preencha o nome do paciente.";
    if (!formValues.dentistName.trim()) return "Preencha o nome do dentista.";
    if (!formValues.cro.trim()) return "Preencha o CRO do dentista.";
    if (!formValues.diagnosticHypothesis.trim()) {
      return "Preencha a hipótese diagnóstica.";
    }
    if (!hasSignature) {
      return "A assinatura é obrigatória para emitir o laudo.";
    }
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    const validationError = validateForm();
    if (validationError) {
      setApiError(validationError);
      setSuccessMessage(null);
      return;
    }

    const signatureDataUrl = canvasRef.current?.toDataURL("image/png");
    if (!signatureDataUrl) {
      setApiError("Não foi possível capturar a assinatura.");
      return;
    }

    const payload = {
      ...formValues,
      signatureImageBase64: signatureDataUrl,
      signedAt: new Date().toISOString(),
    };

    setApiError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch(REPORTS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        const message =
          errorPayload?.message || "Não foi possível salvar o laudo.";
        setApiError(message);
        return;
      }

      const savedData =
        (await response.json().catch(() => ({}))) as DentalReportApiResponse;
      const idFromApi =
        savedData.id?.toString() || savedData.reportNumber || null;
      setCreatedReportId(idFromApi);
      setSuccessMessage(
        savedData.message || "Laudo odontológico salvo com sucesso."
      );
    } catch (error) {
      console.error("Dental report save failed:", error);
      setApiError("Falha ao conectar com o backend.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewReport = () => {
    setFormValues({ ...initialForm, reportDate: todayIso });
    setApiError(null);
    setSuccessMessage(null);
    setCreatedReportId(null);
    clearSignature();
  };

  return (
    <>
      <PageMeta
        title="Laudos Odontológicos | Admin"
        description="Emissão e assinatura de laudos odontológicos."
      />

      <section className="mx-auto w-full max-w-7xl">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Emissão de Laudo Odontológico
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Preencha os dados clínicos e assine digitalmente para registrar o
              documento.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-12">
            <form onSubmit={handleSubmit} className="space-y-5 lg:col-span-8">
              {apiError && (
                <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
                  {apiError}
                </div>
              )}
              {successMessage && (
                <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-200">
                  {successMessage}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Clínica
                  </label>
                  <input
                    type="text"
                    value={formValues.clinicName}
                    onChange={setField("clinicName")}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formValues.city}
                    onChange={setField("city")}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Data do laudo
                  </label>
                  <input
                    type="date"
                    lang="pt-BR"
                    value={formValues.reportDate}
                    onChange={setField("reportDate")}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Paciente
                  </label>
                  <input
                    type="text"
                    value={formValues.patientName}
                    onChange={setField("patientName")}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Documento
                  </label>
                  <input
                    type="text"
                    value={formValues.patientDocument}
                    onChange={setField("patientDocument")}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                    placeholder="CPF/RG"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Data de nascimento
                  </label>
                  <input
                    type="date"
                    lang="pt-BR"
                    value={formValues.patientBirthDate}
                    onChange={setField("patientBirthDate")}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Dentista responsável
                  </label>
                  <input
                    type="text"
                    value={formValues.dentistName}
                    onChange={setField("dentistName")}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    CRO
                  </label>
                  <input
                    type="text"
                    value={formValues.cro}
                    onChange={setField("cro")}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                    placeholder="UF-00000"
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Anamnese
                  </label>
                  <textarea
                    rows={3}
                    value={formValues.anamnesis}
                    onChange={setField("anamnesis")}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Achados clínicos
                  </label>
                  <textarea
                    rows={3}
                    value={formValues.clinicalFindings}
                    onChange={setField("clinicalFindings")}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Achados radiográficos
                  </label>
                  <textarea
                    rows={3}
                    value={formValues.radiographicFindings}
                    onChange={setField("radiographicFindings")}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Hipótese diagnóstica
                  </label>
                  <textarea
                    rows={3}
                    value={formValues.diagnosticHypothesis}
                    onChange={setField("diagnosticHypothesis")}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
                    placeholder="Obrigatório"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Plano de tratamento
                  </label>
                  <textarea
                    rows={3}
                    value={formValues.treatmentPlan}
                    onChange={setField("treatmentPlan")}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Prescrições
                  </label>
                  <textarea
                    rows={3}
                    value={formValues.prescriptions}
                    onChange={setField("prescriptions")}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Recomendações
                  </label>
                  <textarea
                    rows={3}
                    value={formValues.recommendations}
                    onChange={setField("recommendations")}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Observações adicionais
                  </label>
                  <textarea
                    rows={2}
                    value={formValues.additionalNotes}
                    onChange={setField("additionalNotes")}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Assinatura digital do dentista
                  </h2>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Limpar assinatura
                  </button>
                </div>
                <canvas
                  ref={canvasRef}
                  className="h-44 w-full rounded-lg border border-dashed border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                {!hasSignature && signatureTouched && (
                  <p className="mt-2 text-xs text-error-600 dark:text-error-300">
                    Assinatura obrigatória para emitir o documento.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
                >
                  {isSaving ? "Salvando laudo..." : "Salvar laudo assinado"}
                </button>
                <button
                  type="button"
                  onClick={handleNewReport}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Novo laudo
                </button>
              </div>
            </form>

            <aside className="space-y-4 lg:col-span-4">
              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Pré-visualização do documento
                </h2>
                <div className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <p>
                    <span className="font-medium">Data:</span>{" "}
                    {reportPreviewDate || "-"}
                  </p>
                  <p>
                    <span className="font-medium">Paciente:</span>{" "}
                    {formValues.patientName || "-"}
                  </p>
                  <p>
                    <span className="font-medium">Dentista:</span>{" "}
                    {formValues.dentistName || "-"}
                  </p>
                  <p>
                    <span className="font-medium">CRO:</span> {formValues.cro || "-"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Status da assinatura
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {hasSignature
                    ? "Assinatura registrada e pronta para envio."
                    : "Assinatura pendente."}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Registro do backend
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Endpoint: <span className="font-mono text-xs">{REPORTS_API_URL}</span>
                </p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  ID do laudo: {createdReportId || "Ainda não salvo"}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
};

export default DentalReports;
