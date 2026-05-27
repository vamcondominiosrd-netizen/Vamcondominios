export function getCondominioActual() {
  if (typeof window === "undefined") {
    return {
      id: null,
      nombre: "",
      logoUrl: "",
    };
  }

  return {
    id: localStorage.getItem("condominio_id"),
    nombre: localStorage.getItem("condominio_nombre") || "",
    logoUrl: localStorage.getItem("condominio_logo_url") || "",
  };
}
