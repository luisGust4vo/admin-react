import { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput, DateSelectArg, EventClickArg } from "@fullcalendar/core";
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
    calendar: string;
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

const normalizeDate = (value?: string | Date | null) => {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return value.split("T")[0];
};

const normalizeEventFromApi = (event: ApiCalendarEvent): CalendarEvent | null => {
  if (!event?.id || !event?.title || !event?.start) return null;

  return {
    id: String(event.id),
    title: event.title,
    start: normalizeDate(event.start),
    end: normalizeDate(event.end ?? undefined) || undefined,
    allDay: event.allDay ?? true,
    extendedProps: {
      calendar: event.extendedProps?.calendar ?? event.calendar ?? "Primary",
    },
  };
};

const Calendar: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventLevel, setEventLevel] = useState("Primary");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();

  const calendarsEvents = {
    Danger: "danger",
    Success: "success",
    Primary: "primary",
    Warning: "warning",
  };

  useEffect(() => {
    let isCancelled = false;

    const loadEvents = async () => {
      setIsLoadingEvents(true);
      setApiError(null);

      try {
        const response = await fetch(CALENDAR_API_URL, {
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

        if (!isCancelled) {
          setEvents(normalizedEvents);
        }
      } catch (error) {
        console.error("Calendar load failed:", error);
        if (!isCancelled) {
          setApiError("Não foi possível carregar os eventos do backend.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingEvents(false);
        }
      }
    };

    loadEvents();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    resetModalFields();
    setEventStartDate(selectInfo.startStr);
    setEventEndDate(selectInfo.endStr || selectInfo.startStr);
    openModal();
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    setSelectedEvent({
      id: String(event.id),
      title: event.title,
      start: normalizeDate(event.start),
      end: normalizeDate(event.end) || undefined,
      allDay: event.allDay,
      extendedProps: {
        calendar: event.extendedProps.calendar ?? "Primary",
      },
    });
    setEventTitle(event.title);
    setEventStartDate(normalizeDate(event.start));
    setEventEndDate(normalizeDate(event.end));
    setEventLevel(event.extendedProps.calendar ?? "Primary");
    openModal();
  };

  const handleAddOrUpdateEvent = async () => {
    if (isSavingEvent) return;

    const trimmedTitle = eventTitle.trim();
    if (!trimmedTitle || !eventStartDate || !eventLevel) {
      setApiError("Preencha título, data inicial e cor do evento.");
      return;
    }

    if (eventEndDate && eventEndDate < eventStartDate) {
      setApiError("A data final deve ser maior ou igual à data inicial.");
      return;
    }

    const payload = {
      title: trimmedTitle,
      start: eventStartDate,
      end: eventEndDate || null,
      calendar: eventLevel,
      allDay: true,
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

      const returned = await response.json().catch(() => null);
      const normalizedReturned =
        returned && typeof returned === "object"
          ? normalizeEventFromApi(returned as ApiCalendarEvent)
          : null;

      if (isEditing && selectedEvent) {
        const updatedEvent =
          normalizedReturned ??
          ({
            id: selectedEvent.id,
            title: payload.title,
            start: payload.start,
            end: payload.end ?? undefined,
            allDay: true,
            extendedProps: { calendar: payload.calendar },
          } as CalendarEvent);

        setEvents((prevEvents) =>
          prevEvents.map((event) =>
            event.id === selectedEvent.id ? updatedEvent : event
          )
        );
      } else {
        const createdEvent =
          normalizedReturned ??
          ({
            id: Date.now().toString(),
            title: payload.title,
            start: payload.start,
            end: payload.end ?? undefined,
            allDay: true,
            extendedProps: { calendar: payload.calendar },
          } as CalendarEvent);

        setEvents((prevEvents) => [...prevEvents, createdEvent]);
      }

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
    setEventStartDate("");
    setEventEndDate("");
    setEventLevel("Primary");
    setSelectedEvent(null);
  };

  return (
    <>
      <PageMeta
        title="React.js Calendar Dashboard | TailAdmin - Next.js Admin Dashboard Template"
        description="This is React.js Calendar Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <div className="rounded-2xl border  border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {(apiError || isLoadingEvents) && (
          <div className="px-6 pt-6">
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
            events={events}
            selectable={true}
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventContent={renderEventContent}
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
                    className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>
              </div>
              <div className="mt-6">
                <label className="block mb-4 text-sm font-medium text-gray-700 dark:text-gray-400">
                  Cor do evento
                </label>
                <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                  {Object.entries(calendarsEvents).map(([key, value]) => (
                    <div key={key} className="n-chk">
                      <div
                        className={`form-check form-check-${value} form-check-inline`}
                      >
                        <label
                          className="flex items-center text-sm text-gray-700 form-check-label dark:text-gray-400"
                          htmlFor={`modal${key}`}
                        >
                          <span className="relative">
                            <input
                              className="sr-only form-check-input"
                              type="radio"
                              name="event-level"
                              value={key}
                              id={`modal${key}`}
                              checked={eventLevel === key}
                              onChange={() => setEventLevel(key)}
                            />
                            <span className="flex items-center justify-center w-5 h-5 mr-2 border border-gray-300 rounded-full box dark:border-gray-700">
                              <span
                                className={`h-2 w-2 rounded-full bg-white ${
                                  eventLevel === key ? "block" : "hidden"
                                }`}
                              ></span>
                            </span>
                          </span>
                          {key}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Data de início
                </label>
                <div className="relative">
                  <input
                    id="event-start-date"
                    type="date"
                    lang="pt-BR"
                    value={eventStartDate}
                    onChange={(e) => setEventStartDate(e.target.value)}
                    className="dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Data de término
                </label>
                <div className="relative">
                  <input
                    id="event-end-date"
                    type="date"
                    lang="pt-BR"
                    value={eventEndDate}
                    onChange={(e) => setEventEndDate(e.target.value)}
                    className="dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
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
      </div>
    </>
  );
};

const renderEventContent = (eventInfo: any) => {
  const colorClass = `fc-bg-${eventInfo.event.extendedProps.calendar.toLowerCase()}`;
  return (
    <div
      className={`event-fc-color flex fc-event-main ${colorClass} p-1 rounded-sm`}
    >
      <div className="fc-daygrid-event-dot"></div>
      <div className="fc-event-time">{eventInfo.timeText}</div>
      <div className="fc-event-title">{eventInfo.event.title}</div>
    </div>
  );
};

export default Calendar;
