import { useEffect, useMemo, useRef, useState } from "react";

export type CategoryItem = { name: string; requiresTC?: boolean };

type CategorySearchProps = {
  categories: CategoryItem[];
  value: string | null;
  bulletinType: string;
  onChange: (v: string | null) => void;
  placeholder?: string;
  id?: string;
};

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function highlightMatch(name: string, q: string) {
  if (!q.trim()) return <span>{name}</span>;
  const n = normalize(name);
  const term = normalize(q.trim());
  const idx = n.indexOf(term);
  if (idx === -1) return <span>{name}</span>;
  const before = name.slice(0, idx);
  const match = name.slice(idx, idx + term.length);
  const after = name.slice(idx + term.length);
  return (
    <span>
      {before}
      <mark className="rounded bg-warning/20 px-0.5 font-medium text-warning">{match}</mark>
      {after}
    </span>
  );
}

export function CategorySearch({
  categories,
  value,
  bulletinType,
  onChange,
  placeholder = "Pesquisar categoria...",
  id,
}: CategorySearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = normalize(query.trim());
  const filtered = useMemo(() => {
    if (!q) return categories;
    return categories.filter((c) => normalize(c.name).includes(q));
  }, [categories, q]);

  useEffect(() => {
    setActiveIndex(0);
  }, [filtered.length, q]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const select = (name: string) => {
    onChange(name);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const clear = () => {
    onChange(null);
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filtered.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
      return;
    }
    if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      select(filtered[activeIndex].name);
    }
  };

  return (
    <div ref={containerRef} className={`relative mt-1 ${open ? "z-50" : ""}`}>
      <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
        <input
          ref={inputRef}
          id={id}
          value={open ? query : (value ?? "")}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? "category-listbox" : undefined}
          aria-activedescendant={open && filtered[activeIndex] ? `cat-${activeIndex}` : undefined}
        />
        {value && (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-muted-foreground hover:text-foreground"
            aria-label="Limpar categoria"
          >
            ×
          </button>
        )}
      </div>
      {open && (
        <div
          id="category-listbox"
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto overscroll-contain rounded-lg border bg-popover shadow-lg"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Nenhuma categoria encontrada.
            </div>
          ) : (
            filtered.map((c, i) => (
              <button
                key={c.name}
                id={`cat-${i}`}
                type="button"
                role="option"
                aria-selected={value === c.name}
                onClick={() => select(c.name)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent ${
                  value === c.name ? "bg-accent/50 font-medium" : ""
                } ${i === activeIndex ? "bg-accent/40" : ""}`}
              >
                <span>{highlightMatch(c.name, query)}</span>
                {bulletinType === "BO-COP" && c.requiresTC && (
                  <span className="ml-2 shrink-0 text-xs text-warning">requer TC</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
