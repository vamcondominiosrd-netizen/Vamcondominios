"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export type VAMSearchSelectOption = {
  value: string | number;
  label: string;
  description?: string;
};

type VAMSearchSelectProps = {
  label: string;
  value: string | number | null;
  options: VAMSearchSelectOption[];
  onChange: (option: VAMSearchSelectOption | null) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
};

export default function VAMSearchSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Buscar...",
  required = false,
  disabled = false,
  loading = false,
  error,
}: VAMSearchSelectProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  const selected = useMemo(() => {
    return options.find((option) => String(option.value) === String(value));
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    if (!q) return options;

    return options.filter((option) => {
      const label = option.label.toLowerCase();
      const description = option.description?.toLowerCase() || "";

      return label.includes(q) || description.includes(q);
    });
  }, [options, searchText]);

  function clearSelection() {
    setSearchText("");
    onChange(null);
    setOpen(false);
  }

  function selectOption(option: VAMSearchSelectOption) {
    onChange(option);
    setSearchText("");
    setOpen(false);
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative space-y-1">
      <label className="block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>

      <div
        className={`
          flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-sm shadow-sm transition
          ${
            disabled
              ? "cursor-not-allowed bg-slate-100 text-slate-500"
              : "cursor-pointer"
          }
          ${open ? "border-blue-600 ring-2 ring-blue-100" : "border-slate-300"}
        `}
        onClick={() => {
          if (!disabled) setOpen(true);
        }}
      >
        <Search className="h-4 w-4 text-slate-400" />

        <input
          value={open ? searchText : selected?.label || ""}
          onChange={(e) => {
            setSearchText(e.target.value);
            setOpen(true);
          }}
          disabled={disabled}
          placeholder={selected ? selected.label : placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
        />

        {selected && !disabled ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearSelection();
            }}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-xl border bg-white shadow-lg">
          {loading ? (
            <div className="px-4 py-3 text-sm text-slate-500">
              Cargando...
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">
              No hay resultados.
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = String(option.value) === String(value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectOption(option)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left text-sm hover:bg-blue-50"
                >
                  <div className="mt-0.5 h-4 w-4">
                    {isSelected && (
                      <Check className="h-4 w-4 text-blue-700" />
                    )}
                  </div>

                  <div>
                    <div className="font-semibold text-slate-800">
                      {option.label}
                    </div>

                    {option.description && (
                      <div className="text-xs text-slate-500">
                        {option.description}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}