# Plantillas de marca — PowerPoint ( oral)

Para charlas y presentaciones  : tres variantes del mismo sistema visual.
Todas usan los assets canónicos del brand kit (settled, ambiente night aprobado) generados desde la fuente; nada está redibujado a mano.

## Archivos

Siete variantes, una por superficie de la paleta aprobada (`docs/logo.md` §3):

| Archivo | Fondo | Texto / acento | Cuándo usarlo |
|---|---|---|---|
| `plantilla-night.pptx` | night + ambiente aprobado | oro `#c9a84c` / teal | Charla principal, salas oscuras: **default de marca** |
| `plantilla-light.pptx` | blanco | azul profundo / teal oscuro | Proyector con luz ambiente, aulas, impresión |
| `plantilla-teal.pptx` | claro `#f4fefd` (teal invertida) | teal oscuro `#00706a` / acento `#00948e` | Identidad teal sobre fondo claro, legible (AA) |
| `plantilla-gold.pptx` | gradiente oro `#c9a84c` → ámbar `#d99a2b` (120°) | night / azul profundo | Statement de alto impacto, pitch comercial |
| `plantilla-deep.pptx` | azul profundo `#16324f` | luz / oro y teal | Ejecutiva, boardroom, datos serios |
| `plantilla-papel.pptx` | papel cálido `#f6f1e6` | oro profundo / teal | Editorial, premio, handout elegante |
| `plantilla-coral.pptx` | gradiente salmón `#ffb3a0` → `#ff8a70` (135°) | night | Energía, launch, announcement |

## Cómo se usar

1. Abrí la plantilla y elegí **Archivo > Duplicar** (así nunca sobrescribís el original).
2. Cada slide ya está compuesta con su layout: reemplazá el texto de ejemplo por el tuyo. Para sumar slides, **duplicá una existente** del mismo tipo (clic derecho > Duplicar diapositiva) en lugar de crear una blanca.
3. Recién al final, borrá la slide «Guía de marca» (la chuleta con reglas y paleta).

## Previews

Cada variante tiene su hoja de contactos renderizada (11 slides por cuadrícula) en `preview/<variante>.png`:
`night`, `light`, `teal`, `gold`, `deep`, `papel`, `coral`.

## Tokens (los mismos que el manual, adaptados a PPT)

| Token | Valor | Nota |
|---|---|---|
| Fondo night | `#050810` + ambiente `#0b1120→#050810` | es una imagen en el master: no reemplazar por color plano |
| Oro (títulos) | `#c9a84c` | idem `--gold` |
| Texto body night | `#e9e6dc` | blanco cálido, por contraste AA sobre night |
| Teal | `#00c9c0` | acento; en su variante también es fondo |
| Tipografía | **Inter** | gratis (rsms.me/inter); tema declara fallback a Segoe UI/Arial |

## Decisiones ya resueltas por el sistema (no improvisar)

- El mark default es el **settled** (sin constelación). El full es variante de contexto excepcional.
- El acabado night (bloom) **nunca sobre blanco**: en la variante light el mark lleva su acabado light.
- El teal como fondo es para slides de impacto de la variante teal; el texto largo siempre en `#050810` o blanco, nunca oro sobre teal.
- Fuentes: tamaño mínimo de body 18pt; título 40pt.

## Detalle técnico

- Generadas con `officecli` sobre un deck en blanco; assets derivados con transparencia real (16:9, 3840×2160) desde `assets/logo/` (fuente canónica, tag `v1.3.0`).
- Regeneración: `node templates/ppt/build_templates.ts [night|light|teal|gold|deep|papel|coral]` (sin argumento = las siete) — Node 22+, sin dependencias nuevas. Requiere `officecli` en el PATH y `rsvg-convert` si regenerás los PNG de `assets/`.
- El deck maestro conserva speaker notes con instrucciones en cada slide.
