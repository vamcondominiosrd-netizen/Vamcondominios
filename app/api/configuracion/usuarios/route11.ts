import { NextResponse } from "next/server";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ROLES_ADMINISTRACION = [
  "representante del condominio",
  "administrador general",
  "administrador del condominio",
  "administrador",
];

type ContextoAutorizado = {
  userId: string;
  empresaId: number;
  condominioId: number;
  clientId: number | null;
  esAdministradorPrincipal: boolean;
  permisosUsuario: Set<string>;
};

type CrearUsuarioBody = {
  condominio_id?: number | string;
  nombre?: string;
  email?: string;
  password?: string;
  telefono?: string | null;
  rol_ids?: Array<number | string>;
};

type ActualizarUsuarioBody = {
  condominio_id?: number | string;
  user_id?: string;
  activo?: boolean;
  rol_ids?: Array<number | string>;
  nombre?: string;
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

function permisoRequerido(method: string, body?: ActualizarUsuarioBody) {
  if (method === "GET") return "usuarios.ver";
  if (method === "POST") return "usuarios.crear";

  if (method === "PATCH") {
    if (typeof body?.activo === "boolean") return "usuarios.inactivar";
    return "usuarios.editar";
  }

  return "";
}

async function buscarUsuarioAuthPorEmail(
  supabaseAdmin: SupabaseClient,
  email: string
): Promise<User | null> {
  const porPagina = 200;

  for (let pagina = 1; pagina <= 50; pagina += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: pagina,
      perPage: porPagina,
    });

    if (error) {
      throw new Error(
        `No fue posible revisar los usuarios existentes: ${error.message}`
      );
    }

    const encontrado = (data.users || []).find(
      (usuario) =>
        String(usuario.email || "").trim().toLowerCase() === email
    );

    if (encontrado) return encontrado;
    if ((data.users || []).length < porPagina) break;
  }

  return null;
}

async function obtenerPermisosYRolesUsuario(
  supabaseAdmin: SupabaseClient,
  userId: string,
  empresaId: number,
  condominioId: number
) {
  const { data: asignaciones, error: asignacionesError } = await supabaseAdmin
    .from("usuarios_roles")
    .select("rol_id, condominio_id, activo")
    .eq("user_id", userId)
    .eq("empresa_id", empresaId)
    .eq("activo", true)
    .or(`condominio_id.is.null,condominio_id.eq.${condominioId}`);

  if (asignacionesError) {
    throw new Error(
      `No fue posible validar los roles del usuario: ${asignacionesError.message}`
    );
  }

  const rolIds = Array.from(
    new Set(
      (asignaciones || [])
        .map((item) => Number(item.rol_id))
        .filter(Boolean)
    )
  );

  const nombresRoles: string[] = [];
  const permisosUsuario = new Set<string>();

  if (rolIds.length === 0) {
    return { nombresRoles, permisosUsuario };
  }

  const { data: roles, error: rolesError } = await supabaseAdmin
    .from("roles")
    .select("id, nombre, empresa_id, condominio_id, activo")
    .in("id", rolIds)
    .eq("empresa_id", empresaId)
    .eq("activo", true);

  if (rolesError) {
    throw new Error(`No fue posible validar los roles: ${rolesError.message}`);
  }

  const rolesValidos = (roles || []).filter(
    (rol) =>
      rol.condominio_id === null ||
      Number(rol.condominio_id) === condominioId
  );

  rolesValidos.forEach((rol) => nombresRoles.push(String(rol.nombre || "")));

  const rolesValidosIds = rolesValidos.map((rol) => Number(rol.id));

  if (rolesValidosIds.length === 0) {
    return { nombresRoles, permisosUsuario };
  }

  const { data: relaciones, error: relacionesError } = await supabaseAdmin
    .from("roles_permisos")
    .select("permiso_id")
    .in("rol_id", rolesValidosIds);

  if (relacionesError) {
    throw new Error(
      `No fue posible validar los permisos: ${relacionesError.message}`
    );
  }

  const permisoIds = Array.from(
    new Set(
      (relaciones || [])
        .map((item) => Number(item.permiso_id))
        .filter(Boolean)
    )
  );

  if (permisoIds.length === 0) {
    return { nombresRoles, permisosUsuario };
  }

  const { data: permisos, error: permisosError } = await supabaseAdmin
    .from("permisos")
    .select("codigo, activo")
    .in("id", permisoIds)
    .eq("activo", true);

  if (permisosError) {
    throw new Error(
      `No fue posible cargar los permisos: ${permisosError.message}`
    );
  }

  (permisos || []).forEach((permiso) => {
    const codigo = texto(permiso.codigo);
    if (codigo) permisosUsuario.add(codigo);
  });

  return { nombresRoles, permisosUsuario };
}

async function validarContexto(
  request: Request,
  supabaseAdmin: SupabaseClient,
  condominioId: number,
  body?: ActualizarUsuarioBody
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
    .select("id, client_id, empresa_id, activa, estado")
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

  try {
    const { nombresRoles, permisosUsuario } =
      await obtenerPermisosYRolesUsuario(
        supabaseAdmin,
        authData.user.id,
        empresaId,
        condominioId
      );

    const esAdministradorPrincipal = [
      empresaUsuario.rol_global,
      accesoCondominio.rol_condominio,
      ...nombresRoles,
    ].some(esRolAdministrador);

    const requerido = permisoRequerido(request.method, body);

    if (
      !esAdministradorPrincipal &&
      requerido &&
      !permisosUsuario.has(requerido)
    ) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            ok: false,
            error: `No tiene el permiso requerido: ${requerido}.`,
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
        clientId: condominio.client_id
          ? Number(condominio.client_id)
          : null,
        esAdministradorPrincipal,
        permisosUsuario,
      },
    };
  } catch (error) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "No fue posible validar los permisos.",
        },
        { status: 400 }
      ),
    };
  }
}

async function validarRolesSolicitados(
  supabaseAdmin: SupabaseClient,
  contexto: ContextoAutorizado,
  entrada: Array<number | string> | undefined
) {
  const rolIds = Array.from(
    new Set(
      (entrada || [])
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );

  if (rolIds.length === 0) {
    throw new Error("Debe seleccionar al menos un rol.");
  }

  const { data: roles, error } = await supabaseAdmin
    .from("roles")
    .select("id, empresa_id, condominio_id, nombre, activo")
    .in("id", rolIds)
    .eq("empresa_id", contexto.empresaId)
    .eq("activo", true);

  if (error) {
    throw new Error(`No fue posible validar los roles: ${error.message}`);
  }

  const rolesValidos = (roles || []).filter(
    (rol) =>
      rol.condominio_id === null ||
      Number(rol.condominio_id) === contexto.condominioId
  );

  if (rolesValidos.length !== rolIds.length) {
    throw new Error(
      "Uno o varios roles no pertenecen a la empresa o al condominio activo."
    );
  }

  if (!contexto.esAdministradorPrincipal) {
    for (const rol of rolesValidos) {
      const { nombresRoles, permisosUsuario } =
        await obtenerPermisosYRolesUsuario(
          supabaseAdmin,
          contexto.userId,
          contexto.empresaId,
          contexto.condominioId
        );

      void nombresRoles;

      const { data: relaciones, error: relacionesError } = await supabaseAdmin
        .from("roles_permisos")
        .select("permiso_id")
        .eq("rol_id", rol.id);

      if (relacionesError) {
        throw new Error(
          `No fue posible validar los permisos del rol: ${relacionesError.message}`
        );
      }

      const permisoIds = (relaciones || [])
        .map((item) => Number(item.permiso_id))
        .filter(Boolean);

      if (permisoIds.length > 0) {
        const { data: permisosRol, error: permisosError } = await supabaseAdmin
          .from("permisos")
          .select("codigo")
          .in("id", permisoIds)
          .eq("activo", true);

        if (permisosError) {
          throw new Error(
            `No fue posible validar los permisos del rol: ${permisosError.message}`
          );
        }

        const noAutorizados = (permisosRol || []).filter(
          (permiso) => !permisosUsuario.has(texto(permiso.codigo))
        );

        if (noAutorizados.length > 0) {
          throw new Error(
            "No puede asignar un rol con permisos superiores a los que posee."
          );
        }
      }
    }
  }

  return rolesValidos;
}

export async function GET(request: Request) {
  const supabaseAdmin = crearClienteAdmin();

  if (!supabaseAdmin) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const condominioId = Number(url.searchParams.get("condominio_id"));

  if (!Number.isInteger(condominioId) || condominioId <= 0) {
    return NextResponse.json(
      { ok: false, error: "Debe indicar un condominio válido." },
      { status: 400 }
    );
  }

  const autorizacion = await validarContexto(
    request,
    supabaseAdmin,
    condominioId
  );
  if (!autorizacion.ok) return autorizacion.response;

  const contexto = autorizacion.contexto;

  const [accesosResultado, rolesResultado] = await Promise.all([
    supabaseAdmin
      .from("usuarios_condominios")
      .select(
        "id, user_id, empresa_id, condominio_id, rol_condominio, activo, created_at"
      )
      .eq("empresa_id", contexto.empresaId)
      .eq("condominio_id", contexto.condominioId)
      .order("id", { ascending: false }),
    supabaseAdmin
      .from("roles")
      .select(
        "id, empresa_id, condominio_id, nombre, descripcion, es_sistema, activo"
      )
      .eq("empresa_id", contexto.empresaId)
      .eq("activo", true)
      .or(`condominio_id.is.null,condominio_id.eq.${contexto.condominioId}`)
      .order("nombre", { ascending: true }),
  ]);

  if (accesosResultado.error || rolesResultado.error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          accesosResultado.error?.message ||
          rolesResultado.error?.message ||
          "No fue posible cargar usuarios y roles.",
      },
      { status: 400 }
    );
  }

  const accesos = accesosResultado.data || [];
  const userIds = Array.from(
    new Set(accesos.map((item) => String(item.user_id)))
  );

  const [empresasResultado, asignacionesResultado] = await Promise.all([
    userIds.length
      ? supabaseAdmin
          .from("usuarios_empresas")
          .select(
            "id, user_id, empresa_id, nombre_usuario, correo, rol_global, activo"
          )
          .eq("empresa_id", contexto.empresaId)
          .in("user_id", userIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? supabaseAdmin
          .from("usuarios_roles")
          .select("id, user_id, empresa_id, condominio_id, rol_id, activo")
          .eq("empresa_id", contexto.empresaId)
          .in("user_id", userIds)
          .eq("activo", true)
          .or(
            `condominio_id.is.null,condominio_id.eq.${contexto.condominioId}`
          )
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (empresasResultado.error || asignacionesResultado.error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          empresasResultado.error?.message ||
          asignacionesResultado.error?.message ||
          "No fue posible completar el listado de usuarios.",
      },
      { status: 400 }
    );
  }

  const usuariosEmpresa = new Map<string, any>();
  (empresasResultado.data || []).forEach((item: any) => {
    usuariosEmpresa.set(String(item.user_id), item);
  });

  const rolesPorId = new Map<number, any>();
  (rolesResultado.data || []).forEach((item: any) => {
    rolesPorId.set(Number(item.id), item);
  });

  const rolesPorUsuario = new Map<string, any[]>();
  (asignacionesResultado.data || []).forEach((asignacion: any) => {
    const rol = rolesPorId.get(Number(asignacion.rol_id));
    if (!rol) return;

    const clave = String(asignacion.user_id);
    const actuales = rolesPorUsuario.get(clave) || [];
    actuales.push({
      asignacion_id: Number(asignacion.id),
      id: Number(rol.id),
      nombre: rol.nombre,
      condominio_id: rol.condominio_id,
      es_sistema: rol.es_sistema === true,
    });
    rolesPorUsuario.set(clave, actuales);
  });

  const usuarios = accesos.map((acceso: any) => {
    const empresaUsuario = usuariosEmpresa.get(String(acceso.user_id));
    const rolesUsuario = rolesPorUsuario.get(String(acceso.user_id)) || [];

    return {
      acceso_id: Number(acceso.id),
      user_id: String(acceso.user_id),
      nombre: empresaUsuario?.nombre_usuario || "Usuario sin nombre",
      correo: empresaUsuario?.correo || null,
      rol_global: empresaUsuario?.rol_global || null,
      rol_condominio: acceso.rol_condominio || null,
      activo: acceso.activo === true,
      roles: rolesUsuario,
      created_at: acceso.created_at,
    };
  });

  return NextResponse.json({
    ok: true,
    empresa_id: contexto.empresaId,
    condominio_id: contexto.condominioId,
    usuarios,
    roles: rolesResultado.data || [],
  });
}

export async function POST(request: Request) {
  const supabaseAdmin = crearClienteAdmin();
  let authCreado = false;
  let userId = "";

  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as CrearUsuarioBody;
    const condominioId = Number(body.condominio_id);
    const nombre = texto(body.nombre);
    const email = texto(body.email).toLowerCase();
    const password = String(body.password || "");
    const telefono = texto(body.telefono) || null;

    if (!Number.isInteger(condominioId) || condominioId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Debe seleccionar un condominio válido." },
        { status: 400 }
      );
    }

    if (!nombre || !email || !password) {
      return NextResponse.json(
        {
          ok: false,
          error: "Debe completar nombre, correo y clave temporal.",
        },
        { status: 400 }
      );
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { ok: false, error: "El correo electrónico no es válido." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          ok: false,
          error: "La clave temporal debe tener al menos 8 caracteres.",
        },
        { status: 400 }
      );
    }

    const autorizacion = await validarContexto(
      request,
      supabaseAdmin,
      condominioId
    );
    if (!autorizacion.ok) return autorizacion.response;

    const contexto = autorizacion.contexto;
    const roles = await validarRolesSolicitados(
      supabaseAdmin,
      contexto,
      body.rol_ids
    );

    const usuarioExistente = await buscarUsuarioAuthPorEmail(
      supabaseAdmin,
      email
    );

    if (usuarioExistente) {
      userId = usuarioExistente.id;
    } else {
      const { data: creado, error: crearError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            nombre,
            telefono,
            tipo_usuario: "personal_condominio",
            client_id: contexto.clientId,
            empresa_id: contexto.empresaId,
            condominio_id: contexto.condominioId,
            requiere_cambio_clave: true,
          },
        });

      if (crearError || !creado.user) {
        return NextResponse.json(
          {
            ok: false,
            error:
              crearError?.message ||
              "No se pudo crear el usuario en Supabase Auth.",
          },
          { status: 400 }
        );
      }

      userId = creado.user.id;
      authCreado = true;
    }

    const { data: perfilExistente, error: perfilError } = await supabaseAdmin
      .from("profiles")
      .select("id, client_id, role, active")
      .eq("id", userId)
      .maybeSingle();

    if (perfilError) {
      throw new Error(`No se pudo validar el perfil: ${perfilError.message}`);
    }

    /*
     * La pertenencia SaaS se valida con usuarios_empresas.
     * profiles.client_id puede ser creado previamente por un trigger o contener
     * información heredada; por eso no debe bloquear por sí solo un correo nuevo.
     */
    const { data: empresasExistentes, error: empresaConsultaError } =
      await supabaseAdmin
        .from("usuarios_empresas")
        .select("id, empresa_id, activo")
        .eq("user_id", userId);

    if (empresaConsultaError) {
      throw new Error(
        `No se pudo validar la empresa del usuario: ${empresaConsultaError.message}`
      );
    }

    const empresaExistente =
      (empresasExistentes || []).find(
        (item) => Number(item.empresa_id) === contexto.empresaId
      ) || null;

    const empresaAjenaActiva = (empresasExistentes || []).find(
      (item) =>
        item.activo === true &&
        Number(item.empresa_id) !== contexto.empresaId
    );

    if (empresaAjenaActiva) {
      throw new Error(
        "El usuario ya pertenece a otra empresa activa en VAM."
      );
    }

    if (perfilExistente) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          client_id: contexto.clientId,
          role: "USER_VIEW",
          active: true,
        })
        .eq("id", userId);

      if (error) {
        throw new Error(`No se pudo actualizar profiles: ${error.message}`);
      }
    } else {
      const { error } = await supabaseAdmin.from("profiles").insert({
        id: userId,
        client_id: contexto.clientId,
        role: "USER_VIEW",
        active: true,
      });

      if (error) {
        throw new Error(`No se pudo registrar profiles: ${error.message}`);
      }
    }

    if (empresaExistente) {
      const { error } = await supabaseAdmin
        .from("usuarios_empresas")
        .update({
          nombre_usuario: nombre,
          correo: email,
          activo: true,
        })
        .eq("id", empresaExistente.id);

      if (error) {
        throw new Error(
          `No se pudo actualizar usuarios_empresas: ${error.message}`
        );
      }
    } else {
      const { error } = await supabaseAdmin.from("usuarios_empresas").insert({
        user_id: userId,
        empresa_id: contexto.empresaId,
        nombre_usuario: nombre,
        correo: email,
        rol_global: "Usuario Condominio",
        activo: true,
      });

      if (error) {
        throw new Error(
          `No se pudo registrar usuarios_empresas: ${error.message}`
        );
      }
    }

    const { data: accesoExistente, error: accesoConsultaError } =
      await supabaseAdmin
        .from("usuarios_condominios")
        .select("id")
        .eq("user_id", userId)
        .eq("empresa_id", contexto.empresaId)
        .eq("condominio_id", contexto.condominioId)
        .maybeSingle();

    if (accesoConsultaError) {
      throw new Error(
        `No se pudo validar el acceso al condominio: ${accesoConsultaError.message}`
      );
    }

    const rolPrincipal = roles[0];

    if (accesoExistente) {
      const { error } = await supabaseAdmin
        .from("usuarios_condominios")
        .update({
          rol_condominio: rolPrincipal.nombre,
          activo: true,
        })
        .eq("id", accesoExistente.id);

      if (error) {
        throw new Error(
          `No se pudo actualizar usuarios_condominios: ${error.message}`
        );
      }
    } else {
      const { error } = await supabaseAdmin
        .from("usuarios_condominios")
        .insert({
          user_id: userId,
          empresa_id: contexto.empresaId,
          condominio_id: contexto.condominioId,
          rol_condominio: rolPrincipal.nombre,
          activo: true,
        });

      if (error) {
        throw new Error(
          `No se pudo registrar usuarios_condominios: ${error.message}`
        );
      }
    }

    const { error: desactivarError } = await supabaseAdmin
      .from("usuarios_roles")
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("empresa_id", contexto.empresaId)
      .eq("condominio_id", contexto.condominioId);

    if (desactivarError) {
      throw new Error(
        `No se pudieron actualizar los roles anteriores: ${desactivarError.message}`
      );
    }

    for (const rol of roles) {
      const { data: asignacionExistente, error: asignacionConsultaError } =
        await supabaseAdmin
          .from("usuarios_roles")
          .select("id")
          .eq("user_id", userId)
          .eq("empresa_id", contexto.empresaId)
          .eq("condominio_id", contexto.condominioId)
          .eq("rol_id", rol.id)
          .maybeSingle();

      if (asignacionConsultaError) {
        throw new Error(
          `No se pudo validar la asignación del rol: ${asignacionConsultaError.message}`
        );
      }

      if (asignacionExistente) {
        const { error } = await supabaseAdmin
          .from("usuarios_roles")
          .update({
            activo: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", asignacionExistente.id);

        if (error) {
          throw new Error(
            `No se pudo reactivar el rol: ${error.message}`
          );
        }
      } else {
        const { error } = await supabaseAdmin
          .from("usuarios_roles")
          .insert({
            user_id: userId,
            empresa_id: contexto.empresaId,
            condominio_id: contexto.condominioId,
            rol_id: rol.id,
            activo: true,
          });

        if (error) {
          throw new Error(
            `No se pudo asignar el rol: ${error.message}`
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      mensaje: authCreado
        ? "Usuario creado y asociado correctamente."
        : "El usuario existente fue asociado al condominio.",
      user_id: userId,
      nombre,
      email,
      condominio_id: contexto.condominioId,
      roles: roles.map((rol) => ({
        id: Number(rol.id),
        nombre: rol.nombre,
      })),
      requiere_cambio_clave: authCreado,
    });
  } catch (error) {
    if (authCreado && userId && supabaseAdmin) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado creando el usuario.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const supabaseAdmin = crearClienteAdmin();

  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as ActualizarUsuarioBody;
    const condominioId = Number(body.condominio_id);
    const userId = texto(body.user_id);

    if (
      !Number.isInteger(condominioId) ||
      condominioId <= 0 ||
      !userId
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Debe indicar condominio y usuario válidos.",
        },
        { status: 400 }
      );
    }

    const autorizacion = await validarContexto(
      request,
      supabaseAdmin,
      condominioId,
      body
    );
    if (!autorizacion.ok) return autorizacion.response;

    const contexto = autorizacion.contexto;

    if (userId === contexto.userId && body.activo === false) {
      return NextResponse.json(
        {
          ok: false,
          error: "No puede desactivar su propio acceso.",
        },
        { status: 409 }
      );
    }

    const { data: acceso, error: accesoError } = await supabaseAdmin
      .from("usuarios_condominios")
      .select("id, user_id, activo")
      .eq("user_id", userId)
      .eq("empresa_id", contexto.empresaId)
      .eq("condominio_id", contexto.condominioId)
      .maybeSingle();

    if (accesoError || !acceso) {
      return NextResponse.json(
        {
          ok: false,
          error: "El usuario no pertenece al condominio activo.",
        },
        { status: 404 }
      );
    }

    let roles: any[] | null = null;

    if (Array.isArray(body.rol_ids)) {
      roles = await validarRolesSolicitados(
        supabaseAdmin,
        contexto,
        body.rol_ids
      );

      const { error: desactivarError } = await supabaseAdmin
        .from("usuarios_roles")
        .update({ activo: false, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("empresa_id", contexto.empresaId)
        .eq("condominio_id", contexto.condominioId);

      if (desactivarError) {
        throw new Error(
          `No se pudieron actualizar los roles anteriores: ${desactivarError.message}`
        );
      }

      for (const rol of roles) {
        const { data: existente, error: consultaError } = await supabaseAdmin
          .from("usuarios_roles")
          .select("id")
          .eq("user_id", userId)
          .eq("empresa_id", contexto.empresaId)
          .eq("condominio_id", contexto.condominioId)
          .eq("rol_id", rol.id)
          .maybeSingle();

        if (consultaError) {
          throw new Error(
            `No se pudo validar la asignación: ${consultaError.message}`
          );
        }

        if (existente) {
          const { error } = await supabaseAdmin
            .from("usuarios_roles")
            .update({
              activo: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existente.id);

          if (error) {
            throw new Error(`No se pudo activar el rol: ${error.message}`);
          }
        } else {
          const { error } = await supabaseAdmin
            .from("usuarios_roles")
            .insert({
              user_id: userId,
              empresa_id: contexto.empresaId,
              condominio_id: contexto.condominioId,
              rol_id: rol.id,
              activo: true,
            });

          if (error) {
            throw new Error(`No se pudo asignar el rol: ${error.message}`);
          }
        }
      }
    }

    const actualizacionAcceso: Record<string, unknown> = {};

    if (typeof body.activo === "boolean") {
      actualizacionAcceso.activo = body.activo;
    }

    if (roles && roles.length > 0) {
      actualizacionAcceso.rol_condominio = roles[0].nombre;
    }

    if (Object.keys(actualizacionAcceso).length > 0) {
      const { error } = await supabaseAdmin
        .from("usuarios_condominios")
        .update(actualizacionAcceso)
        .eq("id", acceso.id);

      if (error) {
        throw new Error(
          `No se pudo actualizar el acceso: ${error.message}`
        );
      }
    }

    const nombre = texto(body.nombre);

    if (nombre) {
      const { error } = await supabaseAdmin
        .from("usuarios_empresas")
        .update({ nombre_usuario: nombre })
        .eq("user_id", userId)
        .eq("empresa_id", contexto.empresaId);

      if (error) {
        throw new Error(
          `No se pudo actualizar el nombre: ${error.message}`
        );
      }
    }

    return NextResponse.json({
      ok: true,
      mensaje: "Usuario actualizado correctamente.",
      user_id: userId,
      activo:
        typeof body.activo === "boolean" ? body.activo : acceso.activo,
      roles:
        roles?.map((rol) => ({
          id: Number(rol.id),
          nombre: rol.nombre,
        })) || null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado actualizando el usuario.",
      },
      { status: 500 }
    );
  }
}
