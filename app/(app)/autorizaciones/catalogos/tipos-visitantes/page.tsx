import CatalogoCRUD from "@/components/catalogos/CatalogoCRUD";

export default function TiposVisitantesPage() {
  return (
    <CatalogoCRUD
      tabla="autorizaciones_tipos_visitantes"
      titulo="Tipos de Visitantes"
      descripcion="Técnicos, choferes, proveedores, mudanceros, empleados y visitantes."
      volverHref="/autorizaciones/catalogos"
    />
  );
}