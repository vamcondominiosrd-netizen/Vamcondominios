"use client";

import { supabase } from "@/app/lib/supabaseClient";


export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("sotecdom@gmail.com");
  const [password, setPassword] = useState("Vyamarieangeles27!");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) return setMsg(error.message);

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-sm border p-6">
        <h1 className="text-xl font-semibold text-slate-800">Administradora SOTECDOM</h1>
        <p className="text-sm text-slate-500 mt-1">Inicia sesión</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm text-slate-600">Email</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">Contraseña</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </div>

          {msg && (
            <div className="text-sm rounded-xl bg-amber-50 border border-amber-200 p-3 text-slate-700">
              {msg}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-slate-800 text-white py-2 hover:bg-slate-900 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
