import { ChangeEvent, FormEvent, KeyboardEvent, useMemo, useRef, useState } from "react";
import PageMeta from "../components/common/PageMeta";

type ChatMessage = {
  id: string;
  sender: "assistant" | "user";
  text: string;
  createdAt: string;
  imageUrl?: string;
  annotatedImageUrl?: string;
  diagnosis?: string;
};

type ChatApiResponse = {
  message?: string;
  answer?: string;
  response?: string;
  diagnosis?: string;
  annotatedImageUrl?: string;
  circledImageUrl?: string;
  imageUrl?: string;
};

const resolveChatApiUrl = () => {
  const explicitUrl = import.meta.env.VITE_DENTAL_CHAT_API_URL as string | undefined;
  if (explicitUrl) return explicitUrl.replace(/\/$/, "");

  const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
  if (!rawApiUrl) return "/ai/dental-chat";

  try {
    const parsed = new URL(rawApiUrl);
    return `${parsed.origin}/ai/dental-chat`;
  } catch {
    return `${rawApiUrl.replace(/\/$/, "").replace(/\/auth\/register$/, "")}/ai/dental-chat`;
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

const DentalAssistantChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-assistant-message",
      sender: "assistant",
      text: "Envie uma foto de medicamento ou raio-x e descreva seu caso. Vou retornar uma análise inicial com a imagem anotada e possível diagnóstico.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasPendingInput = useMemo(() => {
    return Boolean(inputText.trim() || selectedFile);
  }, [inputText, selectedFile]);

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

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const nextPreview = URL.createObjectURL(file);
    setApiError(null);
    setSelectedFile(file);
    setPreviewUrl(nextPreview);
  };

  const buildAssistantMessage = (
    responsePayload: ChatApiResponse
  ): Pick<ChatMessage, "text" | "diagnosis" | "annotatedImageUrl"> => {
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
    };
  };

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSending || !hasPendingInput) return;

    const userMessageId = `user-${Date.now()}`;
    const currentTime = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: userMessageId,
      sender: "user",
      text: inputText.trim() || "Imagem enviada para análise.",
      createdAt: currentTime,
      imageUrl: previewUrl || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setApiError(null);
    setIsSending(true);

    const body = new FormData();
    body.append("message", inputText.trim());
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
      const assistantPayload = buildAssistantMessage(payload);

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          sender: "assistant",
          text: assistantPayload.text,
          createdAt: new Date().toISOString(),
          diagnosis: assistantPayload.diagnosis,
          annotatedImageUrl: assistantPayload.annotatedImageUrl,
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
        const form = event.currentTarget.form;
        form?.requestSubmit();
      }
    }
  };

  return (
    <>
      <PageMeta
        title="Chat Dentista | Admin"
        description="Assistente para análise de imagens odontológicas."
      />
      <section className="mx-auto w-full max-w-6xl">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Chat Dentista
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Fluxo para enviar raio-x e fotos de medicamentos e receber análise inicial.
            </p>
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
                        : "border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>

                    {message.imageUrl && (
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

                    {message.annotatedImageUrl && (
                      <div className="mt-3">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Imagem anotada
                        </p>
                        <img
                          src={message.annotatedImageUrl}
                          alt="Imagem anotada com destaque"
                          className="max-h-80 w-auto rounded-lg border border-gray-200 object-contain dark:border-gray-700"
                        />
                      </div>
                    )}

                    {message.diagnosis && (
                      <div className="mt-3 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-800 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-300">
                        <span className="font-medium">Possível diagnóstico:</span>{" "}
                        {message.diagnosis}
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
                        Imagem pronta para envio
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
                  placeholder="Escreva a observação clínica ou contexto do caso..."
                  className="dark:bg-dark-900 min-h-[44px] flex-1 resize-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
                <button
                  type="submit"
                  disabled={!hasPendingInput || isSending}
                  className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
                >
                  {isSending ? "Enviando..." : "Enviar"}
                </button>
              </form>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Enter envia mensagem. Shift + Enter cria nova linha.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default DentalAssistantChat;
