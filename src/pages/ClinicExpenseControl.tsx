import { FormEvent, useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import PageMeta from "../components/common/PageMeta";

type ExpenseStatus = "paid" | "pending" | "overdue";
type ExpenseCategory =
  | "Materiais"
  | "Laboratório"
  | "Folha"
  | "Marketing"
  | "Estrutura"
  | "Impostos"
  | "Outros";

type PaymentMethod = "Pix" | "Cartão" | "Boleto" | "Transferência" | "Dinheiro";

type ClinicExpense = {
  id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  dueDate: string;
  status: ExpenseStatus;
  paymentMethod: PaymentMethod;
  supplier?: string;
  notes?: string;
  createdAt: string;
};

type ExpenseApiPayload = {
  id?: string | number;
  description?: string;
  category?: string;
  amount?: number | string;
  dueDate?: string;
  status?: string;
  paymentMethod?: string;
  supplier?: string;
  notes?: string;
  createdAt?: string;
};

const categories: ExpenseCategory[] = [
  "Materiais",
  "Laboratório",
  "Folha",
  "Marketing",
  "Estrutura",
  "Impostos",
  "Outros",
];

const paymentMethods: PaymentMethod[] = [
  "Pix",
  "Cartão",
  "Boleto",
  "Transferência",
  "Dinheiro",
];

const statusLabels: Record<ExpenseStatus, string> = {
  paid: "Pago",
  pending: "Pendente",
  overdue: "Atrasado",
};

const statusClassMap: Record<ExpenseStatus, string> = {
  paid: "border-success-200 bg-success-50 text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300",
  pending:
    "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/40 dark:bg-warning-500/10 dark:text-warning-300",
  overdue:
    "border-error-200 bg-error-50 text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const resolveExpensesApiUrl = () => {
  const explicitUrl = import.meta.env.VITE_CLINIC_EXPENSES_API_URL as
    | string
    | undefined;
  if (explicitUrl) return explicitUrl.replace(/\/$/, "");

  const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
  if (!rawApiUrl) return "/clinic/expenses";

  try {
    const parsed = new URL(rawApiUrl);
    return `${parsed.origin}/clinic/expenses`;
  } catch {
    return `${rawApiUrl.replace(/\/$/, "").replace(/\/auth\/register$/, "")}/clinic/expenses`;
  }
};

const EXPENSES_API_URL = resolveExpensesApiUrl();

const today = new Date();
const currentMonth = today.toISOString().slice(0, 7);
const firstDay = `${currentMonth}-01`;

const sampleExpenses: ClinicExpense[] = [
  {
    id: "sample-1",
    description: "Compra de resinas e anestésicos",
    category: "Materiais",
    amount: 2450,
    dueDate: firstDay,
    status: "paid",
    paymentMethod: "Pix",
    supplier: "Dental Prime",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-2",
    description: "Serviço de laboratório protético",
    category: "Laboratório",
    amount: 3120,
    dueDate: `${currentMonth}-10`,
    status: "pending",
    paymentMethod: "Boleto",
    supplier: "Lab Sorriso",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-3",
    description: "Folha salarial equipe clínica",
    category: "Folha",
    amount: 12700,
    dueDate: `${currentMonth}-05`,
    status: "paid",
    paymentMethod: "Transferência",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-4",
    description: "Campanha Google Ads",
    category: "Marketing",
    amount: 1800,
    dueDate: `${currentMonth}-08`,
    status: "overdue",
    paymentMethod: "Cartão",
    createdAt: new Date().toISOString(),
  },
];

const normalizeExpense = (raw: ExpenseApiPayload): ClinicExpense | null => {
  if (!raw.id || !raw.description || !raw.amount || !raw.category || !raw.dueDate) {
    return null;
  }

  const category = categories.includes(raw.category as ExpenseCategory)
    ? (raw.category as ExpenseCategory)
    : "Outros";
  const status = ["paid", "pending", "overdue"].includes(raw.status || "")
    ? (raw.status as ExpenseStatus)
    : "pending";
  const paymentMethod = paymentMethods.includes(raw.paymentMethod as PaymentMethod)
    ? (raw.paymentMethod as PaymentMethod)
    : "Pix";

  return {
    id: String(raw.id),
    description: raw.description,
    category,
    amount: Number(raw.amount),
    dueDate: raw.dueDate.split("T")[0],
    status,
    paymentMethod,
    supplier: raw.supplier || "",
    notes: raw.notes || "",
    createdAt: raw.createdAt || new Date().toISOString(),
  };
};

type ExpenseForm = {
  description: string;
  category: ExpenseCategory;
  amount: string;
  dueDate: string;
  paymentMethod: PaymentMethod;
  supplier: string;
  notes: string;
};

const defaultForm: ExpenseForm = {
  description: "",
  category: "Materiais",
  amount: "",
  dueDate: firstDay,
  paymentMethod: "Pix",
  supplier: "",
  notes: "",
};

const ClinicExpenseControl: React.FC = () => {
  const [expenses, setExpenses] = useState<ClinicExpense[]>([]);
  const [budgetTarget, setBudgetTarget] = useState(30000);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | "Todas">(
    "Todas"
  );
  const [selectedStatus, setSelectedStatus] = useState<ExpenseStatus | "all">("all");
  const [formValues, setFormValues] = useState<ExpenseForm>(defaultForm);

  useEffect(() => {
    let cancelled = false;

    const fetchExpenses = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await fetch(EXPENSES_API_URL, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Falha ao carregar: ${response.status}`);
        }

        const payload = await response.json().catch(() => []);
        const rawItems: ExpenseApiPayload[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.expenses)
            ? payload.expenses
            : [];
        const normalized = rawItems
          .map(normalizeExpense)
          .filter((item): item is ClinicExpense => Boolean(item));

        if (!cancelled) {
          setExpenses(normalized.length ? normalized : sampleExpenses);
        }
      } catch (error) {
        console.error("Expense fetch failed:", error);
        if (!cancelled) {
          setErrorMessage(
            "Não foi possível carregar do backend agora. Exibindo dados de exemplo."
          );
          setExpenses(sampleExpenses);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchExpenses();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      if (!expense.dueDate.startsWith(selectedMonth)) return false;
      if (selectedCategory !== "Todas" && expense.category !== selectedCategory) {
        return false;
      }
      if (selectedStatus !== "all" && expense.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [expenses, selectedMonth, selectedCategory, selectedStatus]);

  const paidTotal = useMemo(
    () =>
      filteredExpenses
        .filter((expense) => expense.status === "paid")
        .reduce((sum, expense) => sum + expense.amount, 0),
    [filteredExpenses]
  );
  const pendingTotal = useMemo(
    () =>
      filteredExpenses
        .filter((expense) => expense.status === "pending")
        .reduce((sum, expense) => sum + expense.amount, 0),
    [filteredExpenses]
  );
  const overdueTotal = useMemo(
    () =>
      filteredExpenses
        .filter((expense) => expense.status === "overdue")
        .reduce((sum, expense) => sum + expense.amount, 0),
    [filteredExpenses]
  );
  const projectedTotal = paidTotal + pendingTotal + overdueTotal;
  const budgetUsagePercent =
    budgetTarget > 0 ? Math.min((projectedTotal / budgetTarget) * 100, 100) : 0;

  const categoryTotals = useMemo(() => {
    const map = new Map<ExpenseCategory, number>();
    for (const expense of filteredExpenses) {
      map.set(expense.category, (map.get(expense.category) || 0) + expense.amount);
    }
    return categories.map((category) => ({
      category,
      total: map.get(category) || 0,
    }));
  }, [filteredExpenses]);

  const donutOptions: ApexOptions = {
    chart: {
      type: "donut",
      fontFamily: "Outfit, sans-serif",
    },
    labels: categoryTotals.map((item) => item.category),
    legend: {
      position: "bottom",
    },
    dataLabels: {
      enabled: false,
    },
    colors: ["#2563eb", "#f97316", "#16a34a", "#eab308", "#0f766e", "#ef4444", "#6366f1"],
    tooltip: {
      y: {
        formatter: (value: number) => formatCurrency(value),
      },
    },
    stroke: {
      colors: ["#ffffff"],
    },
  };

  const donutSeries = categoryTotals.map((item) => item.total);

  const monthlyBarData = useMemo(() => {
    const months = Array.from({ length: 12 }).map((_, index) => {
      const month = String(index + 1).padStart(2, "0");
      return `${today.getFullYear()}-${month}`;
    });

    const values = months.map((month) =>
      expenses
        .filter((expense) => expense.dueDate.startsWith(month))
        .reduce((sum, expense) => sum + expense.amount, 0)
    );

    return {
      labels: months.map((month) =>
        new Date(`${month}-01T00:00:00`).toLocaleDateString("pt-BR", {
          month: "short",
        })
      ),
      values,
    };
  }, [expenses]);

  const barOptions: ApexOptions = {
    chart: {
      type: "bar",
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: "50%",
      },
    },
    colors: ["#0f766e"],
    dataLabels: { enabled: false },
    xaxis: {
      categories: monthlyBarData.labels,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (value: number) =>
          new Intl.NumberFormat("pt-BR", {
            notation: "compact",
            compactDisplay: "short",
          }).format(value),
      },
    },
    tooltip: {
      y: {
        formatter: (value: number) => formatCurrency(value),
      },
    },
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 4,
    },
  };

  const handleAddExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    const amountNumber = Number(formValues.amount.replace(",", "."));
    if (!formValues.description.trim() || !formValues.dueDate || amountNumber <= 0) {
      setErrorMessage("Preencha descrição, vencimento e valor válido.");
      return;
    }

    const payload = {
      description: formValues.description.trim(),
      category: formValues.category,
      amount: amountNumber,
      dueDate: formValues.dueDate,
      status: "pending" as ExpenseStatus,
      paymentMethod: formValues.paymentMethod,
      supplier: formValues.supplier.trim(),
      notes: formValues.notes.trim(),
    };

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(EXPENSES_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        const message = errorPayload?.message || "Não foi possível salvar a despesa.";
        throw new Error(message);
      }

      const saved = (await response.json().catch(() => null)) as
        | ExpenseApiPayload
        | null;
      const normalized = saved ? normalizeExpense(saved) : null;

      const created: ClinicExpense =
        normalized || {
          id: `local-${Date.now()}`,
          ...payload,
          createdAt: new Date().toISOString(),
        };

      setExpenses((prev) => [created, ...prev]);
      setSuccessMessage("Despesa cadastrada com sucesso.");
      setFormValues(defaultForm);
    } catch (error) {
      console.error("Expense create failed:", error);
      const message =
        error instanceof Error ? error.message : "Falha ao conectar com backend.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateExpenseStatus = async (expense: ClinicExpense, status: ExpenseStatus) => {
    setExpenses((prev) =>
      prev.map((item) => (item.id === expense.id ? { ...item, status } : item))
    );

    if (expense.id.startsWith("sample-") || expense.id.startsWith("local-")) return;

    try {
      await fetch(`${EXPENSES_API_URL}/${encodeURIComponent(expense.id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.error("Status update failed:", error);
    }
  };

  const removeExpense = async (expense: ClinicExpense) => {
    setExpenses((prev) => prev.filter((item) => item.id !== expense.id));

    if (expense.id.startsWith("sample-") || expense.id.startsWith("local-")) return;

    try {
      await fetch(`${EXPENSES_API_URL}/${encodeURIComponent(expense.id)}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Expense delete failed:", error);
    }
  };

  return (
    <>
      <PageMeta
        title="Controle Financeiro | Clínica"
        description="Gestão completa de gastos da clínica odontológica."
      />
      <section className="space-y-6">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-linear-to-r from-teal-600 via-cyan-600 to-orange-500 p-6 text-white shadow-theme-xl dark:border-gray-800">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-black/10 blur-2xl"></div>
          <div className="relative z-10 grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <h1 className="text-2xl font-semibold sm:text-3xl">
                Controle Geral de Gastos da Clínica
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-white/90 sm:text-base">
                Painel financeiro completo para acompanhar custos, registrar novas
                despesas e manter previsibilidade de caixa.
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm lg:col-span-4">
              <p className="text-xs uppercase tracking-wide text-white/80">
                Meta de orçamento mensal
              </p>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  value={budgetTarget}
                  onChange={(event) => setBudgetTarget(Number(event.target.value) || 0)}
                  className="h-10 w-full rounded-lg border border-white/30 bg-white/15 px-3 text-sm text-white placeholder:text-white/70 focus:outline-hidden"
                />
              </div>
              <p className="mt-2 text-xs text-white/80">
                Uso atual: {budgetUsagePercent.toFixed(1)}%
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white"
                  style={{ width: `${budgetUsagePercent}%` }}
                />
              </div>
            </div>
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
                Carregando despesas...
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total pago</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {formatCurrency(paidTotal)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Em aberto</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {formatCurrency(pendingTotal)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Atrasado</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {formatCurrency(overdueTotal)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Projeção mês</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {formatCurrency(projectedTotal)}
            </p>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-12">
          <div className="space-y-5 xl:col-span-8">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Evolução anual de despesas
              </h2>
              <div className="mt-4">
                <Chart
                  type="bar"
                  options={barOptions}
                  series={[{ name: "Despesas", data: monthlyBarData.values }]}
                  height={300}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="mb-4 flex flex-wrap gap-3">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                />
                <select
                  value={selectedCategory}
                  onChange={(event) =>
                    setSelectedCategory(event.target.value as ExpenseCategory | "Todas")
                  }
                  className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                >
                  <option value="Todas">Todas as categorias</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedStatus}
                  onChange={(event) =>
                    setSelectedStatus(event.target.value as ExpenseStatus | "all")
                  }
                  className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                >
                  <option value="all">Todos os status</option>
                  <option value="paid">Pago</option>
                  <option value="pending">Pendente</option>
                  <option value="overdue">Atrasado</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Descrição
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Categoria
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Vencimento
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Valor
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
                    {filteredExpenses.map((expense) => (
                      <tr
                        key={expense.id}
                        className="border-b border-gray-100 text-sm dark:border-gray-800"
                      >
                        <td className="px-2 py-3 text-gray-800 dark:text-gray-200">
                          <p className="font-medium">{expense.description}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {expense.supplier || "Sem fornecedor"} - {expense.paymentMethod}
                          </p>
                        </td>
                        <td className="px-2 py-3 text-gray-700 dark:text-gray-300">
                          {expense.category}
                        </td>
                        <td className="px-2 py-3 text-gray-700 dark:text-gray-300">
                          {new Date(`${expense.dueDate}T00:00:00`).toLocaleDateString(
                            "pt-BR"
                          )}
                        </td>
                        <td className="px-2 py-3 font-medium text-gray-900 dark:text-white">
                          {formatCurrency(expense.amount)}
                        </td>
                        <td className="px-2 py-3">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClassMap[expense.status]}`}
                          >
                            {statusLabels[expense.status]}
                          </span>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex justify-end gap-2">
                            {expense.status !== "paid" && (
                              <button
                                type="button"
                                onClick={() => updateExpenseStatus(expense, "paid")}
                                className="rounded-lg border border-success-200 bg-success-50 px-2.5 py-1 text-xs font-medium text-success-700 hover:bg-success-100 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300"
                              >
                                Marcar pago
                              </button>
                            )}
                            {expense.status === "pending" && (
                              <button
                                type="button"
                                onClick={() => updateExpenseStatus(expense, "overdue")}
                                className="rounded-lg border border-warning-200 bg-warning-50 px-2.5 py-1 text-xs font-medium text-warning-700 hover:bg-warning-100 dark:border-warning-500/40 dark:bg-warning-500/10 dark:text-warning-300"
                              >
                                Marcar atrasado
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeExpense(expense)}
                              className="rounded-lg border border-error-200 bg-error-50 px-2.5 py-1 text-xs font-medium text-error-700 hover:bg-error-100 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredExpenses.length && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-2 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                        >
                          Nenhuma despesa encontrada para os filtros atuais.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-5 xl:col-span-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Distribuição por categoria
              </h2>
              <div className="mt-4">
                <Chart
                  type="donut"
                  options={donutOptions}
                  series={donutSeries.length ? donutSeries : [1]}
                  height={300}
                />
              </div>
            </div>

            <form
              onSubmit={handleAddExpense}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Nova despesa
              </h2>
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={formValues.description}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="Descrição da despesa"
                  className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={formValues.category}
                    onChange={(event) =>
                      setFormValues((prev) => ({
                        ...prev,
                        category: event.target.value as ExpenseCategory,
                      }))
                    }
                    className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={formValues.amount}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, amount: event.target.value }))
                    }
                    placeholder="Valor"
                    className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    lang="pt-BR"
                    value={formValues.dueDate}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, dueDate: event.target.value }))
                    }
                    className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                  />
                  <select
                    value={formValues.paymentMethod}
                    onChange={(event) =>
                      setFormValues((prev) => ({
                        ...prev,
                        paymentMethod: event.target.value as PaymentMethod,
                      }))
                    }
                    className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={formValues.supplier}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, supplier: event.target.value }))
                  }
                  placeholder="Fornecedor (opcional)"
                  className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                />
                <textarea
                  rows={3}
                  value={formValues.notes}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  placeholder="Observações"
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
                />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
                >
                  {isSaving ? "Salvando..." : "Salvar despesa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
};

export default ClinicExpenseControl;
