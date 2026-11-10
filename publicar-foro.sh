#!/bin/sh
set -e
cd "$(dirname "$0")"

rm -rf foro-publico
mkdir foro-publico
cp web/foro.html foro-publico/index.html
cp web/cuenta.js foro-publico/cuenta.js
cp web/trabajo.js web/obrero.js web/vista-previa-foro.png foro-publico/

cp web/comun.css web/pintar.js foro-publico/
cp -r web/fuentes foro-publico/fuentes

cp web/favicon.svg web/favicon.ico web/apple-touch-icon.png foro-publico/

fecha=$(git log -1 --format=%cs -- web/foro.html 2>/dev/null || date +%F)

cat > foro-publico/robots.txt <<'FIN'
User-agent: *
Allow: /

Sitemap: https://foro.fal-lang.org/sitemap.xml
FIN

cat > foro-publico/sitemap.xml <<FIN
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://foro.fal-lang.org/</loc><lastmod>$fecha</lastmod></url>
</urlset>
FIN

politica=$(node web/cabeceras.mjs foro-publico/index.html)

cat > foro-publico/_headers <<FIN
/*
  Content-Security-Policy: $politica
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
FIN

npx wrangler pages deploy foro-publico --project-name fal-foro --commit-dirty=true
