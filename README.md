This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Deploy en Cloudflare Pages (SSR + API routes)

Este proyecto usa Next.js (App Router) con rutas API bajo `app/api/*`. Para desplegarlo en Cloudflare Pages se usa `@cloudflare/next-on-pages`.

### Build local

```bash
npm ci
npm run pages:build
```

Nota: `next-on-pages` puede requerir `bash`. En Windows suele ser más estable ejecutarlo en WSL/Linux. En Cloudflare Pages (Linux) no es un problema.

### Previsualización local (Pages)

```bash
npm run pages:dev
```

### Configuración en Cloudflare

En Cloudflare Pages (Build settings):

- Build command: `npm run pages:build`
- Output directory: `.vercel/output/static`

Variables de entorno (Production y Preview):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo servidor; nunca exponer en cliente)

Aviso: `@cloudflare/next-on-pages` muestra un warning de deprecación y recomienda migrar al adaptador OpenNext. Si quieres, puedo migrar este despliegue a OpenNext.
