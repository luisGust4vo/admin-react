import { useCallback, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  DatesSetArg,
  EventInput,
  DateSelectArg,
  EventClickArg,
} from "@fullcalendar/core";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import PageMeta from "../components/common/PageMeta";

interface CalendarEvent extends EventInput {
  id: string;
  title: string;
  start: string;
  end?: string;
  extendedProps: {
    calendar: "primary" | "danger" | "success" | "warning";
  };
}

type ApiCalendarEvent = {
  id?: string | number;
  title?: string;
  start?: string;
  end?: string | null;
  calendar?: string;
  allDay?: boolean;
  extendedProps?: {
    calendar?: string;
  };
};

type CalendarRange = {
  start: string;
  end: string;
};

const resolveCalendarApiUrl = () => {
  const explicitCalendarUrl = import.meta.env.VITE_CALENDAR_API_URL as
    | string
    | undefined;
  if (explicitCalendarUrl) return explicitCalendarUrl.replace(/\/$/, "");

  const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
  if (!rawApiUrl) return "/calendar/events";

  try {
    const parsed = new URL(rawApiUrl);
    return `${parsed.origin}/calendar/events`;
  } catch {
    return `${rawApiUrl.replace(/\/$/, "").replace(/\/auth\/register$/, "")}/calendar/events`;
  }
};

const CALENDAR_API_URL = resolveCalendarApiUrl();

const normalizeDateTimeLocal = (value?: string | Date | null) => {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
};

const toApiDateTime = (value: string) => `${value}:00`;

const getStartOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const isPastCalendarDate = (date: Date) => {
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);
  return dateOnly < getStartOfToday();
};

const normalizeCalendarLevel = (
  value?: string
): "primary" | "danger" | "success" | "warning" => {
  const normalized = (value ?? "").toLowerCase();
  if (
    normalized === "primary" ||
    normalized === "danger" ||
    normalized === "success" ||
    normalized === "warning"
  ) {
    return normalized;
  }

  if (normalized === "atencao") return "warning";
  if (normalized === "urgente") return "danger";
  if (normalized === "confirmado") return "success";
  return "primary";
};

const normalizeEventFromApi = (event: ApiCalendarEvent): CalendarEvent | null => {
  if (!event?.id || !event?.title || !event?.start) return null;

  return {
    id: String(event.id),
    title: event.title,
    start: event.start,
    end: event.end ?? undefined,
    allDay: event.allDay ?? false,
    extendedProps: {
      calendar: normalizeCalendarLevel(
        event.extendedProps?.calendar ?? event.calendar
      ),
    },
  };
};

const Calendar: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDateTime, setEventStartDateTime] = useState("");
  const [eventEndDateTime, setEventEndDateTime] = useState("");
  const [eventLevel, setEventLevel] = useState<
    "primary" | "danger" | "success" | "warning"
  >("primary");
  const [visibleRange, setVisibleRange] = useState<CalendarRange | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();

  const calendarsEvents: Array<{
    label: string;
    value: "primary" | "danger" | "success" | "warning";
  }> = [
    { label: "Padrão", value: "primary" },
    { label: "Urgente", value: "danger" },
    { label: "Confirmado", value: "success" },
    { label: "Atenção", value: "warning" },
  ];

  const loadEvents = useCallback(async (range?: CalendarRange | null) => {
    setIsLoadingEvents(true);
    setApiError(null);

    try {
      const requestUrl = new URL(CALENDAR_API_URL, window.location.origin);
      if (range?.start && range?.end) {
        requestUrl.searchParams.set("start", range.start);
        requestUrl.searchParams.set("end", range.end);
      }
      requestUrl.searchParams.set("limit", "500");

      const response = await fetch(requestUrl.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load events: ${response.status}`);
      }

      const payload = await response.json().catch(() => []);
      const rawEvents: ApiCalendarEvent[] = Array.isArray(payload)
        ? (payload as ApiCalendarEvent[])
        : Array.isArray(payload?.events)
          ? (payload.events as ApiCalendarEvent[])
          : [];

      const normalizedEvents = rawEvents
        .map((event: ApiCalendarEvent) => normalizeEventFromApi(event))
        .filter((event): event is CalendarEvent => Boolean(event));

      setEvents(normalizedEvents);
    } catch (error) {
      console.error("Calendar load failed:", error);
      setApiError("Não foi possível carregar os eventos do backend.");
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  const handleDatesSet = (dateInfo: DatesSetArg) => {
    const nextRange = {
      start: dateInfo.start.toISOString(),
      end: dateInfo.end.toISOString(),
    };
    setVisibleRange(nextRange);
    void loadEvents(nextRange);
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    if (isPastCalendarDate(selectInfo.start)) {
      setApiError("Não é possível agendar em dias que já passaram.");
      return;
    }

    resetModalFields();
    setEventStartDateTime(normalizeDateTimeLocal(selectInfo.start));
    setEventEndDateTime(
      normalizeDateTimeLocal(selectInfo.end || selectInfo.start)
    );
    openModal();
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    setSelectedEvent({
      id: String(event.id),
      title: event.title,
      start: normalizeDateTimeLocal(event.start),
      end: normalizeDateTimeLocal(event.end) || undefined,
      allDay: event.allDay,
      extendedProps: {
        calendar: normalizeCalendarLevel(event.extendedProps.calendar),
      },
    });
    setEventTitle(event.title);
    setEventStartDateTime(normalizeDateTimeLocal(event.start));
    setEventEndDateTime(normalizeDateTimeLocal(event.end || event.start));
    setEventLevel(normalizeCalendarLevel(event.extendedProps.calendar));
    openModal();
  };

  const handleAddOrUpdateEvent = async () => {
    if (isSavingEvent) return;

    const trimmedTitle = eventTitle.trim();
    if (!trimmedTitle || !eventStartDateTime || !eventLevel) {
      setApiError("Preencha título, início e categoria do evento.");
      return;
    }

    if (eventEndDateTime && eventEndDateTime < eventStartDateTime) {
      setApiError("O término deve ser maior ou igual ao início.");
      return;
    }

    if (isPastCalendarDate(new Date(eventStartDateTime))) {
      setApiError("Não é possível agendar em dias que já passaram.");
      return;
    }

    const payload = {
      title: trimmedTitle,
      start: toApiDateTime(eventStartDateTime),
      end: eventEndDateTime ? toApiDateTime(eventEndDateTime) : null,
      calendar: eventLevel,
      allDay: false,
    };

    const isEditing = Boolean(selectedEvent);
    const requestUrl =
      isEditing && selectedEvent
        ? `${CALENDAR_API_URL}/${encodeURIComponent(selectedEvent.id)}`
        : CALENDAR_API_URL;
    const requestMethod = isEditing ? "PUT" : "POST";

    setApiError(null);
    setIsSavingEvent(true);

    try {
      const response = await fetch(requestUrl, {
        method: requestMethod,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        const message =
          errorPayload?.message || "Não foi possível salvar o evento.";
        setApiError(message);
        return;
      }

      await loadEvents(visibleRange);

      closeModal();
      resetModalFields();
    } catch (error) {
      console.error("Calendar save failed:", error);
      setApiError("Falha ao conectar com o backend.");
    } finally {
      setIsSavingEvent(false);
    }
  };

  const resetModalFields = () => {
    setEventTitle("");
    setEventStartDateTime("");
    setEventEndDateTime("");
    setEventLevel("primary");
    setSelectedEvent(null);
  };

  return (
    <>
      <PageMeta
        title="Agenda Clínica | OdontoPro"
        description="Agenda odontológica com visão mensal, semanal e diária em português."
      />
      <section className="clinic-page">
        <div className="clinic-hero bg-linear-to-r from-brand-700 via-cyan-700 to-teal-700 text-white">
          <div className="absolute -left-10 top-6 h-44 w-44 rounded-full bg-white/15 blur-2xl"></div>
          <div className="absolute -right-16 bottom-0 h-52 w-52 rounded-full bg-black/15 blur-2xl"></div>
          <div className="relative z-10 grid gap-5 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/90">
                Agenda Odontológica
              </span>
              <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
                Organize consultas, encaixes e retornos clínicos.
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-white/90 sm:text-base">
                Visual completo para recepção e equipe clínica acompanharem os
                atendimentos em tempo real.
              </p>
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm lg:col-span-4">
              <p className="text-xs uppercase tracking-wide text-white/80">
                Visão rápida
              </p>
              <p className="mt-2 text-3xl font-semibold">{events.length}</p>
              <p className="text-xs text-white/85">
                eventos cadastrados no calendário
              </p>
            </div>
          </div>
        </div>
        <div className="clinic-surface overflow-hidden">
          {(apiError || isLoadingEvents) && (
            <div className="px-2 pb-5">
              {apiError && (
                <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
                  {apiError}
                </div>
              )}
              {isLoadingEvents && (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Carregando eventos...
                </p>
              )}
            </div>
          )}
          <div className="custom-calendar">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              locale={ptBrLocale}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next addEventButton",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              buttonText={{
                today: "Hoje",
                month: "Mês",
                week: "Semana",
                day: "Dia",
              }}
              eventTimeFormat={{
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }}
              slotLabelFormat={{
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }}
              dayMaxEvents={true}
              dayMaxEventRows={4}
              expandRows={true}
              height="auto"
              nowIndicator={true}
              slotDuration="00:30:00"
              slotMinTime="06:00:00"
              slotMaxTime="22:00:00"
              selectAllow={(selectInfo) => !isPastCalendarDate(selectInfo.start)}
              dayCellClassNames={(arg) =>
                isPastCalendarDate(arg.date) ? ["fc-day-disabled-past"] : []
              }
              events={events}
              datesSet={handleDatesSet}
              eventClassNames={(arg: { event: { extendedProps: { calendar?: string } } }) => [
                "event-fc-color",
                `fc-bg-${String(arg.event.extendedProps.calendar || "primary").toLowerCase()}`,
              ]}
              selectable={true}
              select={handleDateSelect}
              eventClick={handleEventClick}
              customButtons={{
                addEventButton: {
                  text: "Adicionar evento +",
                  click: () => {
                    resetModalFields();
                    openModal();
                  },
                },
              }}
            />
          </div>
        </div>
        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          className="max-w-[700px] p-6 lg:p-10"
        >
          <div className="flex flex-col px-2 overflow-y-auto custom-scrollbar">
            <div>
              <h5 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
                {selectedEvent ? "Editar evento" : "Adicionar evento"}
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Planeje seu próximo compromisso: adicione ou edite um evento
                para manter tudo organizado.
              </p>
            </div>
            <div className="mt-8">
              <div>
                <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Título do evento
                </label>
                <input
                    id="event-title"
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="clinic-input dark:bg-dark-900 h-11 w-full px-4 py-2.5 text-gray-800 shadow-theme-xs placeholder:text-gray-400 dark:text-white/90 dark:placeholder:text-white/30"
                  />
                </div>
              </div>
              <div className="mt-6">
                <label className="block mb-4 text-sm font-medium text-gray-700 dark:text-gray-400">
                  Categoria do evento
                </label>
                <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                  {calendarsEvents.map(({ label, value }) => (
                    <div key={value} className="n-chk">
                      <div
                        className={`form-check form-check-${value} form-check-inline`}
                      >
                        <label
                          className="flex items-center text-sm text-gray-700 form-check-label dark:text-gray-400"
                          htmlFor={`modal-${value}`}
                        >
                          <span className="relative">
                            <input
                              className="sr-only form-check-input"
                              type="radio"
                              name="event-level"
                              value={value}
                              id={`modal-${value}`}
                              checked={eventLevel === value}
                              onChange={() => setEventLevel(value)}
                            />
                            <span className="flex items-center justify-center w-5 h-5 mr-2 border border-gray-300 rounded-full box dark:border-gray-700">
                              <span
                                className={`h-2 w-2 rounded-full bg-white ${
                                  eventLevel === value ? "block" : "hidden"
                                }`}
                              ></span>
                            </span>
                          </span>
                          {label}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Início (data e hora)
                </label>
                <div className="relative">
                  <input
                    id="event-start-datetime"
                    type="datetime-local"
                    lang="pt-BR"
                    value={eventStartDateTime}
                    onChange={(e) => setEventStartDateTime(e.target.value)}
                    className="clinic-input dark:bg-dark-900 h-11 w-full appearance-none bg-none px-4 py-2.5 pl-4 pr-11 text-gray-800 shadow-theme-xs placeholder:text-gray-400 dark:text-white/90 dark:placeholder:text-white/30"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Término (data e hora)
                </label>
                <div className="relative">
                  <input
                    id="event-end-datetime"
                    type="datetime-local"
                    lang="pt-BR"
                    value={eventEndDateTime}
                    onChange={(e) => setEventEndDateTime(e.target.value)}
                    className="clinic-input dark:bg-dark-900 h-11 w-full appearance-none bg-none px-4 py-2.5 pl-4 pr-11 text-gray-800 shadow-theme-xs placeholder:text-gray-400 dark:text-white/90 dark:placeholder:text-white/30"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6 modal-footer sm:justify-end">
              <button
                onClick={closeModal}
                type="button"
                className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
              >
                Fechar
              </button>
              <button
                onClick={handleAddOrUpdateEvent}
                type="button"
                disabled={isSavingEvent}
                className="btn btn-success btn-update-event flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto"
              >
                {isSavingEvent
                  ? "Salvando..."
                  : selectedEvent
                    ? "Salvar alterações"
                    : "Adicionar evento"}
              </button>
            </div>
          </div>
        </Modal>
      </section>
    </>
  );
};

export default Calendar;
