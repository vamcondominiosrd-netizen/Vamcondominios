import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ROLES_ADMINISTRACION = [
  "representante del condominio",
  "administrador general",
  "administrador del condominio",
  "administrador",
];

const ROLES_RESERVADOS = [
  "super admin",
  "super administrador",
  "full admin",
  "full administrador",
  "administrador global vam",
];

type ContextoAutorizado = {
  userId: string;
  empresaId: number;
  condominioId: number;
  rolCondominio: string;
  esAdministradorPrincipal: boolean;
  permisosUsuario: Set<string>;
};

type RolPayload = {
  condominio_id?: number | string;
  rol_id?: number | string;
  nombre?: string;
  descripcion?: string | null;
  activo?: boolean;
  permiso_ids?: Array<number | string>;
};

function texto(valor: unknown) {
  return String(valor ?? "").trim();
}

function normalizar(valor: unknown) {
  return texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function obtenerBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const [tipo, token] = authorization.split(" ");

  if (tipo?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

function crearClienteAdmin() {
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function estadoPermiteAcceso(estado: unknown, activa: unknown) {
  if (activa !== true) return false;
  return ["activo", "configuracion", "en configuracion"].includes(
    normalizar(estado || "activo")
  );
}

function esRolAdministrador(nombre: unknown) {
  return ROLES_ADMINISTRACION.includes(normalizar(nombre));
}

function esNombreReservado(nombre: unknown) {
  return ROLES_RESERVADOS.includes(normalizar(nombre));
}

function permisoRequeridoPorMetodo(method: string) {
  if (method === "GET") return "roles.ver";
  if (method === "POST") return "roles.crear";
  if (method === "PATCH") return "roles.editar";
  if (method === "DELETE") return "roles.eliminar";
  return "";
}

async function validarContexto(
  request: Request,
  supabaseAdmin: SupabaseClient,
  condominioId: number
): Promise<
  | { ok: true; contexto: ContextoAutorizado }
  | { ok: false; response: NextResponse }
> {
  const token = obtenerBearerToken(request);

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "No se recibió una sesión válida." },
        { status: 401 }
      ),
    };
  }

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.getUser(token);

  if (authError || !authData.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "La sesión no es válida o expiró." },
        { status: 401 }
      ),
    };
  }

  const { data: condominio, error: condominioError } = await supabaseAdmin
    .from("condominios")
    .select("id, empresa_id, activa, estado")
    .eq("id", condominioId)
    .maybeSingle();

  if (condominioError || !condominio || !condominio.empresa_id) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "El condominio solicitado no existe." },
        { status: 404 }
      ),
    };
  }

  if (!estadoPermiteAcceso(condominio.estado, condominio.activa)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error:
            "El condominio está suspendido, inactivo o no permite configuraciones.",
        },
        { status: 403 }
      ),
    };
  }

  const empresaId = Number(condominio.empresa_id);

  const { data: empresaUsuario, error: empresaError } = await supabaseAdmin
    .from("usuarios_empresas")
    .select("id, rol_global, activo")
    .eq("user_id", authData.user.id)
    .eq("empresa_id", empresaId)
    .eq("activo", true)
    .maybeSingle();

  if (empresaError || !empresaUsuario) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "El usuario no pertenece a la empresa activa." },
        { status: 403 }
      ),
    };
  }

  const { data: accesoCondominio, error: accesoError } = await supabaseAdmin
    .from("usuarios_condominios")
    .select("id, rol_condominio, activo")
    .eq("user_id", authData.user.id)
    .eq("empresa_id", empresaId)
    .eq("condominio_id", condominioId)
    .eq("activo", true)
    .maybeSingle();

  if (accesoError || !accesoCondominio) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "No tiene acceso activo a este condominio." },
        { status: 403 }
      ),
    };
  }

  const { data: asignaciones, error: asignacionesError } = await supabaseAdmin
    .from("usuarios_roles")
    .select("rol_id, condominio_id, activo")
    .eq("user_id", authData.user.id)
    .eq("empresa_id", empresaId)
    .eq("activo", true)
    .or(`condominio_id.is.null,condominio_id.eq.${condominioId}`);

  if (asignacionesError) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: `No fue posible validar los roles del usuario: ${asignacionesError.message}`,
        },
        { status: 400 }
      ),
    };
  }

  const rolIds = Array.from(
    new Set((asignaciones || []).map((item) => Number(item.rol_id)).filter(Boolean))
  );

  let nombresRoles: string[] = [];
  const permisosUsuario = new Set<string>();

  if (rolIds.length > 0) {
    const { data: rolesUsuario, error: rolesError } = await supabaseAdmin
      .from("roles")
      .select("id, nombre, activo, empresa_id, condominio_id")
      .in("id", rolIds)
      .eq("empresa_id", empresaId)
      .eq("activo", true);

    if (rolesError) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            ok: false,
            error: `No fue posible validar los roles: ${rolesError.message}`,
          },
          { status: 400 }
        ),
      };
    }

    nombresRoles = (rolesUsuario || [])
      .filter(
        (rol) =>
          rol.condominio_id === null ||
          Number(rol.condominio_id) === Number(condominioId)
      )
      .map((rol) => String(rol.nombre || ""));

    const rolesValidosIds = (rolesUsuario || [])
      .filter(
        (rol) =>
          rol.condominio_id === null ||
          Number(rol.condominio_id) === Number(condominioId)
      )
      .map((rol) => Number(rol.id));

    if (rolesValidosIds.length > 0) {
      const { data: relacionesPermisos, error: relacionesError } =
        await supabaseAdmin
          .from("roles_permisos")
          .select("permiso_id")
          .in("rol_id", rolesValidosIds);

      if (relacionesError) {
        return {
          ok: false,
          response: NextResponse.json(
            {
              ok: false,
              error: `No fue posible validar los permisos: ${relacionesError.message}`,
            },
            { status: 400 }
          ),
        };
      }

      const permisoIds = Array.from(
        new Set(
          (relacionesPermisos || [])
            .map((item) => Number(item.permiso_id))
            .filter(Boolean)
        )
      );

      if (permisoIds.length > 0) {
        const { data: permisos, error: permisosError } = await supabaseAdmin
          .from("permisos")
          .select("codigo, activo")
          .in("id", permisoIds)
          .eq("activo", true);

        if (permisosError) {
          return {
            ok: false,
            response: NextResponse.json(
              {
                ok: false,
                error: `No fue posible validar los permisos: ${permisosError.message}`,
              },
              { status: 400 }
            ),
          };
        }

        for (const permiso of permisos || []) {
          permisosUsuario.add(String(permiso.codigo || "").trim());
        }
      }
    }
  }

  const esAdministradorPrincipal = [
    empresaUsuario.rol_global,
    accesoCondominio.rol_condominio,
    ...nombresRoles,
  ].some(esRolAdministrador);

  const permisoNecesario = permisoRequeridoPorMetodo(request.method);

  if (
    !esAdministradorPrincipal &&
    permisoNecesario &&
    !permisosUsuario.has(permisoNecesario)
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: `No tiene el permiso requerido: ${permisoNecesario}.`,
        },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    contexto: {
      userId: authData.user.id,
      empresaId,
      condominioId,
      rolCondominio: String(accesoCondominio.rol_condominio || ""),
      esAdministradorPrincipal,
      permisosUsuario,
    },
  };
}

async function validarPermisosSolicitados(
  supabaseAdmin: SupabaseClient,
  permisoIdsEntrada: Array<number | string> | undefined,
  contexto: ContextoAutorizado
) {
  const permisoIds = Array.from(
    new Set(
      (permisoIdsEntrada || [])
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );

  if (permisoIds.length === 0) {
    return { permisoIds: [] as number[], permisos: [] as any[] };
  }

  const { data: permisos, error } = await supabaseAdmin
    .from("permisos")
    .select("id, codigo, modulo, descripcion, activo")
    .in("id", permisoIds)
    .eq("activo", true);

  if (error) {
    throw new Error(`No fue posible validar los permisos: ${error.message}`);
  }

  if ((permisos || []).length !== permisoIds.length) {
    throw new Error("Uno o varios permisos seleccionados no existen o están inactivos.");
  }

  if (!contexto.esAdministradorPrincipal) {
    const noAutorizados = (permisos || []).filter(
      (permiso) => !contexto.permisosUsuario.has(String(permiso.codigo || ""))
    );

    if (noAutorizados.length > 0) {
      throw new Error(
        "No puede conceder permisos superiores a los que tiene asignados."
      );
    }
  }

  return { permisoIds, permisos: permisos || [] };
}

async function obtenerRolEditable(
  supabaseAdmin: SupabaseClient,
  rolId: number,
  contexto: ContextoAutorizado
) {
  const { data: rol, error } = await supabaseAdmin
    .from("roles")
    .select(
      "id, empresa_id, condominio_id, nombre, descripcion, es_sistema, activo, created_at, updated_at"
    )
    .eq("id", rolId)
    .eq("empresa_id", contexto.empresaId)
    .maybeSingle();

  if (error || !rol) {
    throw new Error("El rol seleccionado no existe.");
  }

  if (Number(rol.condominio_id) !== contexto.condominioId) {
    throw new Error("Solo puede modificar roles creados para este condominio.");
  }

  if (rol.es_sistema === true) {
    throw new Error("Los roles del sistema no pueden modificarse desde el condominio.");
  }

  return rol;
}

export async function GET(request: Request) {
  const supabaseAdmin = crearClienteAdmin();

  if (!supabaseAdmin) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el servidor.",
      },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const condominioId = Number(url.searchParams.get("condominio_id"));

  if (!Number.isInteger(condominioId) || condominioId <= 0) {
    return NextResponse.json(
      { ok: false, error: "Debe indicar un condominio_id válido." },
      { status: 400 }
    );
  }

  const autorizacion = await validarContexto(
    request,
    supabaseAdmin,
    condominioId
  );
  if (autorizacion.ok === false) return autorizacion.response;

  const contexto = autorizacion.contexto;

  const { data: roles, error: rolesError } = await supabaseAdmin
    .from("roles")
    .select(
      "id, empresa_id, condominio_id, nombre, descripcion, es_sistema, activo, created_at, updated_at"
    )
    .eq("empresa_id", contexto.empresaId)
    .or(`condominio_id.is.null,condominio_id.eq.${condominioId}`)
    .order("es_sistema", { ascending: false })
    .order("nombre", { ascending: true });

  if (rolesError) {
    return NextResponse.json(
      {
        ok: false,
        error: `No fue posible cargar los roles: ${rolesError.message}`,
      },
      { status: 400 }
    );
  }

  const rolIds = (roles || []).map((rol) => Number(rol.id));
  let relaciones: any[] = [];

  if (rolIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("roles_permisos")
      .select("rol_id, permiso_id")
      .in("rol_id", rolIds);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: `No fue posible cargar los permisos de los roles: ${error.message}`,
        },
        { status: 400 }
      );
    }

    relaciones = data || [];
  }

  const { data: permisos, error: permisosError } = await supabaseAdmin
    .from("permisos")
    .select("id, codigo, modulo, descripcion, activo")
    .eq("activo", true)
    .order("modulo", { ascending: true })
    .order("codigo", { ascending: true });

  if (permisosError) {
    return NextResponse.json(
      {
        ok: false,
        error: `No fue posible cargar el catálogo de permisos: ${permisosError.message}`,
      },
      { status: 400 }
    );
  }

  const rolesConPermisos = (roles || []).map((rol) => ({
    ...rol,
    editable:
      Number(rol.condominio_id) === condominioId && rol.es_sistema !== true,
    permiso_ids: relaciones
      .filter((relacion) => Number(relacion.rol_id) === Number(rol.id))
      .map((relacion) => Number(relacion.permiso_id)),
  }));

  return NextResponse.json({
    ok: true,
    condominio_id: condominioId,
    empresa_id: contexto.empresaId,
    roles: rolesConPermisos,
    permisos: permisos || [],
    puede_administrar_todos_los_permisos: contexto.esAdministradorPrincipal,
  });
}

export async function POST(request: Request) {
  const supabaseAdmin = crearClienteAdmin();

  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Faltan variables de entorno del servidor." },
      { status: 500 }
    );
  }

  try {
    const body = (await request.json()) as RolPayload;
    const condominioId = Number(body.condominio_id);
    const nombre = texto(body.nombre);
    const descripcion = texto(body.descripcion) || null;

    if (!Number.isInteger(condominioId) || condominioId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Debe indicar un condominio_id válido." },
        { status: 400 }
      );
    }

    if (nombre.length < 3) {
      return NextResponse.json(
        { ok: false, error: "El nombre del rol debe tener al menos 3 caracteres." },
        { status: 400 }
      );
    }

    if (esNombreReservado(nombre)) {
      return NextResponse.json(
        { ok: false, error: "Ese nombre está reservado por VAM." },
        { status: 400 }
      );
    }

    const autorizacion = await validarContexto(
      request,
      supabaseAdmin,
      condominioId
    );
    if (autorizacion.ok === false) return autorizacion.response;

    const contexto = autorizacion.contexto;
    const { permisoIds } = await validarPermisosSolicitados(
      supabaseAdmin,
      body.permiso_ids,
      contexto
    );

    const { data: duplicado, error: duplicadoError } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("empresa_id", contexto.empresaId)
      .eq("condominio_id", condominioId)
      .ilike("nombre", nombre)
      .maybeSingle();

    if (duplicadoError) {
      throw new Error(`No fue posible validar el nombre del rol: ${duplicadoError.message}`);
    }

    if (duplicado) {
      return NextResponse.json(
        { ok: false, error: "Ya existe un rol con ese nombre en el condominio." },
        { status: 409 }
      );
    }

    const { data: rolCreado, error: rolError } = await supabaseAdmin
      .from("roles")
      .insert({
        empresa_id: contexto.empresaId,
        condominio_id: condominioId,
        nombre,
        descripcion,
        es_sistema: false,
        activo: true,
      })
      .select(
        "id, empresa_id, condominio_id, nombre, descripcion, es_sistema, activo, created_at, updated_at"
      )
      .single();

    if (rolError || !rolCreado) {
      throw new Error(`No fue posible crear el rol: ${rolError?.message || "error desconocido"}`);
    }

    if (permisoIds.length > 0) {
      const { error: permisosInsertError } = await supabaseAdmin
        .from("roles_permisos")
        .insert(
          permisoIds.map((permisoId) => ({
            rol_id: rolCreado.id,
            permiso_id: permisoId,
          }))
        );

      if (permisosInsertError) {
        await supabaseAdmin.from("roles").delete().eq("id", rolCreado.id);
        throw new Error(
          `El rol no pudo recibir sus permisos: ${permisosInsertError.message}`
        );
      }
    }

    return NextResponse.json({
      ok: true,
      mensaje: "Rol creado correctamente.",
      rol: { ...rolCreado, permiso_ids: permisoIds, editable: true },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Error inesperado creando el rol." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const supabaseAdmin = crearClienteAdmin();

  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Faltan variables de entorno del servidor." },
      { status: 500 }
    );
  }

  try {
    const body = (await request.json()) as RolPayload;
    const condominioId = Number(body.condominio_id);
    const rolId = Number(body.rol_id);

    if (!Number.isInteger(condominioId) || condominioId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Debe indicar un condominio_id válido." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(rolId) || rolId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Debe indicar un rol_id válido." },
        { status: 400 }
      );
    }

    const autorizacion = await validarContexto(
      request,
      supabaseAdmin,
      condominioId
    );
    if (autorizacion.ok === false) return autorizacion.response;

    const contexto = autorizacion.contexto;
    const rolActual = await obtenerRolEditable(supabaseAdmin, rolId, contexto);

    const nombre = body.nombre === undefined ? rolActual.nombre : texto(body.nombre);
    const descripcion =
      body.descripcion === undefined
        ? rolActual.descripcion
        : texto(body.descripcion) || null;
    const activo = body.activo === undefined ? rolActual.activo : Boolean(body.activo);

    if (texto(nombre).length < 3) {
      return NextResponse.json(
        { ok: false, error: "El nombre del rol debe tener al menos 3 caracteres." },
        { status: 400 }
      );
    }

    if (esNombreReservado(nombre)) {
      return NextResponse.json(
        { ok: false, error: "Ese nombre está reservado por VAM." },
        { status: 400 }
      );
    }

    const { data: duplicados, error: duplicadoError } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("empresa_id", contexto.empresaId)
      .eq("condominio_id", condominioId)
      .ilike("nombre", texto(nombre));

    if (duplicadoError) {
      throw new Error(`No fue posible validar el nombre del rol: ${duplicadoError.message}`);
    }

    if ((duplicados || []).some((item) => Number(item.id) !== rolId)) {
      return NextResponse.json(
        { ok: false, error: "Ya existe otro rol con ese nombre en el condominio." },
        { status: 409 }
      );
    }

    let permisoIds: number[] | null = null;

    if (body.permiso_ids !== undefined) {
      const validacionPermisos = await validarPermisosSolicitados(
        supabaseAdmin,
        body.permiso_ids,
        contexto
      );
      permisoIds = validacionPermisos.permisoIds;
    }

    const { data: rolActualizado, error: updateError } = await supabaseAdmin
      .from("roles")
      .update({
        nombre: texto(nombre),
        descripcion,
        activo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rolId)
      .eq("empresa_id", contexto.empresaId)
      .eq("condominio_id", condominioId)
      .select(
        "id, empresa_id, condominio_id, nombre, descripcion, es_sistema, activo, created_at, updated_at"
      )
      .single();

    if (updateError || !rolActualizado) {
      throw new Error(
        `No fue posible actualizar el rol: ${updateError?.message || "error desconocido"}`
      );
    }

    if (permisoIds !== null) {
      const { data: permisosAnteriores, error: anterioresError } =
        await supabaseAdmin
          .from("roles_permisos")
          .select("permiso_id")
          .eq("rol_id", rolId);

      if (anterioresError) {
        throw new Error(
          `No fue posible respaldar los permisos anteriores: ${anterioresError.message}`
        );
      }

      const permisoIdsAnteriores = (permisosAnteriores || []).map((item) =>
        Number(item.permiso_id)
      );

      const { error: deleteError } = await supabaseAdmin
        .from("roles_permisos")
        .delete()
        .eq("rol_id", rolId);

      if (deleteError) {
        throw new Error(`No fue posible actualizar los permisos: ${deleteError.message}`);
      }

      if (permisoIds.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from("roles_permisos")
          .insert(
            permisoIds.map((permisoId) => ({
              rol_id: rolId,
              permiso_id: permisoId,
            }))
          );

        if (insertError) {
          if (permisoIdsAnteriores.length > 0) {
            await supabaseAdmin.from("roles_permisos").insert(
              permisoIdsAnteriores.map((permisoId) => ({
                rol_id: rolId,
                permiso_id: permisoId,
              }))
            );
          }

          throw new Error(
            `No fue posible guardar los nuevos permisos: ${insertError.message}`
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      mensaje: "Rol actualizado correctamente.",
      rol: {
        ...rolActualizado,
        permiso_ids: permisoIds,
        editable: true,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Error inesperado actualizando el rol.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const supabaseAdmin = crearClienteAdmin();

  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Faltan variables de entorno del servidor." },
      { status: 500 }
    );
  }

  try {
    const url = new URL(request.url);
    const condominioId = Number(url.searchParams.get("condominio_id"));
    const rolId = Number(url.searchParams.get("rol_id"));

    if (!Number.isInteger(condominioId) || condominioId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Debe indicar un condominio_id válido." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(rolId) || rolId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Debe indicar un rol_id válido." },
        { status: 400 }
      );
    }

    const autorizacion = await validarContexto(
      request,
      supabaseAdmin,
      condominioId
    );
    if (autorizacion.ok === false) return autorizacion.response;

    const contexto = autorizacion.contexto;
    await obtenerRolEditable(supabaseAdmin, rolId, contexto);

    const { count, error: usuariosError } = await supabaseAdmin
      .from("usuarios_roles")
      .select("id", { count: "exact", head: true })
      .eq("rol_id", rolId)
      .eq("empresa_id", contexto.empresaId)
      .eq("condominio_id", condominioId)
      .eq("activo", true);

    if (usuariosError) {
      throw new Error(
        `No fue posible validar los usuarios del rol: ${usuariosError.message}`
      );
    }

    if ((count || 0) > 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El rol tiene usuarios activos asignados. Inactive o reasigne esos usuarios antes de eliminarlo.",
        },
        { status: 409 }
      );
    }

    const { error: permisosDeleteError } = await supabaseAdmin
      .from("roles_permisos")
      .delete()
      .eq("rol_id", rolId);

    if (permisosDeleteError) {
      throw new Error(
        `No fue posible eliminar los permisos del rol: ${permisosDeleteError.message}`
      );
    }

    const { error: rolDeleteError } = await supabaseAdmin
      .from("roles")
      .delete()
      .eq("id", rolId)
      .eq("empresa_id", contexto.empresaId)
      .eq("condominio_id", condominioId);

    if (rolDeleteError) {
      throw new Error(`No fue posible eliminar el rol: ${rolDeleteError.message}`);
    }

    return NextResponse.json({
      ok: true,
      mensaje: "Rol eliminado correctamente.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Error inesperado eliminando el rol." },
      { status: 500 }
    );
  }
}
