import CatalogoCRUD from "@/components/catalogos/CatalogoCRUD";

export default function HorariosPage() {
  return (
    <CatalogoCRUD
      tabla="autorizaciones_horarios"
      titulo="Horarios Permitidos"
      descripcion="Horarios disponibles para las autorizaciones del condominio."
      volverHref="/autorizaciones/catalogos"
    />
  );
}