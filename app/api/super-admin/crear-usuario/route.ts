import { NextResponse } from "next/server";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const NOMBRES_ROL_REPRESENTANTE = [
  "Representante del Condominio",
  "Administrador General",
  "Administrador del Condominio",
];

type CrearRepresentanteBody = {
  condominio_id?: number | string;
  nombre?: string;
  email?: string;
  password?: string;
  telefono?: string | null;
  rol_id?: number | string | null;
};

type CambiarEstadoBody = {
  acceso_id?: number | string;
  activo?: boolean;
};

type RollbackAction = () => Promise<void>;

function textoNormalizado(valor: unknown) {
  return String(valor ?? "").trim();
}

function normalizarComparacion(valor: unknown) {
  return textoNormalizado(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function esRolRepresentante(valor: unknown) {
  const normalizado = normalizarComparacion(valor);
  return NOMBRES_ROL_REPRESENTANTE.some(
    (nombre) => normalizarComparacion(nombre) === normalizado
  );
}

function esEstadoBloqueado(estado: unknown) {
  return ["suspendido", "bloqueado", "inactivo", "cancelado"].includes(
    normalizarComparacion(estado)
  );
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

async function validarFullAdministrador(
  request: Request,
  supabaseAdmin: SupabaseClient
) {
  const token = obtenerBearerToken(request);

  if (!token) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "Sesión de Full Administrador no enviada." },
        { status: 401 }
      ),
    };
  }

  const { data: usuarioData, error: usuarioError } =
    await supabaseAdmin.auth.getUser(token);

  if (usuarioError || !usuarioData.user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "La sesión de Full Administrador no es válida." },
        { status: 401 }
      ),
    };
  }

  const { data: superAdmin, error: superAdminError } = await supabaseAdmin
    .from("super_admins")
    .select("id, nombre, activo")
    .eq("user_id", usuarioData.user.id)
    .eq("activo", true)
    .maybeSingle();

  if (superAdminError || !superAdmin) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "No tiene autorización de Full Administrador." },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true as const,
    user: usuarioData.user,
    superAdmin,
  };
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
      throw new Error(`No fue posible revisar usuarios existentes: ${error.message}`);
    }

    const encontrado = (data.users || []).find(
      (usuario) => String(usuario.email || "").trim().toLowerCase() === email
    );

    if (encontrado) return encontrado;
    if ((data.users || []).length < porPagina) break;
  }

  return null;
}

async function resolverRolRepresentante(
  supabaseAdmin: SupabaseClient,
  empresaId: number,
  rolIdSolicitado?: number | null
) {
  if (rolIdSolicitado) {
    const { data: rol, error } = await supabaseAdmin
      .from("roles")
      .select("id, empresa_id, nombre, activo")
      .eq("id", rolIdSolicitado)
      .eq("empresa_id", empresaId)
      .eq("activo", true)
      .maybeSingle();

    if (error || !rol) {
      throw new Error("El rol seleccionado no existe o no pertenece a la empresa.");
    }

    if (!esRolRepresentante(rol.nombre)) {
      throw new Error(
        "El Full Administrador solo puede crear el representante principal del condominio."
      );
    }

    return rol;
  }

  const { data: roles, error } = await supabaseAdmin
    .from("roles")
    .select("id, empresa_id, nombre, activo")
    .eq("empresa_id", empresaId)
    .eq("activo", true)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`No fue posible cargar los roles de la empresa: ${error.message}`);
  }

  for (const nombrePreferido of NOMBRES_ROL_REPRESENTANTE) {
    const encontrado = (roles || []).find(
      (rol) =>
        normalizarComparacion(rol.nombre) ===
        normalizarComparacion(nombrePreferido)
    );

    if (encontrado) return encontrado;
  }

  throw new Error(
    "No existe un rol activo para el representante. Cree primero “Representante del Condominio” o “Administrador General”."
  );
}

async function ejecutarRollback(acciones: RollbackAction[]) {
  for (const accion of [...acciones].reverse()) {
    try {
      await accion();
    } catch (error) {
      console.error("No fue posible completar una acción de reversión:", error);
    }
  }
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

  const autorizacion = await validarFullAdministrador(request, supabaseAdmin);
  if (!autorizacion.ok) return autorizacion.response;

  const { data: accesos, error: accesosError } = await supabaseAdmin
    .from("usuarios_condominios")
    .select(
      "id, user_id, empresa_id, condominio_id, rol_condominio, activo, created_at"
    )
    .order("id", { ascending: false });

  if (accesosError) {
    return NextResponse.json(
      {
        ok: false,
        error: `No fue posible cargar los representantes: ${accesosError.message}`,
      },
      { status: 400 }
    );
  }

  const accesosRepresentantes = (accesos || []).filter((item) =>
    esRolRepresentante(item.rol_condominio)
  );

  const userIds = Array.from(
    new Set(accesosRepresentantes.map((item) => String(item.user_id)))
  );
  const condominioIds = Array.from(
    new Set(accesosRepresentantes.map((item) => Number(item.condominio_id)))
  );

  const [usuariosResultado, condominiosResultado] = await Promise.all([
    userIds.length
      ? supabaseAdmin
          .from("usuarios_empresas")
          .select("id, user_id, empresa_id, nombre_usuario, correo, rol_global, activo")
          .in("user_id", userIds)
      : Promise.resolve({ data: [], error: null }),
    condominioIds.length
      ? supabaseAdmin
          .from("condominios")
          .select("id, nombre, estado, activa")
          .in("id", condominioIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (usuariosResultado.error || condominiosResultado.error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          usuariosResultado.error?.message ||
          condominiosResultado.error?.message ||
          "No fue posible completar el listado.",
      },
      { status: 400 }
    );
  }

  const usuarioPorClave = new Map<string, any>();
  (usuariosResultado.data || []).forEach((item: any) => {
    usuarioPorClave.set(`${item.user_id}:${item.empresa_id}`, item);
  });

  const condominioPorId = new Map<number, any>();
  (condominiosResultado.data || []).forEach((item: any) => {
    condominioPorId.set(Number(item.id), item);
  });

  const representantes = accesosRepresentantes.map((acceso: any) => {
    const usuario = usuarioPorClave.get(
      `${acceso.user_id}:${acceso.empresa_id}`
    );
    const condominio = condominioPorId.get(Number(acceso.condominio_id));

    return {
      acceso_id: Number(acceso.id),
      user_id: acceso.user_id,
      usuario_empresa_id: usuario?.id ? Number(usuario.id) : null,
      empresa_id: Number(acceso.empresa_id),
      condominio_id: Number(acceso.condominio_id),
      condominio: condominio?.nombre || `Condominio ${acceso.condominio_id}`,
      condominio_estado: condominio?.estado || null,
      condominio_activo: condominio?.activa !== false,
      nombre: usuario?.nombre_usuario || "Usuario sin nombre",
      correo: usuario?.correo || null,
      rol_global: usuario?.rol_global || null,
      rol_condominio: acceso.rol_condominio,
      activo: acceso.activo === true,
      created_at: acceso.created_at,
    };
  });

  return NextResponse.json({ ok: true, representantes });
}

export async function POST(request: Request) {
  const supabaseAdmin = crearClienteAdmin();
  const rollback: RollbackAction[] = [];
  let usuarioAuthFueCreado = false;
  let usuarioId = "";

  try {
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

    const autorizacion = await validarFullAdministrador(request, supabaseAdmin);
    if (!autorizacion.ok) return autorizacion.response;

    const body = (await request.json()) as CrearRepresentanteBody;
    const condominioId = Number(body.condominio_id);
    const nombre = textoNormalizado(body.nombre);
    const email = textoNormalizado(body.email).toLowerCase();
    const password = String(body.password || "");
    const telefono = textoNormalizado(body.telefono) || null;
    const rolIdSolicitado = body.rol_id ? Number(body.rol_id) : null;

    if (!Number.isInteger(condominioId) || condominioId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Debe seleccionar un condominio válido." },
        { status: 400 }
      );
    }

    if (!nombre || !email || !password) {
      return NextResponse.json(
        { ok: false, error: "Debe completar nombre, correo y clave temporal." },
        { status: 400 }
      );
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { ok: false, error: "El correo electrónico no tiene un formato válido." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "La clave temporal debe tener al menos 8 caracteres." },
        { status: 400 }
      );
    }

    const { data: condominio, error: condominioError } = await supabaseAdmin
      .from("condominios")
      .select("id, client_id, empresa_id, sucursal_id, nombre, activa, estado")
      .eq("id", condominioId)
      .maybeSingle();

    if (condominioError || !condominio) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se encontró el condominio seleccionado: " +
            (condominioError?.message || "verifique el ID."),
        },
        { status: 400 }
      );
    }

    if (!condominio.empresa_id || !condominio.client_id) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El condominio debe tener empresa_id y client_id antes de crear su representante.",
        },
        { status: 409 }
      );
    }

    if (condominio.activa === false || esEstadoBloqueado(condominio.estado)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se puede crear el representante porque el condominio está inactivo, suspendido, bloqueado o cancelado.",
        },
        { status: 409 }
      );
    }

    const empresaId = Number(condominio.empresa_id);
    const clientId = Number(condominio.client_id);
    const rol = await resolverRolRepresentante(
      supabaseAdmin,
      empresaId,
      rolIdSolicitado
    );

    const usuarioExistente = await buscarUsuarioAuthPorEmail(supabaseAdmin, email);

    if (usuarioExistente) {
      usuarioId = usuarioExistente.id;
    } else {
      const { data: creado, error: crearError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            nombre,
            telefono,
            tipo_usuario: "representante_condominio",
            condominio_id: condominioId,
            condominio_nombre: condominio.nombre,
            empresa_id: empresaId,
            requiere_cambio_clave: true,
          },
        });

      if (crearError || !creado.user) {
        return NextResponse.json(
          {
            ok: false,
            error:
              crearError?.message ||
              "No se pudo crear el representante en Supabase Auth.",
          },
          { status: 400 }
        );
      }

      usuarioId = creado.user.id;
      usuarioAuthFueCreado = true;
    }

    const [perfilResultado, empresasResultado, accesosResultado, rolResultado] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id, client_id, role, active")
          .eq("id", usuarioId)
          .maybeSingle(),
        supabaseAdmin
          .from("usuarios_empresas")
          .select(
            "id, user_id, empresa_id, nombre_usuario, correo, rol_global, activo"
          )
          .eq("user_id", usuarioId),
        supabaseAdmin
          .from("usuarios_condominios")
          .select(
            "id, user_id, empresa_id, condominio_id, rol_condominio, activo"
          )
          .eq("empresa_id", empresaId)
          .eq("condominio_id", condominioId),
        supabaseAdmin
          .from("usuarios_roles")
          .select("id, user_id, empresa_id, rol_id, activo")
          .eq("user_id", usuarioId)
          .eq("empresa_id", empresaId)
          .eq("rol_id", rol.id)
          .maybeSingle(),
      ]);

    const errorValidacion =
      perfilResultado.error ||
      empresasResultado.error ||
      accesosResultado.error ||
      rolResultado.error;

    if (errorValidacion) {
      throw new Error(`No fue posible validar la estructura SaaS: ${errorValidacion.message}`);
    }

    const perfilExistente = perfilResultado.data;
    const empresasUsuario = empresasResultado.data || [];
    const accesosCondominio = accesosResultado.data || [];
    const asignacionRol = rolResultado.data;

    if (
      perfilExistente?.client_id &&
      Number(perfilExistente.client_id) !== clientId
    ) {
      throw new Error(
        "El correo ya pertenece a otro cliente SaaS y no puede reutilizarse en este condominio."
      );
    }

    const empresaDistintaActiva = empresasUsuario.find(
      (item: any) => item.activo === true && Number(item.empresa_id) !== empresaId
    );

    if (empresaDistintaActiva) {
      throw new Error(
        "El usuario ya tiene una empresa activa diferente. El login actual admite una sola empresa activa por usuario."
      );
    }

    const otroRepresentante = accesosCondominio.find(
      (item: any) =>
        item.activo === true &&
        item.user_id !== usuarioId &&
        esRolRepresentante(item.rol_condominio)
    );

    if (otroRepresentante) {
      throw new Error(
        "Este condominio ya tiene un representante principal activo. Inactívelo o transfiera la representación antes de crear otro."
      );
    }

    if (perfilExistente) {
      rollback.push(async () => {
        await supabaseAdmin
          .from("profiles")
          .update({
            client_id: perfilExistente.client_id,
            role: perfilExistente.role,
            active: perfilExistente.active,
          })
          .eq("id", usuarioId);
      });

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ client_id: clientId, role: "ADMIN", active: true })
        .eq("id", usuarioId);

      if (error) throw new Error(`No se pudo actualizar profiles: ${error.message}`);
    } else {
      const { error } = await supabaseAdmin.from("profiles").insert({
        id: usuarioId,
        client_id: clientId,
        role: "ADMIN",
        active: true,
      });

      if (error) throw new Error(`No se pudo registrar profiles: ${error.message}`);

      rollback.push(async () => {
        await supabaseAdmin.from("profiles").delete().eq("id", usuarioId);
      });
    }

    const empresaActual = empresasUsuario.find(
      (item: any) => Number(item.empresa_id) === empresaId
    );

    let usuarioEmpresaId: number;

    if (empresaActual) {
      rollback.push(async () => {
        await supabaseAdmin
          .from("usuarios_empresas")
          .update({
            nombre_usuario: empresaActual.nombre_usuario,
            correo: empresaActual.correo,
            rol_global: empresaActual.rol_global,
            activo: empresaActual.activo,
          })
          .eq("id", empresaActual.id);
      });

      const { data, error } = await supabaseAdmin
        .from("usuarios_empresas")
        .update({
          nombre_usuario: nombre,
          correo: email,
          rol_global: rol.nombre,
          activo: true,
        })
        .eq("id", empresaActual.id)
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(
          `No se pudo actualizar usuarios_empresas: ${error?.message || "sin detalle"}`
        );
      }

      usuarioEmpresaId = Number(data.id);
    } else {
      const { data, error } = await supabaseAdmin
        .from("usuarios_empresas")
        .insert({
          user_id: usuarioId,
          empresa_id: empresaId,
          nombre_usuario: nombre,
          correo: email,
          rol_global: rol.nombre,
          activo: true,
        })
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(
          `No se pudo registrar usuarios_empresas: ${error?.message || "sin detalle"}`
        );
      }

      usuarioEmpresaId = Number(data.id);
      rollback.push(async () => {
        await supabaseAdmin.from("usuarios_empresas").delete().eq("id", data.id);
      });
    }

    const accesoActual = accesosCondominio.find(
      (item: any) => item.user_id === usuarioId
    );

    let usuarioCondominioId: number;

    if (accesoActual) {
      rollback.push(async () => {
        await supabaseAdmin
          .from("usuarios_condominios")
          .update({
            rol_condominio: accesoActual.rol_condominio,
            activo: accesoActual.activo,
          })
          .eq("id", accesoActual.id);
      });

      const { data, error } = await supabaseAdmin
        .from("usuarios_condominios")
        .update({ rol_condominio: rol.nombre, activo: true })
        .eq("id", accesoActual.id)
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(
          `No se pudo actualizar usuarios_condominios: ${error?.message || "sin detalle"}`
        );
      }

      usuarioCondominioId = Number(data.id);
    } else {
      const { data, error } = await supabaseAdmin
        .from("usuarios_condominios")
        .insert({
          user_id: usuarioId,
          empresa_id: empresaId,
          condominio_id: condominioId,
          rol_condominio: rol.nombre,
          activo: true,
        })
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(
          `No se pudo registrar usuarios_condominios: ${error?.message || "sin detalle"}`
        );
      }

      usuarioCondominioId = Number(data.id);
      rollback.push(async () => {
        await supabaseAdmin.from("usuarios_condominios").delete().eq("id", data.id);
      });
    }

    let usuarioRolId: number;

    if (asignacionRol) {
      rollback.push(async () => {
        await supabaseAdmin
          .from("usuarios_roles")
          .update({ activo: asignacionRol.activo })
          .eq("id", asignacionRol.id);
      });

      const { data, error } = await supabaseAdmin
        .from("usuarios_roles")
        .update({ activo: true })
        .eq("id", asignacionRol.id)
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(
          `No se pudo actualizar usuarios_roles: ${error?.message || "sin detalle"}`
        );
      }

      usuarioRolId = Number(data.id);
    } else {
      const { data, error } = await supabaseAdmin
        .from("usuarios_roles")
        .insert({
          user_id: usuarioId,
          empresa_id: empresaId,
          rol_id: rol.id,
          activo: true,
        })
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(
          `No se pudo registrar usuarios_roles: ${error?.message || "sin detalle"}`
        );
      }

      usuarioRolId = Number(data.id);
      rollback.push(async () => {
        await supabaseAdmin.from("usuarios_roles").delete().eq("id", data.id);
      });
    }

    return NextResponse.json({
      ok: true,
      mensaje: usuarioAuthFueCreado
        ? "Representante principal creado correctamente."
        : "El usuario existente fue asociado como representante principal.",
      usuario_auth_creado: usuarioAuthFueCreado,
      requiere_cambio_clave: usuarioAuthFueCreado,
      user_id: usuarioId,
      email,
      nombre,
      telefono,
      empresa_id: empresaId,
      condominio_id: condominioId,
      condominio: condominio.nombre,
      rol_id: Number(rol.id),
      rol: rol.nombre,
      usuario_empresa_id: usuarioEmpresaId,
      usuario_condominio_id: usuarioCondominioId,
      usuario_rol_id: usuarioRolId,
      creado_por: autorizacion.user.id,
    });
  } catch (error) {
    await ejecutarRollback(rollback);

    if (usuarioAuthFueCreado && usuarioId && supabaseAdmin) {
      await supabaseAdmin.auth.admin.deleteUser(usuarioId);
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado creando el representante principal.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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

  const autorizacion = await validarFullAdministrador(request, supabaseAdmin);
  if (!autorizacion.ok) return autorizacion.response;

  const body = (await request.json()) as CambiarEstadoBody;
  const accesoId = Number(body.acceso_id);

  if (!Number.isInteger(accesoId) || accesoId <= 0 || typeof body.activo !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "Debe indicar acceso_id y el nuevo estado activo." },
      { status: 400 }
    );
  }

  const { data: acceso, error: accesoError } = await supabaseAdmin
    .from("usuarios_condominios")
    .select("id, user_id, empresa_id, condominio_id, rol_condominio, activo")
    .eq("id", accesoId)
    .maybeSingle();

  if (accesoError || !acceso || !esRolRepresentante(acceso.rol_condominio)) {
    return NextResponse.json(
      { ok: false, error: "No se encontró el acceso del representante." },
      { status: 404 }
    );
  }

  const { error: actualizarError } = await supabaseAdmin
    .from("usuarios_condominios")
    .update({ activo: body.activo })
    .eq("id", accesoId);

  if (actualizarError) {
    return NextResponse.json(
      {
        ok: false,
        error: `No se pudo actualizar el acceso: ${actualizarError.message}`,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    acceso_id: accesoId,
    activo: body.activo,
    actualizado_por: autorizacion.user.id,
  });
}
