"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

type CondominioContextType = {
  condominioSeleccionado: string;
  setCondominioSeleccionado: (
    value: string
  ) => void;
};

const CondominioContext =
  createContext<CondominioContextType>({
    condominioSeleccionado: "",
    setCondominioSeleccionado: () => {},
  });

export function CondominioProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    condominioSeleccionado,
    setCondominioSeleccionado,
  ] = useState("");

  useEffect(() => {
    const guardado =
      localStorage.getItem(
        "condominioSeleccionado"
      );

    if (guardado) {
      setCondominioSeleccionado(guardado);
    }
  }, []);

  useEffect(() => {
    if (condominioSeleccionado) {
      localStorage.setItem(
        "condominioSeleccionado",
        condominioSeleccionado
      );
    }
  }, [condominioSeleccionado]);

  return (
    <CondominioContext.Provider
      value={{
        condominioSeleccionado,
        setCondominioSeleccionado,
      }}
    >
      {children}
    </CondominioContext.Provider>
  );
}

export function useCondominio() {
  return useContext(
    CondominioContext
  );
}