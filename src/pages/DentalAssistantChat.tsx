import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PageMeta from "../components/common/PageMeta";

type DetectionRegion = {
  id?: string;
  label?: string;
  severity?: "baixa" | "media" | "alta";
  confidence?: number;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  circle?: {
    cx: number;
    cy: number;
    r: number;
  };
  note?: string;
};

type ClinicalReport = {
  summary?: string;
  possibleDiagnosis?: string;
  urgency?: string;
  confidence?: string;
  recommendations?: string[];
  disclaimer?: string;
};

type ChatMessage = {
  id: string;
  sender: "assistant" | "user";
  text: string;
  createdAt: string;
  imageUrl?: string;
  analysisImageUrl?: string;
  annotatedImageUrl?: string;
  diagnosis?: string;
  findings?: DetectionRegion[];
  report?: ClinicalReport;
};

type ChatApiResponse = {
  message?: string;
  answer?: string;
  response?: string;
  diagnosis?: string;
  annotatedImageUrl?: string;
  circledImageUrl?: string;
  imageUrl?: string;
  analysisImageUrl?: string;
  findings?: DetectionRegion[];
  regions?: DetectionRegion[];
  report?: ClinicalReport;
  clinicalReport?: ClinicalReport;
  relatorio?: ClinicalReport;
};

const resolveChatApiUrl = () => {
  const explicitUrl = import.meta.env.VITE_DENTAL_CHAT_API_URL as
    | string
    | undefined;
  if (explicitUrl) return explicitUrl.replace(/\/$/, "");

  const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
  if (!rawApiUrl) return "/ai/dental-chat";

  try {
    const parsed = new URL(rawApiUrl);
    return `${parsed.origin}/ai/dental-chat`;
  } catch {
    return `${rawApiUrl
      .replace(/\/$/, "")
      .replace(/\/auth\/register$/, "")}/ai/dental-chat`;
  }
};

const CHAT_API_URL = resolveChatApiUrl();

const formatDateTime = (dateIso: string) =>
  new Date(dateIso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toPercent = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  if (value <= 1) return clamp(value * 100, 0, 100);
  if (value <= 100) return clamp(value, 0, 100);
  return clamp(value, 0, 100);
};

const normalizeFindings = (rawFindings?: DetectionRegion[]) => {
  if (!Array.isArray(rawFindings)) return [];

  return rawFindings
    .map((item, index) => ({
      id: item.id || `region-${index + 1}`,
      label: item.label || `Achado ${index + 1}`,
      severity: item.severity,
      confidence: item.confidence,
      bbox: item.bbox,
      circle: item.circle,
      note: item.note,
    }))
    .slice(0, 10);
};

const normalizeReport = (payload: ChatApiResponse): ClinicalReport | undefined => {
  const report = payload.report || payload.clinicalReport || payload.relatorio;
  if (!report) return undefined;

  const recommendations = Array.isArray(report.recommendations)
    ? report.recommendations.filter(Boolean)
    : [];

  return {
    summary: report.summary,
    possibleDiagnosis: report.possibleDiagnosis,
    urgency: report.urgency,
    confidence: report.confidence,
    recommendations,
    disclaimer:
      report.disclaimer ||
      "Análise gerada por IA para apoio clínico. Confirmar com avaliação presencial e exames complementares.",
  };
};

const buildAssistantMessage = (
  responsePayload: ChatApiResponse,
  fallbackImageUrl?: string
): Pick<
  ChatMessage,
  | "text"
  | "diagnosis"
  | "annotatedImageUrl"
  | "analysisImageUrl"
  | "findings"
  | "report"
> => {
  const text =
    responsePayload.answer ||
    responsePayload.message ||
    responsePayload.response ||
    "Não recebi uma resposta detalhada do backend.";

  return {
    text,
    diagnosis: responsePayload.diagnosis,
    annotatedImageUrl:
      responsePayload.annotatedImageUrl || responsePayload.circledImageUrl,
    analysisImageUrl:
      responsePayload.analysisImageUrl ||
      responsePayload.imageUrl ||
      fallbackImageUrl,
    findings: normalizeFindings(responsePayload.findings || responsePayload.regions),
    report: normalizeReport(responsePayload),
  };
};

const DiagnosticImagePanel = ({
  imageUrl,
  annotatedImageUrl,
  findings,
}: {
  imageUrl?: string;
  annotatedImageUrl?: string;
  findings?: DetectionRegion[];
}) => {
  if (!imageUrl && !annotatedImageUrl) return null;

  return (
    <div className="mt-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Área suspeita destacada
      </p>
      {annotatedImageUrl ? (
        <img
          src={annotatedImageUrl}
          alt="Imagem com região suspeita destacada"
          className="max-h-96 w-auto rounded-lg border border-gray-200 object-contain dark:border-gray-700"
        />
      ) : (
        <div className="relative inline-block overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <img
            src={imageUrl}
            alt="Imagem para análise odontológica"
            className="max-h-96 w-auto object-contain"
          />
          {findings?.map((finding, index) => {
            const circle = finding.circle;
            const bbox = finding.bbox;

            const centerX = circle
              ? toPercent(circle.cx)
              : bbox
              ? toPercent(bbox.x + bbox.width / 2)
              : 50;
            const centerY = circle
              ? toPercent(circle.cy)
              : bbox
              ? toPercent(bbox.y + bbox.height / 2)
              : 50;
            const radius = circle
              ? toPercent(circle.r)
              : bbox
              ? Math.max(toPercent(bbox.width), toPercent(bbox.height)) * 0.65
              : 8;
            const size = clamp(radius * 2, 8, 95);

            return (
              <div
                key={finding.id || `finding-${index + 1}`}
                className="pointer-events-none absolute rounded-full border-[3px] border-error-500 shadow-lg"
                style={{
                  left: `${centerX}%`,
                  top: `${centerY}%`,
                  width: `${size}%`,
                  height: `${size}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-error-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {finding.label || `Achado ${index + 1}`}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {findings && findings.length > 0 && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300">
          {findings.map((finding, index) => (
            <p key={finding.id || index} className="mb-1 last:mb-0">
              <span className="font-semibold">{finding.label || "Achado"}:</span>{" "}
              {finding.note || "Área com alteração visual identificada."}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

const DentalAssistantChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-assistant-message",
      sender: "assistant",
      text: "Envie o raio-x ou foto clínica com uma breve observação. A IA retorna o possível diagnóstico, marca a área suspeita e gera um relatório técnico para apoio ao laudo.",
      createdAt: new Date().toISOString(),
      report: {
        disclaimer:
          "Resultado assistivo por IA. Sempre validar com exame clínico e avaliação profissional presencial.",
      },
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasPendingInput = useMemo(
    () => Boolean(inputText.trim() || selectedFile),
    [inputText, selectedFile]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const clearSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setApiError("Selecione um arquivo de imagem válido.");
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      setApiError("A imagem deve ter no máximo 12MB.");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const nextPreview = URL.createObjectURL(file);
    setApiError(null);
    setSelectedFile(file);
    setPreviewUrl(nextPreview);
  };

  const downloadReport = (message: ChatMessage) => {
    const createdAt = formatDateTime(message.createdAt);
    const lines: string[] = [
      "RELATORIO CLINICO - ASSISTENTE IA ODONTOLOGICO",
      `Data: ${createdAt}`,
      "",
      `Resumo: ${message.report?.summary || message.text}`,
      `Possivel diagnostico: ${message.report?.possibleDiagnosis || message.diagnosis || "Nao informado"}`,
      `Urgencia: ${message.report?.urgency || "Nao informado"}`,
      `Confianca estimada: ${message.report?.confidence || "Nao informado"}`,
      "",
      "Achados:",
    ];

    if (message.findings?.length) {
      message.findings.forEach((finding, index) => {
        lines.push(
          `${index + 1}. ${finding.label || "Achado"} - ${finding.note || "Alteracao visual identificada."}`
        );
      });
    } else {
      lines.push("Nenhum achado estrutural retornado.");
    }

    lines.push("");
    lines.push("Recomendacoes:");
    if (message.report?.recommendations?.length) {
      message.report.recommendations.forEach((item, index) => {
        lines.push(`${index + 1}. ${item}`);
      });
    } else {
      lines.push("1. Correlacionar com exame clinico completo.");
    }

    lines.push("");
    lines.push(
      `Aviso: ${message.report?.disclaimer || "Este documento e apenas apoio a decisao clinica e nao substitui avaliacao profissional presencial."}`
    );

    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-ia-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSending || !hasPendingInput) return;

    const currentTime = new Date().toISOString();
    const trimmedText = inputText.trim();
    const userImageDataUrl = selectedFile
      ? await readFileAsDataUrl(selectedFile).catch(() => "")
      : "";

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: trimmedText || "Imagem enviada para análise.",
      createdAt: currentTime,
      imageUrl: userImageDataUrl || previewUrl || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setApiError(null);
    setIsSending(true);

    const body = new FormData();
    body.append("message", trimmedText);
    body.append("locale", "pt-BR");
    body.append("includeAnnotatedImage", "true");
    body.append("includeRegions", "true");
    body.append("includeReport", "true");
    if (selectedFile) {
      body.append("image", selectedFile);
    }

    setInputText("");
    clearSelectedFile();

    try {
      const response = await fetch(CHAT_API_URL, {
        method: "POST",
        body,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload?.message || "Não foi possível obter resposta do assistente.";
        throw new Error(message);
      }

      const payload = (await response.json().catch(() => ({}))) as ChatApiResponse;
      const assistantPayload = buildAssistantMessage(
        payload,
        userMessage.imageUrl || undefined
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          sender: "assistant",
          text: assistantPayload.text,
          createdAt: new Date().toISOString(),
          diagnosis: assistantPayload.diagnosis,
          annotatedImageUrl: assistantPayload.annotatedImageUrl,
          analysisImageUrl: assistantPayload.analysisImageUrl,
          findings: assistantPayload.findings,
          report: assistantPayload.report,
        },
      ]);
    } catch (error) {
      console.error("Dental chat request failed:", error);
      const message =
        error instanceof Error ? error.message : "Erro ao conectar com backend.";
      setApiError(message);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          sender: "assistant",
          text: "Não consegui processar esta solicitação agora. Tente novamente em instantes.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (hasPendingInput && !isSending) {
        event.currentTarget.form?.requestSubmit();
      }
    }
  };

  return (
    <>
      <PageMeta
        title="Assistente IA Odontológico | OdontoPro"
        description="Análise de raio-x/fotos com marcação de achados e relatório clínico."
      />
      <section className="clinic-page mx-auto w-full max-w-6xl">
        <div className="clinic-hero bg-linear-to-r from-slate-800 via-cyan-800 to-brand-900 text-white">
          <div className="absolute -left-14 top-2 h-48 w-48 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-cyan-300/20 blur-2xl"></div>
          <div className="relative z-10 grid gap-5 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/90">
                Diagnóstico Assistido por IA
              </span>
              <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
                Assistente IA Odontológico
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-white/90 sm:text-base">
                Análise de raio-x e fotos clínicas com marcação de áreas
                suspeitas, hipótese diagnóstica e relatório técnico.
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm lg:col-span-4">
              <p className="text-xs uppercase tracking-wide text-white/80">
                Conversas na sessão
              </p>
              <p className="mt-2 text-3xl font-semibold">{messages.length}</p>
              <p className="text-xs text-white/85">
                histórico local desta avaliação
              </p>
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_14px_35px_-22px_rgba(7,45,47,0.45)] dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Sala de análise clínica
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Envie imagens clínicas para receber análise, área suspeita
              destacada e relatório para apoio ao laudo.
            </p>
            <div className="mt-3 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-900 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-200">
              <span className="font-semibold">Aviso importante:</span> este
              assistente usa IA apenas para apoio clínico. As respostas não
              substituem avaliação odontológica presencial, exames
              complementares e decisão profissional do dentista responsável.
            </div>
          </div>

          <div className="flex h-[calc(100vh-210px)] min-h-[620px] flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50/60 px-4 py-5 dark:bg-gray-900/40 sm:px-6">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`flex ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`w-full max-w-3xl rounded-2xl border px-4 py-3 shadow-theme-xs ${
                      message.sender === "user"
                        ? "border-brand-200 bg-brand-50 text-gray-900 dark:border-brand-800/40 dark:bg-brand-500/10 dark:text-white"
                        : "border-gray-200 bg-white/95 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{message.text}</p>

                    {message.imageUrl && message.sender === "user" && (
                      <div className="mt-3">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Imagem enviada
                        </p>
                        <img
                          src={message.imageUrl}
                          alt="Imagem enviada para análise"
                          className="max-h-64 w-auto rounded-lg border border-gray-200 object-contain dark:border-gray-700"
                        />
                      </div>
                    )}

                    {message.sender === "assistant" && (
                      <DiagnosticImagePanel
                        imageUrl={message.analysisImageUrl}
                        annotatedImageUrl={message.annotatedImageUrl}
                        findings={message.findings}
                      />
                    )}

                    {message.diagnosis && (
                      <div className="mt-3 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-800 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-300">
                        <span className="font-medium">Possível diagnóstico:</span>{" "}
                        {message.diagnosis}
                      </div>
                    )}

                    {message.report && (
                      <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50/70 px-3 py-3 dark:border-brand-700/40 dark:bg-brand-500/10">
                        <h2 className="text-sm font-semibold text-brand-900 dark:text-brand-200">
                          Relatório clínico preliminar
                        </h2>
                        {message.report.summary && (
                          <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                            <span className="font-medium">Resumo:</span>{" "}
                            {message.report.summary}
                          </p>
                        )}
                        {message.report.possibleDiagnosis && (
                          <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                            <span className="font-medium">Hipótese:</span>{" "}
                            {message.report.possibleDiagnosis}
                          </p>
                        )}
                        {(message.report.urgency || message.report.confidence) && (
                          <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                            {message.report.urgency && (
                              <>
                                <span className="font-medium">Urgência:</span>{" "}
                                {message.report.urgency}
                              </>
                            )}{" "}
                            {message.report.confidence && (
                              <>
                                <span className="font-medium">Confiabilidade:</span>{" "}
                                {message.report.confidence}
                              </>
                            )}
                          </p>
                        )}
                        {message.report.recommendations &&
                          message.report.recommendations.length > 0 && (
                            <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                              <p className="font-medium">Recomendações:</p>
                              {message.report.recommendations.map((item, index) => (
                                <p key={`${message.id}-rec-${index + 1}`}>
                                  {index + 1}. {item}
                                </p>
                              ))}
                            </div>
                          )}
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {message.report.disclaimer}
                        </p>
                        <button
                          type="button"
                          onClick={() => downloadReport(message)}
                          className="mt-3 rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 dark:border-brand-600 dark:text-brand-300 dark:hover:bg-brand-500/20"
                        >
                          Baixar relatório (.txt)
                        </button>
                      </div>
                    )}

                    <div className="mt-3 text-right text-xs text-gray-500 dark:text-gray-400">
                      {formatDateTime(message.createdAt)}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60 sm:p-5">
              {apiError && (
                <div className="mb-3 rounded-lg border border-error-200 bg-error-50 px-4 py-2 text-sm text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
                  {apiError}
                </div>
              )}

              {previewUrl && (
                <div className="mb-3 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center gap-3">
                    <img
                      src={previewUrl}
                      alt="Pré-visualização"
                      className="h-14 w-14 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {selectedFile?.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Imagem pronta para análise IA
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelectedFile}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Remover
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Anexar imagem
                </button>
                <textarea
                  rows={2}
                  value={inputText}
                  onKeyDown={handleTextareaKeyDown}
                  onChange={(event) => setInputText(event.target.value)}
                  placeholder="Ex.: dor no 36, suspeita de cárie proximal; paciente relata sensibilidade ao frio."
                  className="clinic-input dark:bg-dark-900 min-h-[44px] flex-1 resize-none px-4 py-2.5 text-gray-800 shadow-theme-xs placeholder:text-gray-400 dark:text-white/90 dark:placeholder:text-white/30"
                />
                <button
                  type="submit"
                  disabled={!hasPendingInput || isSending}
                  className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
                >
                  {isSending ? "Analisando..." : "Analisar"}
                </button>
              </form>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Enter envia. Shift + Enter quebra linha. A IA retorna análise
                preliminar para apoio clínico.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default DentalAssistantChat;
