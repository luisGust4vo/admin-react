import { useEffect, useMemo, useState } from "react";
import PageMeta from "../components/common/PageMeta";

type ReminderChannel = "whatsapp" | "sms" | "email";
type TemplateType = "reminder" | "reactivation" | "waitlist_call";
type AppointmentStatus =
  | "confirmed"
  | "pending_confirmation"
  | "canceled"
  | "done";
type ReactivationPriority = "high" | "medium" | "low";

type Appointment = {
  id: string;
  patientName: string;
  patientPhone: string;
  datetime: string;
  procedure: string;
  professional: string;
  status: AppointmentStatus;
  reminderChannel: ReminderChannel;
};

type ReactivationPatient = {
  id: string;
  patientName: string;
  phone: string;
  lastVisit: string;
  suggestedReturnInDays: number;
  priority: ReactivationPriority;
  notes?: string;
};

type WaitlistPatient = {
  id: string;
  patientName: string;
  phone: string;
  preferredPeriod: "morning" | "afternoon" | "any";
  treatment: string;
  urgency: "high" | "normal";
};

type ActivityLog = {
  id: string;
  action: string;
  target: string;
  channel?: ReminderChannel;
  createdAt: string;
};

type DashboardPayload = {
  appointments?: Appointment[];
  reactivation?: ReactivationPatient[];
  waitlist?: WaitlistPatient[];
};

type TemplatesPayload = {
  templates?: Partial<Record<ReminderChannel, Partial<Record<TemplateType, string>>>>;
};

type TemplateMap = Record<ReminderChannel, Record<TemplateType, string>>;

type AutomationSettings = {
  reminderHoursBefore: number;
  secondReminderEnabled: boolean;
  secondReminderHoursBefore: number;
  quietHoursStart: string;
  quietHoursEnd: string;
};

const resolveRetentionApiUrl = () => {
  const explicitUrl = import.meta.env.VITE_RETENTION_API_URL as
    | string
    | undefined;
  if (explicitUrl) return explicitUrl.replace(/\/$/, "");

  const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
  if (!rawApiUrl) return "/clinic/retention";

  try {
    const parsed = new URL(rawApiUrl);
    return `${parsed.origin}/clinic/retention`;
  } catch {
    return `${rawApiUrl.replace(/\/$/, "").replace(/\/auth\/register$/, "")}/clinic/retention`;
  }
};

const RETENTION_API_URL = resolveRetentionApiUrl();

const defaultTemplates: TemplateMap = {
  whatsapp: {
    reminder:
      "Olá, {patientName}. Lembrete da sua consulta na {clinicName} em {date} às {time} com {professional} para {procedure}. Responda 1 para confirmar.",
    reactivation:
      "Olá, {patientName}. Sentimos sua falta na {clinicName}. Sua última consulta foi em {lastVisit}. Podemos agendar sua revisão?",
    waitlist_call:
      "Olá, {patientName}. Abriu um encaixe para {procedure} na {clinicName}. Temos horário em breve. Quer confirmar?",
  },
  sms: {
    reminder:
      "{patientName}, lembrete: consulta {date} {time} na {clinicName}. Responda SIM para confirmar.",
    reactivation:
      "{patientName}, está na hora da revisão odontológica. Última visita: {lastVisit}. Fale com a {clinicName}.",
    waitlist_call:
      "{patientName}, surgiu encaixe para {procedure}. Deseja confirmar com a {clinicName}?",
  },
  email: {
    reminder:
      "Prezado(a) {patientName}, confirmamos seu atendimento em {date} às {time} com {professional}, procedimento: {procedure}.",
    reactivation:
      "Olá, {patientName}. Notamos que sua última visita foi em {lastVisit}. Recomendamos retorno preventivo na {clinicName}.",
    waitlist_call:
      "Olá, {patientName}. Temos encaixe para {procedure}. Caso tenha interesse, confirme seu horário com a {clinicName}.",
  },
};

const sampleAppointments: Appointment[] = [
  {
    id: "a1",
    patientName: "Carla Mendes",
    patientPhone: "(11) 98888-1111",
    datetime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    procedure: "Limpeza e profilaxia",
    professional: "Dra. Juliana",
    status: "pending_confirmation",
    reminderChannel: "whatsapp",
  },
  {
    id: "a2",
    patientName: "Guilherme Rocha",
    patientPhone: "(11) 97777-2222",
    datetime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    procedure: "Avaliação ortodôntica",
    professional: "Dr. Marcelo",
    status: "confirmed",
    reminderChannel: "sms",
  },
  {
    id: "a3",
    patientName: "Fernanda Lima",
    patientPhone: "(11) 96666-3333",
    datetime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
    procedure: "Restauração",
    professional: "Dra. Juliana",
    status: "pending_confirmation",
    reminderChannel: "email",
  },
];

const sampleReactivation: ReactivationPatient[] = [
  {
    id: "r1",
    patientName: "Otávio Santos",
    phone: "(11) 95555-4444",
    lastVisit: new Date(Date.now() - 210 * 24 * 60 * 60 * 1000).toISOString(),
    suggestedReturnInDays: 180,
    priority: "high",
    notes: "Último procedimento de canal. Sugestão de revisão.",
  },
  {
    id: "r2",
    patientName: "Helena Costa",
    phone: "(11) 94444-5555",
    lastVisit: new Date(Date.now() - 130 * 24 * 60 * 60 * 1000).toISOString(),
    suggestedReturnInDays: 120,
    priority: "medium",
    notes: "Profilaxia periódica.",
  },
];

const sampleWaitlist: WaitlistPatient[] = [
  {
    id: "w1",
    patientName: "Lucas Andrade",
    phone: "(11) 93333-6666",
    preferredPeriod: "afternoon",
    treatment: "Extração de siso",
    urgency: "high",
  },
  {
    id: "w2",
    patientName: "Beatriz Mota",
    phone: "(11) 92222-7777",
    preferredPeriod: "morning",
    treatment: "Ajuste ortodôntico",
    urgency: "normal",
  },
];

const defaultSettings: AutomationSettings = {
  reminderHoursBefore: 24,
  secondReminderEnabled: true,
  secondReminderHoursBefore: 2,
  quietHoursStart: "21:00",
  quietHoursEnd: "08:00",
};

const statusLabel: Record<AppointmentStatus, string> = {
  confirmed: "Confirmado",
  pending_confirmation: "Aguardando confirmação",
  canceled: "Cancelado",
  done: "Concluído",
};

const priorityLabel: Record<ReactivationPriority, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const channelLabel: Record<ReminderChannel, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "E-mail",
};

const templateLabel: Record<TemplateType, string> = {
  reminder: "Lembrete de consulta",
  reactivation: "Reativação de inativos",
  waitlist_call: "Chamada de encaixe",
};

const periodLabel: Record<WaitlistPatient["preferredPeriod"], string> = {
  morning: "Manhã",
  afternoon: "Tarde",
  any: "Qualquer horário",
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const mergeTemplates = (
  incoming?: Partial<Record<ReminderChannel, Partial<Record<TemplateType, string>>>>
): TemplateMap => {
  if (!incoming) return defaultTemplates;

  return {
    whatsapp: {
      reminder: incoming.whatsapp?.reminder || defaultTemplates.whatsapp.reminder,
      reactivation:
        incoming.whatsapp?.reactivation || defaultTemplates.whatsapp.reactivation,
      waitlist_call:
        incoming.whatsapp?.waitlist_call || defaultTemplates.whatsapp.waitlist_call,
    },
    sms: {
      reminder: incoming.sms?.reminder || defaultTemplates.sms.reminder,
      reactivation: incoming.sms?.reactivation || defaultTemplates.sms.reactivation,
      waitlist_call:
        incoming.sms?.waitlist_call || defaultTemplates.sms.waitlist_call,
    },
    email: {
      reminder: incoming.email?.reminder || defaultTemplates.email.reminder,
      reactivation:
        incoming.email?.reactivation || defaultTemplates.email.reactivation,
      waitlist_call:
        incoming.email?.waitlist_call || defaultTemplates.email.waitlist_call,
    },
  };
};

const applyVariables = (template: string, variables: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => variables[key] || "");

const RetentionCenter: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reactivationPatients, setReactivationPatients] = useState<
    ReactivationPatient[]
  >([]);
  const [waitlist, setWaitlist] = useState<WaitlistPatient[]>([]);
  const [templates, setTemplates] = useState<TemplateMap>(defaultTemplates);
  const [settings, setSettings] = useState<AutomationSettings>(defaultSettings);
  const [clinicName, setClinicName] = useState("Clínica Sorriso");
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const [selectedTemplateChannel, setSelectedTemplateChannel] =
    useState<ReminderChannel>("whatsapp");
  const [selectedTemplateType, setSelectedTemplateType] =
    useState<TemplateType>("reminder");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");
  const [selectedReactivationId, setSelectedReactivationId] = useState("");
  const [selectedWaitlistId, setSelectedWaitlistId] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [dashboardResponse, templateResponse, settingsResponse] =
          await Promise.all([
            fetch(`${RETENTION_API_URL}/dashboard`, {
              method: "GET",
              headers: { Accept: "application/json" },
            }),
            fetch(`${RETENTION_API_URL}/templates`, {
              method: "GET",
              headers: { Accept: "application/json" },
            }),
            fetch(`${RETENTION_API_URL}/settings`, {
              method: "GET",
              headers: { Accept: "application/json" },
            }),
          ]);

        const dashboardPayload = dashboardResponse.ok
          ? ((await dashboardResponse
              .json()
              .catch(() => ({}))) as DashboardPayload)
          : {};
        const templatesPayload = templateResponse.ok
          ? ((await templateResponse
              .json()
              .catch(() => ({}))) as TemplatesPayload)
          : {};
        const settingsPayload = settingsResponse.ok
          ? ((await settingsResponse
              .json()
              .catch(() => ({}))) as Partial<AutomationSettings>)
          : {};

        if (!cancelled) {
          const nextAppointments = dashboardPayload.appointments?.length
            ? dashboardPayload.appointments
            : sampleAppointments;
          const nextReactivation = dashboardPayload.reactivation?.length
            ? dashboardPayload.reactivation
            : sampleReactivation;
          const nextWaitlist = dashboardPayload.waitlist?.length
            ? dashboardPayload.waitlist
            : sampleWaitlist;

          setAppointments(nextAppointments);
          setReactivationPatients(nextReactivation);
          setWaitlist(nextWaitlist);
          setTemplates(mergeTemplates(templatesPayload.templates));
          setSettings((prev) => ({ ...prev, ...settingsPayload }));

          setSelectedAppointmentId(nextAppointments[0]?.id || "");
          setSelectedReactivationId(nextReactivation[0]?.id || "");
          setSelectedWaitlistId(nextWaitlist[0]?.id || "");
        }
      } catch (error) {
        console.error("Retention center load failed:", error);
        if (!cancelled) {
          setErrorMessage(
            "Não foi possível carregar do backend. Exibindo dados de exemplo."
          );
          setAppointments(sampleAppointments);
          setReactivationPatients(sampleReactivation);
          setWaitlist(sampleWaitlist);
          setTemplates(defaultTemplates);
          setSelectedAppointmentId(sampleAppointments[0]?.id || "");
          setSelectedReactivationId(sampleReactivation[0]?.id || "");
          setSelectedWaitlistId(sampleWaitlist[0]?.id || "");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedAppointment = useMemo(
    () => appointments.find((item) => item.id === selectedAppointmentId) || null,
    [appointments, selectedAppointmentId]
  );
  const selectedReactivationPatient = useMemo(
    () =>
      reactivationPatients.find((item) => item.id === selectedReactivationId) ||
      null,
    [reactivationPatients, selectedReactivationId]
  );
  const selectedWaitlistPatient = useMemo(
    () => waitlist.find((item) => item.id === selectedWaitlistId) || null,
    [waitlist, selectedWaitlistId]
  );

  const confirmedCount = useMemo(
    () => appointments.filter((item) => item.status === "confirmed").length,
    [appointments]
  );
  const pendingCount = useMemo(
    () => appointments.filter((item) => item.status === "pending_confirmation").length,
    [appointments]
  );
  const canceledCount = useMemo(
    () => appointments.filter((item) => item.status === "canceled").length,
    [appointments]
  );
  const occupancyRate = useMemo(() => {
    const base = confirmedCount + pendingCount + canceledCount;
    if (!base) return 0;
    return (confirmedCount / base) * 100;
  }, [confirmedCount, pendingCount, canceledCount]);

  const templateVariables = useMemo(() => {
    const appointment = selectedAppointment || appointments[0];
    const reactivation = selectedReactivationPatient || reactivationPatients[0];
    const wait = selectedWaitlistPatient || waitlist[0];

    return {
      patientName:
        appointment?.patientName ||
        reactivation?.patientName ||
        wait?.patientName ||
        "Paciente",
      date: appointment ? formatDate(appointment.datetime) : formatDate(new Date().toISOString()),
      time: appointment
        ? new Date(appointment.datetime).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "09:00",
      procedure: appointment?.procedure || wait?.treatment || "Avaliação clínica",
      professional: appointment?.professional || "Equipe clínica",
      clinicName,
      lastVisit: reactivation ? formatDate(reactivation.lastVisit) : formatDate(new Date().toISOString()),
    };
  }, [
    selectedAppointment,
    appointments,
    selectedReactivationPatient,
    reactivationPatients,
    selectedWaitlistPatient,
    waitlist,
    clinicName,
  ]);

  const previewMessage = useMemo(() => {
    const template = templates[selectedTemplateChannel][selectedTemplateType];
    return applyVariables(template, templateVariables);
  }, [templates, selectedTemplateChannel, selectedTemplateType, templateVariables]);

  const pushLog = (action: string, target: string, channel?: ReminderChannel) => {
    setActivityLogs((prev) => [
      {
        id: `log-${Date.now()}-${Math.random()}`,
        action,
        target,
        channel,
        createdAt: new Date().toISOString(),
      },
      ...prev.slice(0, 7),
    ]);
  };

  const saveTemplates = async () => {
    setIsSavingTemplate(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${RETENTION_API_URL}/templates`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ templates }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Falha ao salvar templates.");
      }

      setSuccessMessage("Templates salvos com sucesso.");
    } catch (error) {
      console.error("Save templates failed:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Erro ao salvar templates."
      );
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const saveSettings = async () => {
    setIsSavingSettings(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${RETENTION_API_URL}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Falha ao salvar automações.");
      }

      setSuccessMessage("Configurações de automação atualizadas.");
    } catch (error) {
      console.error("Save settings failed:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Erro ao salvar automações."
      );
    } finally {
      setIsSavingSettings(false);
    }
  };

  const sendReminder = async (appointment: Appointment) => {
    const channel = appointment.reminderChannel;
    const template = templates[channel].reminder;
    const message = applyVariables(template, {
      ...templateVariables,
      patientName: appointment.patientName,
      date: formatDate(appointment.datetime),
      time: new Date(appointment.datetime).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      procedure: appointment.procedure,
      professional: appointment.professional,
    });

    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await fetch(`${RETENTION_API_URL}/appointments/${appointment.id}/reminder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel,
          message,
          templateType: "reminder",
        }),
      });
      setSuccessMessage(
        `Lembrete enviado para ${appointment.patientName} via ${channelLabel[channel]}.`
      );
      pushLog("Lembrete enviado", appointment.patientName, channel);
    } catch (error) {
      console.error("Reminder send failed:", error);
      setErrorMessage("Falha ao enviar lembrete no momento.");
    }
  };

  const confirmAppointment = async (appointment: Appointment) => {
    setAppointments((prev) =>
      prev.map((item) =>
        item.id === appointment.id ? { ...item, status: "confirmed" } : item
      )
    );

    try {
      await fetch(`${RETENTION_API_URL}/appointments/${appointment.id}/confirm`, {
        method: "POST",
      });
      setSuccessMessage(`Consulta de ${appointment.patientName} confirmada.`);
      pushLog("Consulta confirmada", appointment.patientName);
    } catch (error) {
      console.error("Confirm appointment failed:", error);
    }
  };

  const cancelAppointment = async (appointment: Appointment) => {
    setAppointments((prev) =>
      prev.map((item) =>
        item.id === appointment.id ? { ...item, status: "canceled" } : item
      )
    );

    try {
      await fetch(`${RETENTION_API_URL}/appointments/${appointment.id}/cancel`, {
        method: "POST",
      });
      setSuccessMessage(`Consulta de ${appointment.patientName} cancelada.`);
      pushLog("Consulta cancelada", appointment.patientName);
    } catch (error) {
      console.error("Cancel appointment failed:", error);
    }
  };

  const reactivatePatient = async (patient: ReactivationPatient) => {
    const channel: ReminderChannel = "whatsapp";
    const template = templates[channel].reactivation;
    const message = applyVariables(template, {
      ...templateVariables,
      patientName: patient.patientName,
      lastVisit: formatDate(patient.lastVisit),
    });

    setReactivationPatients((prev) =>
      prev.filter((item) => item.id !== patient.id)
    );

    try {
      await fetch(`${RETENTION_API_URL}/reactivation/${patient.id}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel,
          message,
          templateType: "reactivation",
        }),
      });
      setSuccessMessage(`Campanha enviada para ${patient.patientName}.`);
      pushLog("Campanha de reativação", patient.patientName, channel);
    } catch (error) {
      console.error("Reactivation send failed:", error);
    }
  };

  const fillGapWithWaitlist = async (waitlistPatient: WaitlistPatient) => {
    const channel: ReminderChannel = "whatsapp";
    const template = templates[channel].waitlist_call;
    const message = applyVariables(template, {
      ...templateVariables,
      patientName: waitlistPatient.patientName,
      procedure: waitlistPatient.treatment,
    });

    setWaitlist((prev) => prev.filter((item) => item.id !== waitlistPatient.id));

    const newAppointment: Appointment = {
      id: `wl-${Date.now()}`,
      patientName: waitlistPatient.patientName,
      patientPhone: waitlistPatient.phone,
      datetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      procedure: waitlistPatient.treatment,
      professional: "Equipe clínica",
      status: "pending_confirmation",
      reminderChannel: "whatsapp",
    };
    setAppointments((prev) => [newAppointment, ...prev]);

    try {
      await fetch(`${RETENTION_API_URL}/waitlist/${waitlistPatient.id}/call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel,
          message,
          templateType: "waitlist_call",
        }),
      });
      setSuccessMessage(
        `${waitlistPatient.patientName} foi acionado(a) para encaixe.`
      );
      pushLog("Chamada de encaixe", waitlistPatient.patientName, channel);
    } catch (error) {
      console.error("Waitlist call failed:", error);
    }
  };

  return (
    <>
      <PageMeta
        title="Central Anti-Faltas | Clínica"
        description="Confirmações, lembretes e reativação de pacientes."
      />

      <section className="space-y-6">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-linear-to-r from-blue-600 via-cyan-600 to-emerald-500 p-6 text-white shadow-theme-xl dark:border-gray-800">
          <div className="absolute -left-10 top-0 h-44 w-44 rounded-full bg-white/15 blur-2xl"></div>
          <div className="absolute -right-10 bottom-0 h-44 w-44 rounded-full bg-black/15 blur-2xl"></div>
          <div className="relative z-10">
            <h1 className="text-2xl font-semibold sm:text-3xl">
              Central Anti-Faltas e Reativação
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-white/90 sm:text-base">
              Confirme consultas, dispare lembretes inteligentes e recupere pacientes
              inativos em poucos cliques.
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
                Carregando dados...
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Confirmadas</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {confirmedCount}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Aguardando confirmação
            </p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {pendingCount}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Canceladas</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {canceledCount}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Taxa de ocupação
            </p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {occupancyRate.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-12">
          <div className="space-y-5 xl:col-span-8">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Agenda e confirmações
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[740px]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Paciente
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Data e hora
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Procedimento
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Status
                      </th>
                      <th className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appointment) => (
                      <tr
                        key={appointment.id}
                        className="border-b border-gray-100 text-sm dark:border-gray-800"
                      >
                        <td className="px-2 py-3">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {appointment.patientName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {appointment.patientPhone} - {appointment.professional}
                          </p>
                        </td>
                        <td className="px-2 py-3 text-gray-700 dark:text-gray-300">
                          {formatDateTime(appointment.datetime)}
                        </td>
                        <td className="px-2 py-3 text-gray-700 dark:text-gray-300">
                          {appointment.procedure}
                        </td>
                        <td className="px-2 py-3 text-gray-700 dark:text-gray-300">
                          {statusLabel[appointment.status]}
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => sendReminder(appointment)}
                              className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300"
                            >
                              Lembrete
                            </button>
                            {appointment.status !== "confirmed" && (
                              <button
                                type="button"
                                onClick={() => confirmAppointment(appointment)}
                                className="rounded-lg border border-success-200 bg-success-50 px-2.5 py-1 text-xs font-medium text-success-700 hover:bg-success-100 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300"
                              >
                                Confirmar
                              </button>
                            )}
                            {appointment.status !== "canceled" && (
                              <button
                                type="button"
                                onClick={() => cancelAppointment(appointment)}
                                className="rounded-lg border border-error-200 bg-error-50 px-2.5 py-1 text-xs font-medium text-error-700 hover:bg-error-100 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Reativação de pacientes
                </h2>
                <div className="mt-4 space-y-3">
                  {reactivationPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className="rounded-xl border border-gray-200 p-3 dark:border-gray-700"
                    >
                      <p className="font-medium text-gray-900 dark:text-white">
                        {patient.patientName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Última visita: {formatDateTime(patient.lastVisit)}
                      </p>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                        Prioridade: {priorityLabel[patient.priority]}
                      </p>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                        {patient.notes}
                      </p>
                      <button
                        type="button"
                        onClick={() => reactivatePatient(patient)}
                        className="mt-2 w-full rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-700 hover:bg-cyan-100 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-300"
                      >
                        Enviar campanha de retorno
                      </button>
                    </div>
                  ))}
                  {!reactivationPatients.length && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Nenhum paciente pendente de reativação.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Fila de encaixe
                </h2>
                <div className="mt-4 space-y-3">
                  {waitlist.map((patient) => (
                    <div
                      key={patient.id}
                      className="rounded-xl border border-gray-200 p-3 dark:border-gray-700"
                    >
                      <p className="font-medium text-gray-900 dark:text-white">
                        {patient.patientName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {patient.phone}
                      </p>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                        Tratamento: {patient.treatment}
                      </p>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                        Período: {periodLabel[patient.preferredPeriod]} - Urgência:{" "}
                        {patient.urgency === "high" ? "Alta" : "Normal"}
                      </p>
                      <button
                        type="button"
                        onClick={() => fillGapWithWaitlist(patient)}
                        className="mt-2 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
                      >
                        Chamar para encaixe
                      </button>
                    </div>
                  ))}
                  {!waitlist.length && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Fila de encaixe vazia.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5 xl:col-span-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Configurações automáticas
              </h2>
              <div className="mt-4 space-y-3 text-sm">
                <input
                  type="text"
                  value={clinicName}
                  onChange={(event) => setClinicName(event.target.value)}
                  placeholder="Nome da clínica"
                  className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 dark:border-gray-700"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    min={1}
                    value={settings.reminderHoursBefore}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        reminderHoursBefore: Number(event.target.value) || 1,
                      }))
                    }
                    className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 dark:border-gray-700"
                  />
                  <span className="self-center text-xs text-gray-500 dark:text-gray-400">
                    horas antes (1o lembrete)
                  </span>
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={settings.secondReminderEnabled}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        secondReminderEnabled: event.target.checked,
                      }))
                    }
                  />
                  Enviar segundo lembrete automático
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    min={1}
                    value={settings.secondReminderHoursBefore}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        secondReminderHoursBefore: Number(event.target.value) || 1,
                      }))
                    }
                    className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 dark:border-gray-700"
                    disabled={!settings.secondReminderEnabled}
                  />
                  <span className="self-center text-xs text-gray-500 dark:text-gray-400">
                    horas antes (2o lembrete)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="time"
                    value={settings.quietHoursStart}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        quietHoursStart: event.target.value,
                      }))
                    }
                    className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 dark:border-gray-700"
                  />
                  <input
                    type="time"
                    value={settings.quietHoursEnd}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        quietHoursEnd: event.target.value,
                      }))
                    }
                    className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 dark:border-gray-700"
                  />
                </div>
                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={isSavingSettings}
                  className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
                >
                  {isSavingSettings ? "Salvando..." : "Salvar automações"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Templates de mensagens
              </h2>
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={selectedTemplateType}
                    onChange={(event) =>
                      setSelectedTemplateType(event.target.value as TemplateType)
                    }
                    className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                  >
                    <option value="reminder">{templateLabel.reminder}</option>
                    <option value="reactivation">{templateLabel.reactivation}</option>
                    <option value="waitlist_call">{templateLabel.waitlist_call}</option>
                  </select>
                  <select
                    value={selectedTemplateChannel}
                    onChange={(event) =>
                      setSelectedTemplateChannel(event.target.value as ReminderChannel)
                    }
                    className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="email">E-mail</option>
                  </select>
                </div>

                <textarea
                  rows={5}
                  value={templates[selectedTemplateChannel][selectedTemplateType]}
                  onChange={(event) =>
                    setTemplates((prev) => ({
                      ...prev,
                      [selectedTemplateChannel]: {
                        ...prev[selectedTemplateChannel],
                        [selectedTemplateType]: event.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Variáveis: {"{patientName}"}, {"{date}"}, {"{time}"}, {"{procedure}"},{" "}
                  {"{professional}"}, {"{clinicName}"}, {"{lastVisit}"}
                </p>

                <div className="grid grid-cols-1 gap-2">
                  <select
                    value={selectedAppointmentId}
                    onChange={(event) => setSelectedAppointmentId(event.target.value)}
                    className="h-9 rounded-lg border border-gray-300 bg-transparent px-3 text-xs dark:border-gray-700"
                  >
                    <option value="">Paciente para preview (agenda)</option>
                    {appointments.map((appointment) => (
                      <option key={appointment.id} value={appointment.id}>
                        {appointment.patientName}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedReactivationId}
                    onChange={(event) => setSelectedReactivationId(event.target.value)}
                    className="h-9 rounded-lg border border-gray-300 bg-transparent px-3 text-xs dark:border-gray-700"
                  >
                    <option value="">Paciente para preview (reativação)</option>
                    {reactivationPatients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.patientName}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedWaitlistId}
                    onChange={(event) => setSelectedWaitlistId(event.target.value)}
                    className="h-9 rounded-lg border border-gray-300 bg-transparent px-3 text-xs dark:border-gray-700"
                  >
                    <option value="">Paciente para preview (encaixe)</option>
                    {waitlist.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.patientName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                  {previewMessage}
                </div>

                <button
                  type="button"
                  onClick={saveTemplates}
                  disabled={isSavingTemplate}
                  className="w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-400"
                >
                  {isSavingTemplate ? "Salvando..." : "Salvar templates"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Log de automações
              </h2>
              <div className="mt-4 space-y-3">
                {activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700"
                  >
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {log.action}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {log.target}
                      {log.channel ? ` via ${channelLabel[log.channel]}` : ""} -{" "}
                      {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                ))}
                {!activityLogs.length && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Sem ações recentes.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default RetentionCenter;
