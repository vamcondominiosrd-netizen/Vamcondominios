"use client";

type Props = {
  open: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">

      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

        <h2 className="text-xl font-bold">
          {title}
        </h2>

        <p className="mt-3 text-slate-600">
          {message}
        </p>

        <div className="mt-6 flex justify-end gap-3">

          <button
            onClick={onCancel}
            className="rounded-xl border px-4 py-2"
          >
            Cancelar
          </button>

          <button
            onClick={onConfirm}
            className="rounded-xl bg-red-700 px-4 py-2 font-bold text-white"
          >
            Confirmar
          </button>

        </div>

      </div>

    </div>
  );
}