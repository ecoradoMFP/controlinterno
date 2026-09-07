import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Next.js compara el header `Origin` de cada Server Action contra el host que ve el
      // servidor y rechaza el request si no coinciden (protección CSRF). Con el port-forward
      // de VS Code el navegador manda `Origin: localhost:3000` (VS Code hace que el puerto
      // remoto "se sienta local"), pero el túnel además agrega `x-forwarded-host` con el
      // dominio público de devtunnels — y Next.js prioriza ese header sobre el Host real, así
      // que compara mal y rechaza el request (confirmado en los logs de `next dev`). Se
      // permiten ambos orígenes: el que realmente manda el navegador (localhost:3000) y el
      // dominio del túnel (comodín porque VS Code genera un subdominio nuevo cada vez), por si
      // alguien accede directo a la URL de devtunnels en vez de a través del forward local.
      allowedOrigins: ["localhost:3000", "127.0.0.1:3000", "**.devtunnels.ms"],
    },
  },
};

export default nextConfig;
