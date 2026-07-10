import CatalogoCRUD from "@/components/catalogos/CatalogoCRUD";

export default function AreasAccesoPage() {
  return (
    <CatalogoCRUD
      tabla="autorizaciones_areas_acceso"
      titulo="Áreas de Acceso"
      descripcion="Entradas, parqueos, torres, ascensores y áreas comunes."
      volverHref="/autorizaciones/catalogos"
    />
  );
}