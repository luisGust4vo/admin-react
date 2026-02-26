import { FormEvent, useMemo, useState } from "react";
import PageMeta from "../components/common/PageMeta";

type ProductCategory =
  | "Todos"
  | "Materiais restauradores"
  | "Implantes"
  | "Ortodontia"
  | "Endodontia";

type ProductResult = {
  id: string;
  name: string;
  category: ProductCategory;
  supplier: string;
  price: number;
  shipping: number;
  rating: number;
  source: string;
  updatedAt: string;
};

type ProductSearchPayload = {
  results?: ProductResult[];
  message?: string;
};

type SortOption = "price_asc" | "price_desc" | "rating_desc" | "updated_desc";

const categories: ProductCategory[] = [
  "Todos",
  "Materiais restauradores",
  "Implantes",
  "Ortodontia",
  "Endodontia",
];

const resolveCrawlerApiUrl = () => {
  const explicitUrl = import.meta.env.VITE_PRODUCT_SEARCH_API_URL as
    | string
    | undefined;
  if (explicitUrl) return explicitUrl.replace(/\/$/, "");

  const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
  if (!rawApiUrl) return "/clinic/products/search";

  try {
    const parsed = new URL(rawApiUrl);
    return `${parsed.origin}/clinic/products/search`;
  } catch {
    const normalized = rawApiUrl.replace(/\/$/, "");
    return `${normalized.replace(/\/auth\/register$/, "").replace(/\/register$/, "")}/clinic/products/search`;
  }
};

const CRAWLER_API_URL = resolveCrawlerApiUrl();

const resolveSourceList = () => {
  const envValue = import.meta.env.VITE_PRODUCT_CRAWLER_SOURCES as
    | string
    | undefined;

  if (!envValue) return [];
  return envValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const PRODUCT_SOURCES = resolveSourceList();

const seedResults: ProductResult[] = [
  {
    id: "1",
    name: "Resina composta fotopolimerizável A2 4g",
    category: "Materiais restauradores",
    supplier: "Dental Prime",
    price: 139.9,
    shipping: 14.9,
    rating: 4.8,
    source: "https://exemplo-loja-1.com/resina-a2",
    updatedAt: "2026-02-25T10:30:00.000Z",
  },
  {
    id: "2",
    name: "Kit de mini implantes titânio 2.0mm",
    category: "Implantes",
    supplier: "Odonto Supply",
    price: 899.0,
    shipping: 0,
    rating: 4.6,
    source: "https://exemplo-loja-2.com/mini-implantes",
    updatedAt: "2026-02-25T09:10:00.000Z",
  },
  {
    id: "3",
    name: "Fio ortodôntico NiTi 0.014",
    category: "Ortodontia",
    supplier: "OrthoMax",
    price: 54.5,
    shipping: 11.0,
    rating: 4.4,
    source: "https://exemplo-loja-3.com/fio-niti-014",
    updatedAt: "2026-02-24T18:22:00.000Z",
  },
  {
    id: "4",
    name: "Lima rotatória reciprocante sortida",
    category: "Endodontia",
    supplier: "Canal Expert",
    price: 129.0,
    shipping: 19.9,
    rating: 4.5,
    source: "https://exemplo-loja-4.com/lima-rotatoria",
    updatedAt: "2026-02-24T15:45:00.000Z",
  },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const formatDateTime = (isoDate: string) =>
  new Date(isoDate).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const ProductResearch: React.FC = () => {
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState<ProductCategory>("Todos");
  const [maxPrice, setMaxPrice] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [didSearch, setDidSearch] = useState(false);
  const [results, setResults] = useState<ProductResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("price_asc");

  const averagePrice = useMemo(() => {
    if (!results.length) return 0;
    return results.reduce((acc, item) => acc + item.price, 0) / results.length;
  }, [results]);

  const cheapestItem = useMemo(() => {
    if (!results.length) return null;
    return [...results].sort((a, b) => a.price - b.price)[0];
  }, [results]);

  const sortedResults = useMemo(() => {
    const items = [...results];

    if (sortBy === "price_asc") return items.sort((a, b) => a.price - b.price);
    if (sortBy === "price_desc") return items.sort((a, b) => b.price - a.price);
    if (sortBy === "rating_desc") return items.sort((a, b) => b.rating - a.rating);
    return items.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [results, sortBy]);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedTerm = term.trim();
    if (!normalizedTerm) {
      setSearchError("Digite um termo para pesquisar.");
      return;
    }

    setSearchError(null);
    setIsSearching(true);
    setDidSearch(true);

    const params = new URLSearchParams({
      q: normalizedTerm,
      limit: "20",
    });

    if (category !== "Todos") {
      params.set("category", category);
    }
    if (maxPrice.trim()) {
      params.set("maxPrice", maxPrice.trim());
    }
    if (PRODUCT_SOURCES.length) {
      params.set("sources", PRODUCT_SOURCES.join(","));
    }

    try {
      const response = await fetch(`${CRAWLER_API_URL}?${params.toString()}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | ProductSearchPayload
          | null;
        throw new Error(payload?.message || "Falha na busca de produtos.");
      }

      const payload = (await response.json().catch(() => ({}))) as ProductSearchPayload;
      const apiResults = Array.isArray(payload.results) ? payload.results : [];
      setResults(apiResults);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Falha na busca de produtos.";
      setSearchError(`${errorMessage} Exibindo dados de exemplo.`);

      const normalizedTermLower = normalizedTerm.toLowerCase();
      const priceLimit = Number(maxPrice) || Number.POSITIVE_INFINITY;
      const fallback = seedResults.filter((product) => {
        const matchTerm =
          !normalizedTermLower ||
          product.name.toLowerCase().includes(normalizedTermLower) ||
          product.supplier.toLowerCase().includes(normalizedTermLower);
        const matchCategory = category === "Todos" || product.category === category;
        const matchPrice = product.price <= priceLimit;
        return matchTerm && matchCategory && matchPrice;
      });

      setResults(fallback);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Pesquisa de Produtos | OdontoPro"
        description="Busca de produtos odontológicos com front pronto para integração de web crawler."
      />
      <div className="space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Pesquisa de produtos odontológicos
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Tela pronta para integrar com seu web crawler e comparar preços entre
            fornecedores.
          </p>

          <form
            onSubmit={handleSearch}
            className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4"
          >
            <input
              type="text"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Ex: resina A2, implante, alicate..."
              className="h-11 rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none transition focus:border-cyan-500 dark:border-gray-700 dark:text-white"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as ProductCategory)}
              className="h-11 rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none transition focus:border-cyan-500 dark:border-gray-700 dark:text-white"
            >
              {categories.map((item) => (
                <option key={item} value={item} className="text-gray-900">
                  {item}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              placeholder="Preço máximo (R$)"
              className="h-11 rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none transition focus:border-cyan-500 dark:border-gray-700 dark:text-white"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="h-11 rounded-xl bg-cyan-600 px-4 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSearching ? "Pesquisando..." : "Buscar produtos"}
            </button>
          </form>
          {searchError && (
            <p className="mt-3 text-sm text-error-600 dark:text-error-400">
              {searchError}
            </p>
          )}
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Resultados</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
              {results.length}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Preço médio</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
              {results.length ? formatCurrency(averagePrice) : "R$ 0,00"}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Melhor oferta
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
              {cheapestItem
                ? `${cheapestItem.name} - ${formatCurrency(cheapestItem.price)}`
                : "Sem dados"}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Produtos encontrados
            </h2>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="h-10 rounded-xl border border-gray-300 bg-transparent px-3 text-sm text-gray-800 outline-none transition focus:border-cyan-500 dark:border-gray-700 dark:text-white"
            >
              <option value="price_asc" className="text-gray-900">
                Menor preço
              </option>
              <option value="price_desc" className="text-gray-900">
                Maior preço
              </option>
              <option value="rating_desc" className="text-gray-900">
                Melhor avaliação
              </option>
              <option value="updated_desc" className="text-gray-900">
                Mais recentes
              </option>
            </select>
          </div>

          {!didSearch && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              Faça uma busca para listar produtos capturados pelo crawler.
            </p>
          )}

          {didSearch && !isSearching && results.length === 0 && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              Nenhum produto encontrado com os filtros atuais.
            </p>
          )}

          {sortedResults.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="px-3 py-2 font-medium text-gray-500">Produto</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Fornecedor</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Preço</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Frete</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Nota</th>
                    <th className="px-3 py-2 font-medium text-gray-500">
                      Atualizado
                    </th>
                    <th className="px-3 py-2 font-medium text-gray-500">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="px-3 py-3 text-gray-800 dark:text-gray-200">
                        {item.name}
                      </td>
                      <td className="px-3 py-3 text-gray-800 dark:text-gray-200">
                        {item.supplier}
                      </td>
                      <td className="px-3 py-3 font-medium text-gray-900 dark:text-white">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="px-3 py-3 text-gray-800 dark:text-gray-200">
                        {item.shipping === 0
                          ? "Grátis"
                          : formatCurrency(item.shipping)}
                      </td>
                      <td className="px-3 py-3 text-gray-800 dark:text-gray-200">
                        {item.rating.toFixed(1)}
                      </td>
                      <td className="px-3 py-3 text-gray-800 dark:text-gray-200">
                        {formatDateTime(item.updatedAt)}
                      </td>
                      <td className="px-3 py-3">
                        <a
                          href={item.source}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-cyan-600 hover:text-cyan-700"
                        >
                          Ver oferta
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
};

export default ProductResearch;
