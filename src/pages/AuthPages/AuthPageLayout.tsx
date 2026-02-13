import React from "react";
import GridShape from "../../components/common/GridShape";
import { Link } from "react-router";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row dark:bg-gray-900 sm:p-0">
        {children}
        <div className="items-center hidden w-full h-full lg:w-1/2 bg-linear-to-br from-brand-950 via-brand-900 to-cyan-950 dark:from-brand-950 dark:to-gray-950 lg:grid">
          <div className="relative flex items-center justify-center z-1 px-12">
            {/* <!-- ===== Common Grid Shape Start ===== --> */}
            <GridShape />
            <div className="absolute -left-20 top-24 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl"></div>
            <div className="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-emerald-300/15 blur-3xl"></div>
            <div className="relative flex flex-col max-w-md">
              <Link to="/" className="mb-6 inline-flex w-fit rounded-xl border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
                <div>
                  <p className="text-sm font-semibold tracking-[0.2em] text-cyan-100">
                    ODONTOPRO
                  </p>
                  <p className="text-xs text-cyan-50/90">Gestão de Consultório</p>
                </div>
              </Link>
              <h2 className="text-3xl font-semibold leading-tight text-white">
                Plataforma odontológica para consultórios modernos.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-cyan-50/90">
                Apresente uma experiência premium para sua equipe e seus
                pacientes com agenda inteligente, odontograma visual, laudos
                digitais e gestão financeira integrada.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                <article className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
                  <p className="text-xs text-cyan-100/80">Taxa de presença</p>
                  <p className="mt-1 text-xl font-semibold text-white">92,4%</p>
                </article>
                <article className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
                  <p className="text-xs text-cyan-100/80">Retenção mensal</p>
                  <p className="mt-1 text-xl font-semibold text-white">+18%</p>
                </article>
              </div>
            </div>
          </div>
        </div>
        <div className="fixed z-50 hidden bottom-6 right-6 sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}
