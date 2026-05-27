"use client";

import { useEffect, useState } from "react";

type Props = {
  roles: string[];
  children: React.ReactNode;
};

export default function RoleGuard({
  roles,
  children,
}: Props) {

  const [permitido, setPermitido] =
    useState(false);

  const [validando, setValidando] =
    useState(true);

  useEffect(() => {

    const rol =
      localStorage.getItem(
        "usuario_rol"
      ) || "";

    if (
      roles.includes(rol)
    ) {

      setPermitido(true);

    }

    setValidando(false);

  }, [roles]);

  if (validando) {

    return (

      <div className="p-6">
        Validando permisos...
      </div>

    );
  }

  if (!permitido) {

    return (

      <div className="min-h-[300px] flex items-center justify-center">

        <div className="bg-white border rounded-2xl shadow-sm p-8 text-center max-w-md">

          <h2 className="text-2xl font-bold text-red-700 mb-3">
            Acceso denegado
          </h2>

          <p className="text-slate-600">
            No tiene permisos para acceder a este módulo.
          </p>

        </div>

      </div>

    );
  }

  return <>{children}</>;
}