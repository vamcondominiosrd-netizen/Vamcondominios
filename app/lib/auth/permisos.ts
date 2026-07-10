export function obtenerPermisosUsuario(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem("permisos_usuario");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function tienePermiso(codigo: string): boolean {
  const permisos = obtenerPermisosUsuario();
  return permisos.includes(codigo);
}

export function tieneAlguno(codigos: string[]): boolean {
  const permisos = obtenerPermisosUsuario();
  return codigos.some((codigo) => permisos.includes(codigo));
}

export function tieneTodos(codigos: string[]): boolean {
  const permisos = obtenerPermisosUsuario();
  return codigos.every((codigo) => permisos.includes(codigo));
}