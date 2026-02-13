export default function SidebarWidget() {
  return (
    <div
      className={`
        mx-auto mb-10 w-full max-w-60 rounded-2xl border border-cyan-200/70 bg-linear-to-br from-cyan-50 to-emerald-50 px-4 py-5 text-left dark:border-cyan-900/40 dark:from-cyan-500/10 dark:to-emerald-500/10`}
    >
      <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
        OdontoPro Suite
      </h3>
      <p className="mb-4 text-gray-600 text-theme-sm dark:text-gray-300">
        Plataforma clínica para gestão odontológica completa: agenda, laudos,
        odontograma, retenção e financeiro.
      </p>
      <a
        href="/"
        className="flex items-center justify-center rounded-lg bg-cyan-600 p-3 font-medium text-white text-theme-sm hover:bg-cyan-700"
      >
        Ver painel executivo
      </a>
    </div>
  );
}
