/** Curated font pairings (display headline + body). Loaded on demand from Google Fonts — only the chosen pair is fetched.
 *  "system" = no download (default). Set via story.json theme.font, ?font=<id>, or the on-page switcher. */
export const FONTS = [
  { id: "system", label: "System (default)", display: null, body: null, css: null },
  { id: "fraunces", label: "Fraunces · Source Sans", display: "'Fraunces', Georgia, serif", body: "'Source Sans 3', system-ui, sans-serif", css: "family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Source+Sans+3:wght@400;600" },
  { id: "playfair", label: "Playfair Display · Lato", display: "'Playfair Display', Georgia, serif", body: "'Lato', system-ui, sans-serif", css: "family=Playfair+Display:wght@400;600&family=Lato:wght@400;700" },
  { id: "newsreader", label: "Newsreader · IBM Plex Sans", display: "'Newsreader', Georgia, serif", body: "'IBM Plex Sans', system-ui, sans-serif", css: "family=Newsreader:opsz,wght@6..72,400;6..72,600&family=IBM+Plex+Sans:wght@400;600" },
  { id: "libre", label: "Libre Baskerville · Work Sans", display: "'Libre Baskerville', Georgia, serif", body: "'Work Sans', system-ui, sans-serif", css: "family=Libre+Baskerville:wght@400;700&family=Work+Sans:wght@400;600" },
  { id: "dmserif", label: "DM Serif Display · DM Sans", display: "'DM Serif Display', Georgia, serif", body: "'DM Sans', system-ui, sans-serif", css: "family=DM+Serif+Display&family=DM+Sans:wght@400;600" },
  { id: "cormorant", label: "Cormorant Garamond · Nunito Sans", display: "'Cormorant Garamond', Georgia, serif", body: "'Nunito Sans', system-ui, sans-serif", css: "family=Cormorant+Garamond:wght@500;600&family=Nunito+Sans:wght@400;600" },
  { id: "syne", label: "Syne · Manrope", display: "'Syne', system-ui, sans-serif", body: "'Manrope', system-ui, sans-serif", css: "family=Syne:wght@600;800&family=Manrope:wght@400;600" },
  { id: "bebas", label: "Bebas Neue · Barlow", display: "'Bebas Neue', Impact, sans-serif", body: "'Barlow', system-ui, sans-serif", css: "family=Bebas+Neue&family=Barlow:wght@400;600" },
  { id: "archivo", label: "Archivo Black · Archivo", display: "'Archivo Black', system-ui, sans-serif", body: "'Archivo', system-ui, sans-serif", css: "family=Archivo+Black&family=Archivo:wght@400;600" },
  { id: "plexmono", label: "IBM Plex Mono · IBM Plex Sans", display: "'IBM Plex Mono', ui-monospace, monospace", body: "'IBM Plex Sans', system-ui, sans-serif", css: "family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;600" },
];
export function applyFont(id) {
  const f = FONTS.find((x) => x.id === id) || FONTS[0];
  const root = document.documentElement;
  let link = document.getElementById("scrolly-font-link");
  if (f.css) {
    if (!link) { link = document.createElement("link"); link.id = "scrolly-font-link"; link.rel = "stylesheet"; document.head.appendChild(link); }
    link.href = `https://fonts.googleapis.com/css2?${f.css}&display=swap`;
    root.style.setProperty("--serif", f.display); root.style.setProperty("--sans", f.body);
  } else { if (link) link.remove(); root.style.removeProperty("--serif"); root.style.removeProperty("--sans"); }
  root.setAttribute("data-font", f.id);
  return f.id;
}
