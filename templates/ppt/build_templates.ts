/**
 * Generador de las plantillas PPT de marca (night / light / teal).
 *
 * Corre con Node 22+ (type stripping nativo, sin dependencias):
 *
 *   node templates/ppt/build_templates.ts           # las tres
 *   node templates/ppt/build_templates.ts night     # una sola
 *
 * Cada tema se serializa a un batch JSON de officecli (única dependencia
 * externa: `officecli` en el PATH, https://officecli.ai) y se aplica en una
 * sola pasada atómica (si un ítem falla, el archivo queda como estaba).
 *
 * Los tokens salen del manual (docs/logo.md #3, ambiente night aprobado §3.1)
 * y de la matriz ratificada (docs/composicion.md): default = settled.
 * Los assets en templates/ppt/assets son derivados (SVG canónicos de
 * assets/logo, tag v1.3.0, rasterizados a PNG con transparencia).
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url))); // templates/ppt
const ASSETS = join(OUT, "assets");

/** Lienzo 16:9 en cm (PowerPoint 12192000×6858000 EMU). */
const SW = 33.867;
const SH = 19.05;
const MX = 2.2; // margen lateral
const CW = SW - 2 * MX; // ancho de contenido

/** Nombres de los 5 layouts del master (mismo orden en los tres temas). */
const L: Record<string, string> = {
  blank: "Lienzo libre",
  title: "Portada",
  content: "Contenido",
  two: "Dos columnas",
  titleonly: "Título",
};

type BatchItem = {
  command: "add" | "set";
  parent?: string;
  path?: string;
  type?: string;
  props?: Record<string, string>;
};

type Theme = {
  /** nombre del tema OOXML + master */
  name: string;
  /** esquema de color del tema (dk/lt/accent1-6) */
  colors: Record<string, string>;
  /** fondo del master: `image:<ruta>` o hex plano */
  masterBg: string;
  /** badge del pie de cada slide + su opacidad */
  masterBadge: string;
  badgeOpacity: string;
  title: string; // color de título
  body: string; // color de texto corrido
  muted: string; // color de subtítulos, captions, fuentes
  accent: string; // color de énfasis (números de agenda, cifras)
  lab?: string; // etiquetas (ANTES / DESPUÉS); default = title
  /** mark PNG para portada/cierre */
  mark: string;
  /** placeholder rectángulo del slide de imagen */
  win: string;
  scrim: string;
  captionOnScrim: string;
};

const THEMES: Record<string, Theme> = {
  night: {
    name: "CL Night — Espirángulo",
    colors: {
      dk1: "050810", lt1: "0B1120", dk2: "16324F", lt2: "E9E6DC",
      accent1: "C9A84C", accent2: "00C9C0", accent3: "D99A2B",
      accent4: "FFB49E", accent5: "050810", accent6: "16324F",
    },
    masterBg: `image:${ASSETS}/bg-night-3840x2160.png`,
    masterBadge: `${ASSETS}/badge-white-256.png`,
    badgeOpacity: "0.45",
    title: "C9A84C", body: "E9E6DC", muted: "918E83", accent: "00C9C0",
    mark: `${ASSETS}/mark-settled-night-2048.png`,
    win: "0B1120", scrim: "050810", captionOnScrim: "E9E6DC",
  },
  light: {
    name: "CL Light — Espirángulo",
    colors: {
      dk1: "16324F", lt1: "FFFFFF", dk2: "26251F", lt2: "F4F1EA",
      accent1: "8A5A1C", accent2: "00C9C0", accent3: "16324F",
      accent4: "D99A2B", accent5: "8A5A1C", accent6: "C9A84C",
    },
    masterBg: "FFFFFF",
    masterBadge: `${ASSETS}/badge-night-256.png`,
    badgeOpacity: "0.6",
    title: "16324F", body: "26251F", muted: "6E6A5E",
    accent: "00948E", // teal oscurecido: legible sobre blanco
    lab: "8A5A1C",
    mark: `${ASSETS}/mark-settled-light-2048.png`,
    win: "F4F1EA", scrim: "16324F", captionOnScrim: "E9E6DC",
  },
  teal: {
    name: "CL Teal — Espirángulo (invertida)",
    colors: {
      dk1: "16324F", lt1: "F4FEFD", dk2: "0B1120", lt2: "DFF7F5",
      accent1: "00948E", accent2: "00C9C0", accent3: "00706A",
      accent4: "C9A84C", accent5: "5E7A78", accent6: "16324F",
    },
    // invertida: fondo claro con acento teal (el teal plano #00C9C0 como fondo queda para acentos sólidos)
    masterBg: "F4FEFD",
    masterBadge: `${ASSETS}/badge-night-256.png`,
    badgeOpacity: "0.6",
    title: "00706A", // teal profundo: 5.8:1 sobre fondo claro (el #00C9C0 puro no llega a AA)
    body: "16324F", muted: "5E7A78",
    accent: "00948E", // 3.7:1 — solo para texto grande (cifras, números)
    lab: "00706A",
    mark: `${ASSETS}/mark-settled-light-2048.png`,
    win: "FFFFFF", scrim: "050810", captionOnScrim: "E9E6DC",
  },
  gold: {
    name: "CL Gold — Espirángulo (gradiente)",
    colors: {
      dk1: "050810", lt1: "C9A84C", dk2: "8A5A1C", lt2: "FDF3D7",
      accent1: "050810", accent2: "16324F", accent3: "8A5A1C",
      accent4: "D99A2B", accent5: "050810", accent6: "16324F",
    },
    // gradiente dorado: oro de marca → ámbar, diagonal 120°
    masterBg: "C9A84C-D99A2B-120",
    masterBadge: `${ASSETS}/badge-night-256.png`,
    badgeOpacity: "0.8",
    title: "050810", body: "050810", muted: "4A3D14",
    accent: "16324F", // azul profundo sobre oro: 5.5:1
    lab: "4A3D14",
    mark: `${ASSETS}/mark-mini-night-1024.png`, // C night sobre oro; la C oro no se lee sobre oro
    win: "FDF6DF", scrim: "050810", captionOnScrim: "E9E6DC",
  },
  deep: {
    name: "CL Deep — Espirángulo",
    colors: {
      dk1: "E9E6DC", lt1: "16324F", dk2: "0B1120", lt2: "22405C",
      accent1: "00C9C0", accent2: "C9A84C", accent3: "D99A2B",
      accent4: "FFB49E", accent5: "0B1120", accent6: "9FB3C8",
    },
    masterBg: "16324F",
    masterBadge: `${ASSETS}/badge-white-256.png`,
    badgeOpacity: "0.5",
    title: "C9A84C", body: "E9E6DC", muted: "9FB3C8",
    accent: "00C9C0",
    mark: `${ASSETS}/mark-settled-night-2048.png`, // C oro sobre azul profundo: 5.5:1
    win: "0B1120", scrim: "050810", captionOnScrim: "E9E6DC",
  },
  papel: {
    name: "CL Papel — Espirángulo",
    colors: {
      dk1: "26251F", lt1: "F6F1E6", dk2: "8A5A1C", lt2: "EFE7D6",
      accent1: "8A5A1C", accent2: "00948E", accent3: "16324F",
      accent4: "D99A2B", accent5: "6E6A5E", accent6: "C9A84C",
    },
    masterBg: "F6F1E6",
    masterBadge: `${ASSETS}/badge-night-256.png`,
    badgeOpacity: "0.6",
    title: "8A5A1C", body: "26251F", muted: "6E6A5E",
    accent: "00948E",
    lab: "8A5A1C",
    mark: `${ASSETS}/mark-settled-light-2048.png`,
    win: "FFFFFF", scrim: "16324F", captionOnScrim: "E9E6DC",
  },
  coral: {
    name: "CL Coral — Espirángulo (gradiente salmón)",
    colors: {
      dk1: "050810", lt1: "FFB3A0", dk2: "5C2A20", lt2: "FFD9CF",
      accent1: "050810", accent2: "16324F", accent3: "C9A84C",
      accent4: "8A5A1C", accent5: "5C2A20", accent6: "FFFFFF",
    },
    // gradiente salmón: supernova → coral del espectro estelar, diagonal 135°
    masterBg: "FFB3A0-FF8A70-135",
    masterBadge: `${ASSETS}/badge-night-256.png`,
    badgeOpacity: "0.8",
    title: "050810", body: "050810", muted: "6B2D22",
    accent: "16324F",
    lab: "6B2D22",
    mark: `${ASSETS}/mark-mini-night-1024.png`,
    win: "FFF0EC", scrim: "050810", captionOnScrim: "E9E6DC",
  },
};

type SlideItems = { items: BatchItem[]; n: number };

/** Devuelve los ítems de batch de los 11 slides de un tema. */
function deck(t: Theme, variant: string): BatchItem[] {
  const s: SlideItems = { items: [], n: 0 };
  const T = t.title, B = t.body, MU = t.muted, AC = t.accent;
  const LAB = t.lab ?? t.title;

  const add = (item: BatchItem) => s.items.push(item);

  /** slide + badge de marca en el pie (una imagen no se puede colgar del master) */
  const slide = (layout: string, notes?: string): string => {
    const props: Record<string, string> = { layout };
    if (notes) props.notes = notes;
    add({ command: "add", parent: "/", type: "slide", props });
    s.n += 1;
    const path = `/slide[${s.n}]`;
    add({
      command: "add", parent: path, type: "picture",
      props: {
        src: t.masterBadge, name: "Badge Espirángulo",
        x: "31.7cm", y: "17.3cm", width: "1.2cm", height: "1.2cm",
        opacity: t.badgeOpacity,
      },
    });
    return path;
  };

  /** caja de texto Inter con tamaño y color explícitos (la jerarquía nunca hereda del tema) */
  const box = (
    into: string, text: string, x: number, y: number, w: number, h: number,
    pt: number, color: string, o: { bold?: boolean; align?: string; italic?: boolean; spacing?: string } = {},
  ) => {
    const props: Record<string, string> = {
      text, x: `${x}cm`, y: `${y}cm`, w: `${w}cm`, h: `${h}cm`,
      size: `${pt}pt`, color, align: o.align ?? "left", font: "Inter",
    };
    if (o.bold) props.bold = "true";
    if (o.italic) props.italic = "true";
    if (o.spacing) props.lineSpacing = o.spacing;
    add({ command: "add", parent: into, type: "shape", props });
  };

  const pic = (into: string, src: string, x: number, y: number, w: number, h: number, name?: string) => {
    const props: Record<string, string> = {
      src, x: `${x}cm`, y: `${y}cm`, width: `${w}cm`, height: `${h}cm`,
    };
    if (name) props.name = name;
    add({ command: "add", parent: into, type: "picture", props });
  };

  const rect = (into: string, x: number, y: number, w: number, h: number, fill: string, name?: string, opacity?: string) => {
    const props: Record<string, string> = {
      x: `${x}cm`, y: `${y}cm`, w: `${w}cm`, h: `${h}cm`, fill,
    };
    if (name) props.name = name;
    if (opacity) props.opacity = opacity;
    add({ command: "add", parent: into, type: "shape", props });
  };

  // ---------- 1 Portada ----------
  let sl = slide(L["title"], "Portada: título, subtítulo y tu nombre. Duplicá esta diapositiva para empezar un deck nuevo.");
  let w = 5.8;
  pic(sl, t.mark, (SW - w) / 2, 2.4, w, w, "Mark settled");
  box(sl, "Título de la charla", MX, 9.8, CW, 3.0, 40, T, { bold: true, align: "center" });
  box(sl, "Subtítulo o frase de posicionamiento", MX, 13.3, CW, 1.4, 20, MU, { align: "center" });
  box(sl, "Christian Luciani   ·   evento y fecha", MX, 17.2, CW, 1.0, 13, MU, { align: "center" });

  // ---------- 2 Agenda ----------
  sl = slide(L["content"], "Agenda: 4 capítulos. Para 5+, bajá el paso vertical a 2.6cm.");
  box(sl, "De qué vamos a hablar", MX, 1.7, CW, 1.6, 30, T, { bold: true });
  ["Contexto", "El problema", "La idea", "Qué sigue"].forEach((it, i) => {
    const yy = 5.0 + i * 3.1;
    box(sl, `0${i + 1}`, MX, yy, 2.0, 1.6, 24, AC, { bold: true });
    box(sl, it, MX + 2.4, yy, CW - 2.4, 1.8, 24, B);
  });

  // ---------- 3 Statement ----------
  sl = slide(L["blank"], "El slide de respiración: una sola idea, en grande.");
  box(sl, "La frase que querés que recuerden,\ncon una sola idea en grande.", 3.5, 5.7, SW - 7, 8.6, 40, T, { bold: true, align: "center", spacing: "1.25" });

  // ---------- 4 Sección ----------
  sl = slide(L["blank"], "Divisor de capítulo: cambiá el número y el título.");
  box(sl, "01", MX + 0.4, 5.0, 6.4, 7.2, 110, MU, { bold: true });
  box(sl, "Título de la sección", 9.6, 8.6, SW - 11.8, 2.6, 34, T, { bold: true });

  // ---------- 5 Contenido ----------
  sl = slide(L["content"], "Slide de contenido estándar: título + 3 bullets.");
  box(sl, "Título de la slide", MX, 1.7, CW, 1.6, 30, T, { bold: true });
  box(sl,
    "•  Primer punto: la idea en una línea y su desarrollo en dos renglones.\n\n" +
    "•  Segundo punto: un dato o ejemplo concreto.\n\n" +
    "•  Tercer punto: el cierre que empuja a la próxima slide.",
    MX, 4.8, CW, 11, 19, B, { spacing: "1.3" });

  // ---------- 6 Dato ----------
  sl = slide(L["blank"], "La cifra es el argumento. Una por slide, con su fuente.");
  box(sl, "92%", MX, 4.9, CW, 6.4, 120, T, { bold: true, align: "center" });
  box(sl, "Qué significa la cifra, en una línea clara", MX, 12.4, CW, 1.4, 18, MU, { align: "center" });
  box(sl, "Fuente: estudio o medición, año", MX, 17.5, CW, 0.9, 11, MU, { align: "center" });

  // ---------- 7 Dos columnas ----------
  sl = slide(L["two"], "Antes/después, problema/solución. Máximo 3 líneas por columna.");
  box(sl, "Comparación o contraste", MX, 1.7, CW, 1.6, 30, T, { bold: true });
  box(sl, "ANTES", MX, 4.9, 8, 1.2, 15, LAB, { bold: true });
  box(sl, "Desarrollo de la primera columna:\ndos o tres líneas que sostengan\nel contraste.", MX, 6.6, 13.6, 8, 18, B, { spacing: "1.35" });
  box(sl, "DESPUÉS", SW / 2 + 0.6, 4.9, 8, 1.2, 15, LAB, { bold: true });
  box(sl, "Desarrollo de la segunda columna:\nel cambio, el resultado o la\nconsecuencia.", SW / 2 + 0.6, 6.6, 13.6, 8, 18, B, { spacing: "1.35" });

  // ---------- 8 Cita ----------
  sl = slide(L["blank"], "Deja que respire: reemplazá el texto de la cita y el autor.");
  box(sl, "«", 3.0, 1.0, 3, 3.6, 72, T, { bold: true });
  box(sl, "Texto de la cita: lo que otra persona\n\ndijo y sintetiza el punto.", 3.5, 5.4, SW - 7, 6.5, 28, T, { italic: true, spacing: "1.3" });
  box(sl, "— Nombre del autor, fuente o fecha", 3.5, 13.2, SW - 7, 1.2, 15, MU);

  // ---------- 9 Imagen ----------
  sl = slide(L["blank"], "Imagen envía al fondo (clic derecho > Enviar al fondo). Recorte 16:9.");
  rect(sl, 0, 0, SW, SH, t.win, "Imagen (reemplazar por la tuya)");
  box(sl, "Reemplazá este rectángulo por tu imagen (16:9)\ny enviala al fondo. El caption queda sobre la barra.", 0, 8.4, SW, 3, 16, MU, { align: "center" });
  rect(sl, 0, SH - 3.2, SW, 3.2, t.scrim, "Barra de caption", "0.65");
  box(sl, "Caption de la imagen", MX, SH - 2.5, CW, 0.9, 15, t.captionOnScrim);

  // ---------- 10 Cierre ----------
  sl = slide(L["title"], "Cierre: gracias + contacto.");
  w = 4.4;
  pic(sl, t.mark, (SW - w) / 2, 3.8, w, w, "Mark settled");
  box(sl, "Gracias", MX, 9.6, CW, 2.6, 40, T, { bold: true, align: "center" });
  box(sl, "mail@ejemplo.com   ·   https://github.com/ChristianLuciani", MX, 12.9, CW, 1.2, 15, MU, { align: "center" });

  // ---------- 11 Guía de marca ----------
  sl = slide(L["content"], "Esta diapositiva se borra antes de presentar. Es la chuleta de marca.");
  box(sl, "Guía mínima — borra esta diapositiva antes de presentar", MX, 1.4, CW, 1.4, 24, T, { bold: true });
  const chips: Array<[string, string]> = [
    ["C9A84C", "oro"], ["00C9C0", "teal"], ["050810", "night"], ["D99A2B", "ámbar"],
  ];
  chips.forEach(([hex, label], i) => {
    const cx = MX + i * 3.7;
    add({
      command: "add", parent: sl, type: "shape",
      props: { x: `${cx}cm`, y: "4.0cm", w: "3.1cm", h: "2.3cm", fill: hex, geometry: "roundRect", name: `chip ${label}` },
    });
    box(sl, `#${hex}`, cx, 6.6, 3.1, 0.9, 11, MU, { align: "center" });
    box(sl, label, cx, 7.5, 3.1, 0.9, 12, B, { align: "center" });
  });
  box(sl,
    "Ya resuelto en esta plantilla:\n\n" +
    "•  Mark settled por defecto; el full (constelación) es variante, no default.\n" +
    "•  -light sobre superficie clara; el acabado night nunca sobre blanco.\n" +
    "•  Teal #00C9C0 como acento: máximo una línea o un dato, nunca texto corrido.\n" +
    "•  Fondo night es una imagen aprobada en el master: no cambiar por color plano.\n" +
    "•  Inter como fuente del tema — instalala donde presentes (gratuita, rsms.me/inter).",
    MX, 8.8, CW, 9.4, 15, B, { spacing: "1.35" });

  void variant;
  return s.items;
}

/** Aplica el batch ①grade a officecli y reporta los ítems que fallen. */
function build(variant: string): void {
  const t = THEMES[variant]!;
  const file = join(OUT, `plantilla-${variant}.pptx`);
  rmSync(file, { force: true });

  const r = spawnSync("officecli", ["create", file, "--json"], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`create falló: ${r.stderr}`);
  console.log(`creado ${file}`);

  const items: BatchItem[] = [
    { command: "set", path: "/theme", props: { name: t.name, headingFont: "Inter", bodyFont: "Inter", ...t.colors } },
    { command: "set", path: "/slidemaster[1]", props: { name: `CL ${variant[0]!.toUpperCase()}${variant.slice(1)}`, background: t.masterBg } },
    { command: "set", path: "/slidemaster[1]/slidelayout[1]", props: { name: L["blank"]! } },
    { command: "set", path: "/slidemaster[1]/slidelayout[2]", props: { name: L["title"]! } },
    { command: "set", path: "/slidemaster[1]/slidelayout[3]", props: { name: L["content"]! } },
    { command: "set", path: "/slidemaster[1]/slidelayout[4]", props: { name: L["two"]! } },
    { command: "set", path: "/slidemaster[1]/slidelayout[5]", props: { name: L["titleonly"]! } },
    ...deck(t, variant),
  ];

  const b = spawnSync("officecli", ["batch", file, "--json"], {
    input: JSON.stringify(items), encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
  });
  let res: any;
  try { res = JSON.parse(b.stdout); } catch { console.error(b.stdout.slice(-3000), b.stderr.slice(-1500)); throw new Error("batch: respuesta no-JSON"); }
  const failed = (res?.data?.results ?? []).filter((it: any) => !it.success);
  if (failed.length > 0) {
    for (const it of failed) console.error("FAILED:", JSON.stringify(it).slice(0, 600));
    throw new Error(`batch falló: ${variant}`);
  }
  const ok = (res?.data?.results ?? []).every((it: any) => it.success);
  if (!ok) {
    for (const it of (res?.data?.results ?? []).filter((it: any) => !it.success))
      console.error("FAILED:", JSON.stringify(it).slice(0, 600));
    throw new Error(`batch falló: ${variant}`);
  }
  // volcado explícito: el batch deja el estado en el residente de officecli
  spawnSync("officecli", ["save", file], { encoding: "utf8" });
  spawnSync("officecli", ["close", file], { encoding: "utf8" });

  // verificación sobre el archivo en disco (no sobre el estado del residente)
  const rim = spawnSync("officecli", ["view", file, "stats", "--json"], { encoding: "utf8" });
  const n = JSON.parse(rim.stdout)?.data?.slides ?? 0;
  if (n !== 11) throw new Error(`${variant}: el archivo en disco quedó con ${n} slides (esperaba 11)`);
  console.log(`${variant}: ok — ${n} slides en disco`);
}

const targets = process.argv.slice(2).filter((a) => !a.startsWith("-"));
rmSync(join(OUT, "preview"), { recursive: true, force: true });
const unknown = targets.filter((v) => !(v in THEMES));
if (unknown.length > 0) {
  console.error(`Variante desconocida: ${unknown.join(", ")}. Válidas: ${Object.keys(THEMES).join(", ")}`);
  process.exit(1);
}
for (const v of targets.length ? targets : Object.keys(THEMES)) {
  build(v);
  const pv = spawnSync("officecli", [
    "view", join(OUT, `plantilla-${v}.pptx`), "screenshot",
    "--grid", "3", "-o", join(OUT, "preview", `${v}.png`),
  ], { encoding: "utf8" });
  console.log(`  preview: ${pv.stdout.split("\n").find((l) => l.includes(".png")) ?? pv.stdout.trim()}`);
}
