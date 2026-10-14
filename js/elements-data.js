// elements-data.js - Katalog HTML elementů s prázdnými tagy

const ELEMENT_CATEGORIES = [
  { id: 'structure', name: 'Základní struktura', color: '#4f46e5', desc: 'Základní stavební kameny každé HTML stránky' },
  { id: 'text', name: 'Text a nadpisy', color: '#0284c7', desc: 'Nadpisy, odstavce a formátování písma' },
  { id: 'media', name: 'Odkazy a média', color: '#059669', desc: 'Obrázky, hypertextové odkazy a multimédia' },
  { id: 'lists', name: 'Seznamy', color: '#16a34a', desc: 'Odrážkové i číslované přehledy' },
  { id: 'tables', name: 'Tabulky', color: '#d97706', desc: 'Tabulková data uspořádaná do řádků a sloupců' },
  { id: 'layout', name: 'Kontejnery a layout', color: '#7c3aed', desc: 'Strukturální sekce a obalové prvky' },
  { id: 'forms', name: 'Formuláře a vstupy', color: '#dc2626', desc: 'Vstupní pole, tlačítka a interakce s uživatelem' },
  { id: 'advanced', name: 'Styly a skripty', color: '#db2777', desc: 'Připojení CSS stylů a JavaScriptu' }
];

const HTML_ELEMENTS = [
  // --- ZÁKLADNÍ STRUKTURA ---
  {
    id: 'doctype',
    category: 'structure',
    tag: '<!DOCTYPE html>',
    name: 'Dokument HTML5',
    desc: 'Kompletní základní kostra HTML5',
    badge: 'Šablona',
    type: 'block',
    snippet: `<!DOCTYPE html>
<html lang="cs">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
  </head>
  <body>

  </body>
</html>`
  },
  {
    id: 'html',
    category: 'structure',
    tag: '<html>',
    name: 'HTML',
    desc: 'Kořenový prvek stránky',
    badge: 'Párový',
    type: 'block',
    snippet: `<html lang="cs">\n  $CURSOR$\n</html>\n`
  },
  {
    id: 'head',
    category: 'structure',
    tag: '<head>',
    name: 'Hlavička',
    desc: 'Hlavička dokumentu',
    badge: 'Párový',
    type: 'block',
    snippet: `<head>\n  $CURSOR$\n</head>\n`
  },
  {
    id: 'title',
    category: 'structure',
    tag: '<title>',
    name: 'Titulek',
    desc: 'Titulek stránky v prohlížeči',
    badge: 'Párový',
    type: 'inline',
    snippet: `<title>$CURSOR$</title>`
  },
  {
    id: 'meta',
    category: 'structure',
    tag: '<meta>',
    name: 'Meta',
    desc: 'Metadata stránky',
    badge: 'Nepárový',
    type: 'inline',
    snippet: `<meta charset="UTF-8">`
  },
  {
    id: 'body',
    category: 'structure',
    tag: '<body>',
    name: 'Tělo',
    desc: 'Tělo stránky',
    badge: 'Párový',
    type: 'block',
    snippet: `<body>\n  $CURSOR$\n</body>\n`
  },

  // --- TEXT A NADPISY ---
  {
    id: 'h1',
    category: 'text',
    tag: '<h1>',
    name: 'Nadpis 1',
    desc: 'Hlavní nadpis H1',
    badge: 'Blokový',
    type: 'block',
    snippet: `<h1>$CURSOR$</h1>\n`
  },
  {
    id: 'h2',
    category: 'text',
    tag: '<h2>',
    name: 'Nadpis 2',
    desc: 'Podnadpis H2',
    badge: 'Blokový',
    type: 'block',
    snippet: `<h2>$CURSOR$</h2>\n`
  },
  {
    id: 'h3',
    category: 'text',
    tag: '<h3>',
    name: 'Nadpis 3',
    desc: 'Nadpis H3',
    badge: 'Blokový',
    type: 'block',
    snippet: `<h3>$CURSOR$</h3>\n`
  },
  {
    id: 'h4',
    category: 'text',
    tag: '<h4>',
    name: 'Nadpis 4',
    desc: 'Nadpis H4',
    badge: 'Blokový',
    type: 'block',
    snippet: `<h4>$CURSOR$</h4>\n`
  },
  {
    id: 'h5',
    category: 'text',
    tag: '<h5>',
    name: 'Nadpis 5',
    desc: 'Nadpis H5',
    badge: 'Blokový',
    type: 'block',
    snippet: `<h5>$CURSOR$</h5>\n`
  },
  {
    id: 'h6',
    category: 'text',
    tag: '<h6>',
    name: 'Nadpis 6',
    desc: 'Nadpis H6',
    badge: 'Blokový',
    type: 'block',
    snippet: `<h6>$CURSOR$</h6>\n`
  },
  {
    id: 'p',
    category: 'text',
    tag: '<p>',
    name: 'Odstavec',
    desc: 'Odstavec textu',
    badge: 'Blokový',
    type: 'block',
    snippet: `<p>$CURSOR$</p>\n`
  },
  {
    id: 'strong',
    category: 'text',
    tag: '<strong>',
    name: 'Tučný text',
    desc: 'Důležitý text (tučně)',
    badge: 'Řádkový',
    type: 'inline',
    snippet: `<strong>$CURSOR$</strong>`
  },
  {
    id: 'em',
    category: 'text',
    tag: '<em>',
    name: 'Kurzíva',
    desc: 'Zvýrazněný text (kurzíva)',
    badge: 'Řádkový',
    type: 'inline',
    snippet: `<em>$CURSOR$</em>`
  },
  {
    id: 'mark',
    category: 'text',
    tag: '<mark>',
    name: 'Zvýraznění',
    desc: 'Žluté zvýraznění textu',
    badge: 'Řádkový',
    type: 'inline',
    snippet: `<mark>$CURSOR$</mark>`
  },
  {
    id: 'small',
    category: 'text',
    tag: '<small>',
    name: 'Malý text',
    desc: 'Zmenšený doplňkový text',
    badge: 'Řádkový',
    type: 'inline',
    snippet: `<small>$CURSOR$</small>`
  },
  {
    id: 'del',
    category: 'text',
    tag: '<del>',
    name: 'Přeškrtnuté',
    desc: 'Přeškrtnutý text',
    badge: 'Řádkový',
    type: 'inline',
    snippet: `<del>$CURSOR$</del>`
  },
  {
    id: 'blockquote',
    category: 'text',
    tag: '<blockquote>',
    name: 'Citace',
    desc: 'Bloková citace',
    badge: 'Blokový',
    type: 'block',
    snippet: `<blockquote>\n  $CURSOR$\n</blockquote>\n`
  },
  {
    id: 'code',
    category: 'text',
    tag: '<code>',
    name: 'Kód',
    desc: 'Úryvek kódu',
    badge: 'Řádkový',
    type: 'inline',
    snippet: `<code>$CURSOR$</code>`
  },
  {
    id: 'br',
    category: 'text',
    tag: '<br>',
    name: 'Zalomení',
    desc: 'Zalomení řádku',
    badge: 'Nepárový',
    type: 'inline',
    snippet: `<br>\n`
  },
  {
    id: 'hr',
    category: 'text',
    tag: '<hr>',
    name: 'Čára',
    desc: 'Vodorovná oddělovací čára',
    badge: 'Nepárový',
    type: 'block',
    snippet: `<hr>\n`
  },

  // --- ODKAZY A MÉDIA ---
  {
    id: 'a',
    category: 'media',
    tag: '<a>',
    name: 'Odkaz',
    desc: 'Hypertextový odkaz',
    badge: 'Řádkový',
    type: 'inline',
    snippet: `<a href="">$CURSOR$</a>`
  },
  {
    id: 'img',
    category: 'media',
    tag: '<img>',
    name: 'Obrázek',
    desc: 'Obrázek',
    badge: 'Nepárový',
    type: 'inline',
    snippet: `<img src="" alt="">`
  },
  {
    id: 'figure',
    category: 'media',
    tag: '<figure>',
    name: 'Obrázek s popisem',
    desc: 'Obal obrázku s popiskem',
    badge: 'Blokový',
    type: 'block',
    snippet: `<figure>\n  $CURSOR$\n</figure>\n`
  },
  {
    id: 'figcaption',
    category: 'media',
    tag: '<figcaption>',
    name: 'Popisek obrázku',
    desc: 'Popis obrázku ve figure',
    badge: 'Blokový',
    type: 'block',
    snippet: `<figcaption>$CURSOR$</figcaption>\n`
  },
  {
    id: 'audio',
    category: 'media',
    tag: '<audio>',
    name: 'Audio',
    desc: 'Přehrávač zvuku',
    badge: 'Blokový',
    type: 'block',
    snippet: `<audio controls>\n  <source src="" type="">\n</audio>\n`
  },
  {
    id: 'video',
    category: 'media',
    tag: '<video>',
    name: 'Video',
    desc: 'Přehrávač videa',
    badge: 'Blokový',
    type: 'block',
    snippet: `<video controls width="320">\n  <source src="" type="">\n</video>\n`
  },
  {
    id: 'iframe',
    category: 'media',
    tag: '<iframe>',
    name: 'iFrame',
    desc: 'Vložený rám',
    badge: 'Blokový',
    type: 'block',
    snippet: `<iframe src=""></iframe>\n`
  },

  // --- SEZNAMY ---
  {
    id: 'ul',
    category: 'lists',
    tag: '<ul>',
    name: 'Odrážkový seznam',
    desc: 'Nečíslovaný seznam',
    badge: 'Blokový',
    type: 'block',
    snippet: `<ul>\n  $CURSOR$\n</ul>\n`
  },
  {
    id: 'ol',
    category: 'lists',
    tag: '<ol>',
    name: 'Číslovaný seznam',
    desc: 'Číslovaný seznam',
    badge: 'Blokový',
    type: 'block',
    snippet: `<ol>\n  $CURSOR$\n</ol>\n`
  },
  {
    id: 'li',
    category: 'lists',
    tag: '<li>',
    name: 'Položka seznamu',
    desc: 'Položka seznamu',
    badge: 'Blokový',
    type: 'block',
    snippet: `<li>$CURSOR$</li>\n`
  },
  {
    id: 'dl',
    category: 'lists',
    tag: '<dl>',
    name: 'Slovníkový seznam',
    desc: 'Seznam definic',
    badge: 'Blokový',
    type: 'block',
    snippet: `<dl>\n  $CURSOR$\n</dl>\n`
  },
  {
    id: 'dt',
    category: 'lists',
    tag: '<dt>',
    name: 'Pojem',
    desc: 'Pojem v seznamu definic',
    badge: 'Blokový',
    type: 'block',
    snippet: `<dt>$CURSOR$</dt>\n`
  },
  {
    id: 'dd',
    category: 'lists',
    tag: '<dd>',
    name: 'Definice pojmu',
    desc: 'Vysvětlení pojmu',
    badge: 'Blokový',
    type: 'block',
    snippet: `<dd>$CURSOR$</dd>\n`
  },

  // --- TABULKY ---
  {
    id: 'table',
    category: 'tables',
    tag: '<table>',
    name: 'Tabulka',
    desc: 'Tabulka',
    badge: 'Blokový',
    type: 'block',
    snippet: `<table>\n  $CURSOR$\n</table>\n`
  },
  {
    id: 'thead',
    category: 'tables',
    tag: '<thead>',
    name: 'Záhlaví tabulky',
    desc: 'Hlavička tabulky',
    badge: 'Blokový',
    type: 'block',
    snippet: `<thead>\n  $CURSOR$\n</thead>\n`
  },
  {
    id: 'tbody',
    category: 'tables',
    tag: '<tbody>',
    name: 'Tělo tabulky',
    desc: 'Tělo tabulky',
    badge: 'Blokový',
    type: 'block',
    snippet: `<tbody>\n  $CURSOR$\n</tbody>\n`
  },
  {
    id: 'tr',
    category: 'tables',
    tag: '<tr>',
    name: 'Řádek tabulky',
    desc: 'Řádek tabulky',
    badge: 'Párový',
    type: 'block',
    snippet: `<tr>\n  $CURSOR$\n</tr>\n`
  },
  {
    id: 'th',
    category: 'tables',
    tag: '<th>',
    name: 'Buňka záhlaví',
    desc: 'Buňka záhlaví',
    badge: 'Párový',
    type: 'inline',
    snippet: `<th>$CURSOR$</th>`
  },
  {
    id: 'td',
    category: 'tables',
    tag: '<td>',
    name: 'Buňka dat',
    desc: 'Běžná datová buňka',
    badge: 'Párový',
    type: 'inline',
    snippet: `<td>$CURSOR$</td>`
  },

  // --- KONTEJNERY A LAYOUT ---
  {
    id: 'div',
    category: 'layout',
    tag: '<div>',
    name: 'Kontejner div',
    desc: 'Blokový obal',
    badge: 'Blokový',
    type: 'block',
    snippet: `<div>\n  $CURSOR$\n</div>\n`
  },
  {
    id: 'span',
    category: 'layout',
    tag: '<span>',
    name: 'Řádkový span',
    desc: 'Řádkový obal',
    badge: 'Řádkový',
    type: 'inline',
    snippet: `<span>$CURSOR$</span>`
  },
  {
    id: 'header',
    category: 'layout',
    tag: '<header>',
    name: 'Záhlaví',
    desc: 'Záhlaví stránky',
    badge: 'Blokový',
    type: 'block',
    snippet: `<header>\n  $CURSOR$\n</header>\n`
  },
  {
    id: 'nav',
    category: 'layout',
    tag: '<nav>',
    name: 'Navigace',
    desc: 'Navigační sekce',
    badge: 'Blokový',
    type: 'block',
    snippet: `<nav>\n  $CURSOR$\n</nav>\n`
  },
  {
    id: 'main',
    category: 'layout',
    tag: '<main>',
    name: 'Hlavní obsah',
    desc: 'Hlavní obsah',
    badge: 'Blokový',
    type: 'block',
    snippet: `<main>\n  $CURSOR$\n</main>\n`
  },
  {
    id: 'section',
    category: 'layout',
    tag: '<section>',
    name: 'Sekce',
    desc: 'Tematická sekce',
    badge: 'Blokový',
    type: 'block',
    snippet: `<section>\n  $CURSOR$\n</section>\n`
  },
  {
    id: 'article',
    category: 'layout',
    tag: '<article>',
    name: 'Článek',
    desc: 'Samostatný článek',
    badge: 'Blokový',
    type: 'block',
    snippet: `<article>\n  $CURSOR$\n</article>\n`
  },
  {
    id: 'footer',
    category: 'layout',
    tag: '<footer>',
    name: 'Zápatí',
    desc: 'Zápatí stránky',
    badge: 'Blokový',
    type: 'block',
    snippet: `<footer>\n  $CURSOR$\n</footer>\n`
  },

  // --- FORMULÁŘE A VSTUPY ---
  {
    id: 'form',
    category: 'forms',
    tag: '<form>',
    name: 'Formulář',
    desc: 'Formulář',
    badge: 'Blokový',
    type: 'block',
    snippet: `<form action="#" method="get">\n  $CURSOR$\n</form>\n`
  },
  {
    id: 'label',
    category: 'forms',
    tag: '<label>',
    name: 'Popisek',
    desc: 'Popisek k poli',
    badge: 'Řádkový',
    type: 'inline',
    snippet: `<label>$CURSOR$</label>`
  },
  {
    id: 'input',
    category: 'forms',
    tag: '<input>',
    name: 'Vstupní pole',
    desc: 'Vstupní textové pole',
    badge: 'Nepárový',
    type: 'inline',
    snippet: `<input type="text">`
  },
  {
    id: 'button',
    category: 'forms',
    tag: '<button>',
    name: 'Tlačítko',
    desc: 'Klikací tlačítko',
    badge: 'Řádkový',
    type: 'inline',
    snippet: `<button>$CURSOR$</button>`
  },
  {
    id: 'textarea',
    category: 'forms',
    tag: '<textarea>',
    name: 'Víceřádkový text',
    desc: 'Víceřádková oblast',
    badge: 'Párový',
    type: 'block',
    snippet: `<textarea>$CURSOR$</textarea>\n`
  },
  {
    id: 'select',
    category: 'forms',
    tag: '<select>',
    name: 'Rozbalovací nabídka',
    desc: 'Roletový výběr',
    badge: 'Párový',
    type: 'block',
    snippet: `<select>\n  $CURSOR$\n</select>\n`
  },
  {
    id: 'option',
    category: 'forms',
    tag: '<option>',
    name: 'Možnost nabídky',
    desc: 'Položka výběru',
    badge: 'Párový',
    type: 'inline',
    snippet: `<option>$CURSOR$</option>`
  },

  // --- STYLY A SKRIPTY ---
  {
    id: 'style',
    category: 'advanced',
    tag: '<style>',
    name: 'Styly',
    desc: 'CSS stylopis',
    badge: 'Párový',
    type: 'block',
    snippet: `<style>\n  $CURSOR$\n</style>\n`
  },
  {
    id: 'script',
    category: 'advanced',
    tag: '<script>',
    name: 'Skript',
    desc: 'JavaScript kód',
    badge: 'Párový',
    type: 'block',
    snippet: `<script>\n  $CURSOR$\n</script>\n`
  },
  {
    id: 'link',
    category: 'advanced',
    tag: '<link>',
    name: 'Externí odkaz',
    desc: 'Připojení stylopisu',
    badge: 'Nepárový',
    type: 'inline',
    snippet: `<link rel="stylesheet" href="">`
  }
];

// Výchozí šablona stránky
const STARTER_TEMPLATES = {
  starter: `<!DOCTYPE html>
<html lang="cs">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
  </head>
  <body>

  </body>
</html>`
};
