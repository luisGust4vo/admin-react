import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";

const quickModules = [
  {
    title: "Agenda Clínica",
    description: "Gestão inteligente de consultas, encaixes e confirmações.",
    href: "/calendar",
    tone: "from-cyan-500 to-sky-600",
  },
  {
    title: "Prontuário Inteligente",
    description: "Histórico clínico, anexos, evolução e plano por paciente.",
    href: "/prontuario-inteligente",
    tone: "from-emerald-500 to-teal-600",
  },
  {
    title: "Odontograma Interativo",
    description: "Mapa dentário visual para diagnóstico e acompanhamento.",
    href: "/odontograma",
    tone: "from-blue-500 to-indigo-600",
  },
  {
    title: "Laudos Odontológicos",
    description: "Emissão de laudos assinados com fluxo clínico padronizado.",
    href: "/laudos-odontologicos",
    tone: "from-orange-500 to-amber-600",
  },
  {
    title: "Retenção Anti-Faltas",
    description: "Confirmações, lembretes e recuperação de pacientes inativos.",
    href: "/central-anti-faltas",
    tone: "from-violet-500 to-fuchsia-600",
  },
  {
    title: "Financeiro da Clínica",
    description: "Controle de gastos e visão estratégica da operação.",
    href: "/controle-gastos",
    tone: "from-rose-500 to-red-600",
  },
];

const kpis = [
  { label: "Pacientes ativos", value: "1.284", detail: "+7,2% no mês" },
  { label: "Taxa de presença", value: "92,4%", detail: "meta 90%" },
  { label: "Receita prevista", value: "R$ 186.900", detail: "próx. 30 dias" },
  { label: "NPS clínico", value: "86", detail: "excelente retenção" },
];

export default function Home() {
  return (
    <>
      <PageMeta
        title="OdontoPro | Painel Clínico"
        description="Dashboard executivo para consultórios odontológicos."
      />
      <section className="space-y-6">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-linear-to-r from-cyan-700 via-teal-700 to-emerald-700 p-6 text-white shadow-theme-xl dark:border-gray-800">
          <div className="absolute -left-12 top-1 h-52 w-52 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-black/15 blur-2xl"></div>
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-[0.2em] text-white/80">
              Plataforma Odontológica
            </p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
              Gestão completa para consultórios que querem crescer.
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-white/90 sm:text-base">
              Centralize atendimento, diagnóstico, retenção e financeiro em um
              sistema com linguagem clínica e visual profissional para apresentar
              ao mercado.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <article
              key={kpi.label}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">{kpi.label}</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                {kpi.value}
              </p>
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-300">
                {kpi.detail}
              </p>
            </article>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Módulos principais
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Navegue pelos módulos essenciais para operação e expansão do consultório.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quickModules.map((module) => (
              <Link
                key={module.title}
                to={module.href}
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-700 dark:bg-gray-900"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1.5 bg-linear-to-r ${module.tone}`}
                ></div>
                <h3 className="mt-2 font-semibold text-gray-900 group-hover:text-cyan-700 dark:text-white dark:group-hover:text-cyan-300">
                  {module.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {module.description}
                </p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                  Acessar módulo
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
