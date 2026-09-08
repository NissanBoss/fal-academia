#!/bin/sh
# Publica el foro en foro.fal-lang.org.
#
# El foro vive en web/, al lado del curso, porque comparte con el su
# cuenta.js: separarlos en dos repositorios significaria dos copias del
# mismo archivo y, el dia que una cambiara, un foro que no sabe entrar.
#
# Pero se sirve desde su propio dominio, y GitHub Pages admite un solo
# dominio propio por repositorio, el que diga el archivo CNAME. Asi que esto
# arma una carpeta con el foro como index.html y la sube a Cloudflare Pages,
# que es donde ya esta la API. La academia sigue sirviendo el mismo foro en
# /foro.html para no romper ningun enlace de los que ya existen; cual de los
# dos es el bueno lo dice la etiqueta canonica de la propia pagina.
set -e
cd "$(dirname "$0")"

rm -rf foro-publico
mkdir foro-publico
cp web/foro.html foro-publico/index.html
cp web/cuenta.js foro-publico/cuenta.js

# La fecha del ultimo cambio de verdad del foro, no la de esta publicacion.
fecha=$(git log -1 --format=%cs -- web/foro.html 2>/dev/null || date +%F)

cat > foro-publico/robots.txt <<'FIN'
User-agent: *
Allow: /

Sitemap: https://foro.fal-lang.org/sitemap.xml
FIN

# Solo una direccion. Los hilos se pintan detras de una almohadilla, asi que
# no son direcciones que un buscador pueda pedir por su cuenta y ponerlas
# aqui seria mentirle.
cat > foro-publico/sitemap.xml <<FIN
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://foro.fal-lang.org/</loc><lastmod>$fecha</lastmod></url>
</urlset>
FIN

npx wrangler pages deploy foro-publico --project-name fal-foro --commit-dirty=true
