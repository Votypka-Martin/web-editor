// app.js - Aplikační logika pro HTML Editor optimalizovaný pro mobilní zařízení

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // 1. STAV A PROMĚNNÉ APLIKACE
  // =========================================================================
  let editor = null;
  let activeCategory = 'all';
  let currentTheme = localStorage.getItem('html_editor_theme') || 'light';
  let draggedElementData = null;
  let justDraggedOrDropped = false;
  let previewDebounceTimer = null;
  let saveDebounceTimer = null;

  // Virtuální souborový systém
  let files = [];
  let activeFileId = null;

  // Simulované karty náhledu (jako v prohlížeči)
  let previewTabs = [];
  let activePreviewTabId = null;

  // DOM Prvky
  const editorContainer = document.getElementById('editor-container');
  const previewIframe = document.getElementById('preview-iframe');
  const dropIndicatorLine = document.getElementById('drop-indicator-line');
  const elementsPanel = document.getElementById('elements-panel');
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const categorySelect = document.getElementById('category-select');
  const elementsListContainer = document.getElementById('elements-list');
  const searchInput = document.getElementById('elements-search');
  const toastContainer = document.getElementById('toast-container');

  // DOM prvky karet souborů a karet náhledu
  const fileTabsList = document.getElementById('file-tabs-list');
  const btnAddFile = document.getElementById('btn-add-file');
  const previewBrowserTabs = document.getElementById('preview-browser-tabs');
  const previewUrlBar = document.getElementById('preview-url-bar');
  const previewUrlDisplay = document.getElementById('preview-url-display');
  const previewUrlExternalLink = document.getElementById('preview-url-external-link');

  // =========================================================================
  // 2. SPRÁVA VIRTUÁLNÍCH SOUBORŮ
  // =========================================================================
  function loadFilesFromStorage() {
    const savedFilesJson = localStorage.getItem('html_editor_files');
    if (savedFilesJson) {
      try {
        const parsed = JSON.parse(savedFilesJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          files = parsed;
          const savedActiveId = localStorage.getItem('html_editor_active_file');
          activeFileId = files.some(f => f.id === savedActiveId) ? savedActiveId : files[0].id;
          return;
        }
      } catch (e) {
        console.warn('Chyba při čtení html_editor_files:', e);
      }
    }

    // Zpětná kompatibilita pro původní jedno-souborový stav
    const legacyCode = localStorage.getItem('html_editor_code') || STARTER_TEMPLATES.starter;
    files = [
      {
        id: 'file_' + Date.now(),
        name: 'index.html',
        content: legacyCode
      }
    ];
    activeFileId = files[0].id;
    saveFilesToStorage();
  }

  function saveFilesToStorage() {
    localStorage.setItem('html_editor_files', JSON.stringify(files));
    localStorage.setItem('html_editor_active_file', activeFileId);
    const activeFile = getActiveFile();
    if (activeFile) {
      localStorage.setItem('html_editor_code', activeFile.content);
    }
  }

  function getActiveFile() {
    return files.find(f => f.id === activeFileId) || files[0];
  }

  function getFileByName(name) {
    if (!name) return null;
    const clean = name.trim().toLowerCase();
    return files.find(f => f.name.toLowerCase() === clean) ||
           files.find(f => f.name.toLowerCase() === (clean + '.html'));
  }

  function switchEditorFile(fileId) {
    if (fileId === activeFileId) return;
    const curFile = getActiveFile();
    if (curFile && editor) {
      curFile.content = editor.getValue();
    }

    activeFileId = fileId;
    saveFilesToStorage();

    const newFile = getActiveFile();
    if (editor && newFile) {
      editor.setValue(newFile.content);
      editor.clearHistory();
      editor.focus();
    }

    renderFileTabs();
  }

  function createNewFile(customName = null) {
    let defaultName = `stranka${files.length + 1}.html`;
    let name = customName;
    if (!name) {
      name = prompt('Zadejte název nového souboru (např. kontakt.html):', defaultName);
    }
    if (!name) return;
    name = name.trim();
    if (!name.endsWith('.html') && !name.endsWith('.htm')) {
      name += '.html';
    }

    if (files.some(f => f.name.toLowerCase() === name.toLowerCase())) {
      showToast(`Soubor „${name}“ již existuje.`);
      return;
    }

    const starterContent = `<!DOCTYPE html>
<html lang="cs">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
  </head>
  <body>
  
  </body>
</html>`;

    const newFile = {
      id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: name,
      content: starterContent
    };

    const curFile = getActiveFile();
    if (curFile && editor) {
      curFile.content = editor.getValue();
    }

    files.push(newFile);
    activeFileId = newFile.id;
    saveFilesToStorage();

    if (editor) {
      editor.setValue(newFile.content);
      editor.clearHistory();
      editor.focus();
    }

    renderFileTabs();
    showToast(`Soubor „${name}“ byl vytvořen.`);
  }

  function renameFile(fileId) {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    let newName = prompt('Zadejte nový název souboru:', file.name);
    if (!newName) return;
    newName = newName.trim();
    if (!newName.endsWith('.html') && !newName.endsWith('.htm')) {
      newName += '.html';
    }

    if (newName.toLowerCase() === file.name.toLowerCase()) return;

    if (files.some(f => f.id !== fileId && f.name.toLowerCase() === newName.toLowerCase())) {
      showToast(`Soubor s názvem „${newName}“ již existuje.`);
      return;
    }

    const oldName = file.name;
    file.name = newName;
    saveFilesToStorage();
    renderFileTabs();

    // Aktualizovat případné otevřené karty náhledu pro tento soubor
    previewTabs.forEach(pt => {
      if (pt.type === 'file' && pt.fileId === fileId) {
        pt.title = newName;
      }
    });
    renderPreviewTabs();
    showToast(`Soubor „${oldName}“ byl přejmenován na „${newName}“.`);
  }

  function deleteFile(fileId) {
    if (files.length <= 1) {
      showToast('Alespoň jeden soubor musí zůstat zachován.');
      return;
    }

    const file = files.find(f => f.id === fileId);
    if (!file) return;

    if (!confirm(`Opravdu chcete smazat soubor „${file.name}“?`)) {
      return;
    }

    const isDeletingActive = (fileId === activeFileId);
    files = files.filter(f => f.id !== fileId);

    if (isDeletingActive) {
      activeFileId = files[0].id;
      if (editor) {
        editor.setValue(files[0].content);
        editor.clearHistory();
      }
    }

    // Zavřít karty náhledu odkazující na smazaný soubor
    previewTabs = previewTabs.filter(pt => !(pt.type === 'file' && pt.fileId === fileId));
    if (previewTabs.length === 0) {
      initDefaultPreviewTab();
    } else if (!previewTabs.some(pt => pt.id === activePreviewTabId)) {
      activePreviewTabId = previewTabs[0].id;
    }

    saveFilesToStorage();
    renderFileTabs();
    renderPreviewTabs();
    updatePreviewIframe();
    showToast(`Soubor „${file.name}“ byl smazán.`);
  }

  function renderFileTabs() {
    if (!fileTabsList) return;
    fileTabsList.innerHTML = '';

    files.forEach(file => {
      const tab = document.createElement('div');
      tab.className = `file-tab ${file.id === activeFileId ? 'active' : ''}`;
      tab.dataset.fileId = file.id;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'file-tab-name';
      nameSpan.textContent = file.name;
      nameSpan.title = 'Kliknutím otevřete v editoru, dvojklikem přejmenujete';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'file-tab-close';
      closeBtn.title = `Smazat soubor ${file.name}`;
      closeBtn.innerHTML = '&times;';
      closeBtn.setAttribute('aria-label', `Smazat ${file.name}`);

      tab.addEventListener('click', (e) => {
        if (e.target.closest('.file-tab-close')) return;
        switchEditorFile(file.id);
      });

      tab.addEventListener('dblclick', (e) => {
        if (e.target.closest('.file-tab-close')) return;
        renameFile(file.id);
      });

      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteFile(file.id);
      });

      tab.appendChild(nameSpan);
      tab.appendChild(closeBtn);
      fileTabsList.appendChild(tab);
    });
  }

  btnAddFile?.addEventListener('click', () => {
    createNewFile();
  });

  // =========================================================================
  // 3. SPRÁVA KARET NÁHLEDU (SIMULOVANÝ PROHLÍŽEČ)
  // =========================================================================

  // Extrakce textu <title> z HTML obsahu dokumentu
  function extractTitleFromContent(html, fallback = 'Nová karta') {
    if (!html) return fallback;
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (match && match[1]) {
      const raw = match[1].trim();
      if (raw) {
        try {
          const doc = new DOMParser().parseFromString(raw, 'text/html');
          const decoded = doc.body.textContent || raw;
          return decoded.trim() || fallback;
        } catch (e) {
          return raw || fallback;
        }
      }
    }
    return fallback;
  }

  // Získání aktuálního titulku pro daný soubor (pokud je otevřen v editoru, bere se živý kód)
  function getFileTitle(file) {
    if (!file) return 'Dokument';
    const content = (file.id === activeFileId && editor) ? editor.getValue() : file.content;
    return extractTitleFromContent(content, file.name);
  }

  // Průběžná aktualizace titulků otevřených karet náhledu podle aktuálního <title>
  function updatePreviewTabTitles() {
    let changed = false;
    previewTabs.forEach(pt => {
      if (pt.type === 'file') {
        const file = files.find(f => f.id === pt.fileId);
        if (file) {
          const newTitle = getFileTitle(file);
          if (pt.title !== newTitle) {
            pt.title = newTitle;
            changed = true;
          }
        }
      }
    });
    if (changed) {
      renderPreviewTabs();
    }
  }

  function initDefaultPreviewTab() {
    const activeFile = getActiveFile();
    previewTabs = [
      {
        id: 'ptab_' + Date.now(),
        type: 'file',
        fileId: activeFile ? activeFile.id : files[0].id,
        title: activeFile ? getFileTitle(activeFile) : 'Dokument',
        url: ''
      }
    ];
    activePreviewTabId = previewTabs[0].id;
  }

  function getActivePreviewTab() {
    return previewTabs.find(t => t.id === activePreviewTabId) || previewTabs[0];
  }

  function renderPreviewTabs() {
    if (!previewBrowserTabs) return;
    previewBrowserTabs.innerHTML = '';

    previewTabs.forEach(tab => {
      const tabEl = document.createElement('div');
      tabEl.className = `preview-tab ${tab.id === activePreviewTabId ? 'active' : ''}`;
      tabEl.dataset.tabId = tab.id;

      let iconSvg = '';
      if (tab.type === 'url') {
        iconSvg = `<svg class="preview-tab-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
      } else {
        iconSvg = `<svg class="preview-tab-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
      }

      const titleSpan = document.createElement('span');
      titleSpan.className = 'preview-tab-title';
      titleSpan.textContent = tab.title;
      titleSpan.title = tab.title;

      const closeBtn = document.createElement('button');
      closeBtn.className = 'preview-tab-close';
      closeBtn.title = 'Zavřít kartu';
      closeBtn.innerHTML = '&times;';
      closeBtn.setAttribute('aria-label', `Zavřít kartu ${tab.title}`);

      tabEl.innerHTML = iconSvg;
      tabEl.appendChild(titleSpan);
      tabEl.appendChild(closeBtn);

      tabEl.addEventListener('click', (e) => {
        if (e.target.closest('.preview-tab-close')) return;
        switchPreviewTab(tab.id);
      });

      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closePreviewTab(tab.id);
      });

      previewBrowserTabs.appendChild(tabEl);
    });
  }

  function switchPreviewTab(tabId) {
    if (tabId === activePreviewTabId) return;
    activePreviewTabId = tabId;
    updatePreviewTabTitles();
    renderPreviewTabs();
    updatePreviewIframe();
  }

  function closePreviewTab(tabId) {
    if (previewTabs.length <= 1) {
      const activeFile = getActiveFile();
      previewTabs[0] = {
        id: 'ptab_' + Date.now(),
        type: 'file',
        fileId: activeFile.id,
        title: getFileTitle(activeFile),
        url: ''
      };
      activePreviewTabId = previewTabs[0].id;
    } else {
      const idx = previewTabs.findIndex(t => t.id === tabId);
      previewTabs = previewTabs.filter(t => t.id !== tabId);
      if (tabId === activePreviewTabId) {
        const nextIdx = Math.max(0, idx - 1);
        activePreviewTabId = previewTabs[nextIdx].id;
      }
    }

    renderPreviewTabs();
    updatePreviewIframe();
  }

  // Při kliknutí do náhledu: zobrazení náhledu souboru na jehož kartě se uživatel nachází
  function syncPreviewWithActiveEditorFile() {
    const activeFile = getActiveFile();
    if (!activeFile) return;

    const fileTitle = getFileTitle(activeFile);
    const activePT = getActivePreviewTab();
    if (activePT && activePT.type === 'file' && activePT.fileId === activeFile.id) {
      activePT.title = fileTitle;
      renderPreviewTabs();
      updatePreviewIframe();
      return;
    }

    const existingTab = previewTabs.find(t => t.type === 'file' && t.fileId === activeFile.id);
    if (existingTab) {
      existingTab.title = fileTitle;
      activePreviewTabId = existingTab.id;
    } else {
      if (activePT) {
        activePT.type = 'file';
        activePT.fileId = activeFile.id;
        activePT.title = fileTitle;
        activePT.url = '';
      } else {
        const newTab = {
          id: 'ptab_' + Date.now(),
          type: 'file',
          fileId: activeFile.id,
          title: fileTitle,
          url: ''
        };
        previewTabs.push(newTab);
        activePreviewTabId = newTab.id;
      }
    }

    renderPreviewTabs();
    updatePreviewIframe();
  }

  function getDisplayTitleForUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch (e) {
      return url.length > 20 ? url.substring(0, 18) + '...' : url;
    }
  }

  // Ochrana před duplicitním vyvoláním navigace (vyřešení chyby 2x otevření karty)
  let lastNavTime = 0;
  let lastNavKey = '';

  // Obsluha kliknutí na odkaz <a> uvnitř náhledu
  function handlePreviewNavigation(href, target) {
    if (!href) return;
    const cleanHref = href.trim();
    const isBlank = (target === '_blank');

    // Debounce ochrana proti vícenásobnému otevření nové karty
    const now = Date.now();
    const navKey = `${cleanHref}::${target}`;
    if (navKey === lastNavKey && (now - lastNavTime) < 400) {
      return;
    }
    lastNavTime = now;
    lastNavKey = navKey;

    // 1. Protokolové odkazy (e-mail, telefon, sms)
    const isProtocol = /^(mailto:|tel:|sms:)/i.test(cleanHref);
    if (isProtocol) {
      const isMail = cleanHref.toLowerCase().startsWith('mailto:');
      const isTel = cleanHref.toLowerCase().startsWith('tel:');
      const label = isMail ? 'e-mailový klient' : (isTel ? 'telefonní aplikaci' : 'aplikaci pro zprávy');
      showToast(`Otevírám ${label}: ${cleanHref}`);
      try {
        window.location.href = cleanHref;
      } catch (err) {
        window.open(cleanHref, '_blank');
      }
      return;
    }

    // 2. Externí odkaz na internet (http, https, //, www.)
    const isExternal = /^https?:\/\//i.test(cleanHref) || /^\/\//.test(cleanHref) || /^www\./i.test(cleanHref);

    if (isExternal) {
      let fullUrl = cleanHref;
      if (/^www\./i.test(fullUrl)) fullUrl = 'https://' + fullUrl;
      if (/^\/\//.test(fullUrl)) fullUrl = 'https:' + fullUrl;

      if (isBlank) {
        // Pokud je nastaveno target="_blank": otevřít novou kartu v prohlížeči, aktuální NEPŘESMĚROVÁVAT
        showToast(`Otevřena nová karta: ${fullUrl}`);
        window.open(fullUrl, '_blank');
      } else {
        // Pokud není nastaveno target="_blank": novou kartu v prohlížeči neotvírat, přesměrovat aktuální
        showToast(`Přesměrování na: ${fullUrl}`);
        const curFile = getActiveFile();
        if (curFile && editor) {
          curFile.content = editor.getValue();
        }
        saveFilesToStorage();
        window.location.href = fullUrl;
      }
      return;
    }

    // 2. Interní odkaz na jiný soubor v projektu (např. kontakt.html, ./kontakt.html, kontakt)
    let cleanPath = cleanHref.replace(/^\.\//, '');
    const [pathPart, hashPart] = cleanPath.split('#');

    const matchedFile = getFileByName(pathPart);

    if (matchedFile) {
      const fileTitle = getFileTitle(matchedFile);

      if (isBlank) {
        // Otevřít simulovanou novou kartu v náhledu (pouze 1x)
        const newTab = {
          id: 'ptab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          type: 'file',
          fileId: matchedFile.id,
          title: fileTitle,
          url: '',
          hash: hashPart || ''
        };
        previewTabs.push(newTab);
        activePreviewTabId = newTab.id;
        showToast(`Otevřena nová karta: ${fileTitle}`);
      } else {
        // Přesměrovat aktuální kartu náhledu
        const currentTab = getActivePreviewTab();
        if (currentTab) {
          currentTab.type = 'file';
          currentTab.fileId = matchedFile.id;
          currentTab.title = fileTitle;
          currentTab.url = '';
          currentTab.hash = hashPart || '';
          showToast(`Přechod na: ${fileTitle}`);
        }
      }

      renderPreviewTabs();
      updatePreviewIframe();
    } else {
      // Soubor v projektu nebyl nalezen (404 chybová stránka v náhledu)
      const notFoundTitle = pathPart ? `404: ${pathPart}` : '404 - Nenalezeno';
      if (isBlank) {
        const newTab = {
          id: 'ptab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          type: 'not_found',
          fileId: null,
          title: notFoundTitle,
          missingName: pathPart,
          url: ''
        };
        previewTabs.push(newTab);
        activePreviewTabId = newTab.id;
      } else {
        const currentTab = getActivePreviewTab();
        if (currentTab) {
          currentTab.type = 'not_found';
          currentTab.fileId = null;
          currentTab.title = notFoundTitle;
          currentTab.missingName = pathPart;
          currentTab.url = '';
        }
      }

      renderPreviewTabs();
      updatePreviewIframe();
      showToast(`Soubor „${pathPart}“ nebyl v projektu nalezen.`);
    }
  }

  // Aktualizace obsahu iframe podle aktivní karty náhledu
  function updatePreviewIframe() {
    if (!previewIframe) return;
    const currentTab = getActivePreviewTab();
    if (!currentTab) return;

    if (currentTab.type === 'url') {
      if (previewUrlBar) {
        previewUrlBar.style.display = 'flex';
        previewUrlDisplay.textContent = currentTab.url;
        previewUrlExternalLink.href = currentTab.url;
      }
      // Pro externí weby generujeme přívětivou stránku namísto iframe.src, aby se neobjevovalo "odmítl připojit"
      const externalHtml = `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(currentTab.title || 'Externí odkaz')}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 80vh; margin: 0; background: #f8fafc; color: #0f172a; text-align: center; padding: 20px; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px 24px; max-width: 460px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .icon { width: 44px; height: 44px; margin: 0 auto 14px; color: #4f46e5; }
    h1 { font-size: 1.3rem; margin: 0 0 8px; color: #0f172a; }
    p { color: #64748b; font-size: 0.9rem; line-height: 1.5; margin-bottom: 20px; word-break: break-all; }
    .btn { display: inline-flex; align-items: center; gap: 6px; background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; text-decoration: none; }
    .btn:hover { background: #4338ca; }
  </style>
</head>
<body>
  <div class="card">
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
    <h1>Externí webová stránka</h1>
    <p>Odkaz směřuje na externí internetový zdroj:<br><strong>${escapeHtml(currentTab.url)}</strong></p>
    <a class="btn" href="${escapeHtml(currentTab.url)}" target="_blank" rel="noopener noreferrer">Otevřít v novém okně ↗</a>
  </div>
</body>
</html>`;
      previewIframe.removeAttribute('src');
      previewIframe.srcdoc = externalHtml;
    } else if (currentTab.type === 'not_found') {
      if (previewUrlBar) previewUrlBar.style.display = 'none';
      previewIframe.removeAttribute('src');

      const notFoundHtml = `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <title>404 - Soubor nenalezen</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 80vh; margin: 0; background: #f8fafc; color: #0f172a; text-align: center; padding: 20px; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px 24px; max-width: 440px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    h1 { font-size: 2.2rem; margin: 0 0 8px; color: #ef4444; }
    h2 { font-size: 1.15rem; margin: 0 0 10px; }
    p { color: #64748b; font-size: 0.9rem; line-height: 1.5; margin-bottom: 20px; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600; color: #4f46e5; }
    .btn { display: inline-block; background: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>404</h1>
    <h2>Soubor nenalezen</h2>
    <p>Odkaz směřuje na soubor <code>${escapeHtml(currentTab.missingName || 'neznámý')}</code>, který v projektu neexistuje.</p>
    <button class="btn" onclick="window.parent.postMessage({ type: 'CREATE_FILE_REQUEST', name: '${escapeHtml(currentTab.missingName || '')}' }, '*')">Vytvořit tento soubor</button>
  </div>
</body>
</html>`;
      previewIframe.srcdoc = notFoundHtml;
    } else {
      // Soubor v projektu
      if (previewUrlBar) previewUrlBar.style.display = 'none';
      previewIframe.removeAttribute('src');

      const file = files.find(f => f.id === currentTab.fileId) || getActiveFile();
      let code = '';
      if (file) {
        if (file.id === activeFileId && editor) {
          code = editor.getValue();
        } else {
          code = file.content;
        }
      } else {
        code = STARTER_TEMPLATES.starter;
      }

      // Vložení záchytného skriptu pro kliknutí na odkazy <a>
      const interceptorScript = `
<script>
(function() {
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href');
    var target = a.getAttribute('target');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    e.preventDefault();
    e.stopPropagation();
    window.parent.postMessage({
      type: 'PREVIEW_NAVIGATE',
      href: href,
      target: target
    }, '*');
  }, true);
})();
<\/script>`;

      previewIframe.srcdoc = code + interceptorScript;
    }
  }

  // Živá aktualizace náhledu při psaní v editoru (včetně aktualizace titulku karty v reálném čase)
  function updateActivePreviewContent() {
    updatePreviewTabTitles();
    const activePT = getActivePreviewTab();
    if (activePT && activePT.type === 'file' && activePT.fileId === activeFileId) {
      updatePreviewIframe();
    }
  }

  // Posluchač pro postMessage z náhledu (kliknutí na odkazy a žádost o vytvoření souboru)
  window.addEventListener('message', (event) => {
    if (!event.data) return;
    if (event.data.type === 'PREVIEW_NAVIGATE') {
      handlePreviewNavigation(event.data.href, event.data.target);
    } else if (event.data.type === 'CREATE_FILE_REQUEST') {
      createNewFile(event.data.name);
    }
  });

  // =========================================================================
  // 4. INICIALIZACE CODEMIRROR
  // =========================================================================
  function initCodeMirror() {
    if (typeof CodeMirror === 'undefined') {
      setTimeout(initCodeMirror, 100);
      return;
    }

    loadFilesFromStorage();
    initDefaultPreviewTab();
    renderFileTabs();
    renderPreviewTabs();

    const activeFile = getActiveFile();

    editor = CodeMirror(editorContainer, {
      value: activeFile ? activeFile.content : STARTER_TEMPLATES.starter,
      mode: 'htmlmixed',
      theme: currentTheme === 'dark' ? 'dracula' : 'eclipse',
      lineNumbers: true,
      lineWrapping: true,
      autoCloseTags: true,
      matchBrackets: true,
      tabSize: 2,
      indentUnit: 2,
      dragDrop: true,
      inputStyle: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'contenteditable' : 'textarea'
    });

    editor.on('change', () => {
      clearTimeout(previewDebounceTimer);
      clearTimeout(saveDebounceTimer);

      const curFile = getActiveFile();
      if (curFile) {
        curFile.content = editor.getValue();
      }

      previewDebounceTimer = setTimeout(updateActivePreviewContent, 300);
      saveDebounceTimer = setTimeout(() => {
        saveFilesToStorage();
      }, 800);
    });

    updatePreviewIframe();
    setupDesktopDragAndDrop();
  }

  // =========================================================================
  // 4. KATEGORIE A KARTY PRVKŮ
  // =========================================================================
  function initCategorySelect() {
    if (!categorySelect) return;
    categorySelect.innerHTML = '';

    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = 'Všechny kategorie';
    categorySelect.appendChild(allOpt);

    ELEMENT_CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      categorySelect.appendChild(opt);
    });

    categorySelect.value = activeCategory;
    categorySelect.addEventListener('change', () => {
      activeCategory = categorySelect.value;
      renderElementsList();
    });
  }

  function renderElementsList() {
    const query = searchInput.value.toLowerCase().trim();
    elementsListContainer.innerHTML = '';

    const filtered = HTML_ELEMENTS.filter(el => {
      const matchCat = (activeCategory === 'all' || el.category === activeCategory);
      const matchSearch = !query || 
        el.tag.toLowerCase().includes(query) ||
        (el.name && el.name.toLowerCase().includes(query));
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      elementsListContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 24px 12px; color: var(--text-muted); font-size: 0.85rem;">
          Žádný prvek nenalezen.
        </div>`;
      return;
    }

    filtered.forEach(el => {
      const card = document.createElement('div');
      card.className = 'element-card';
      card.dataset.id = el.id;
      card.dataset.cat = el.category;
      card.title = el.desc || el.name || el.tag;
      card.draggable = true;

      // Karta obsahuje POUZE tag elementu
      card.innerHTML = `<span class="card-tag">${escapeHtml(el.tag)}</span>`;

      // Kliknutí / tapnutí na kartu -> vložení na aktuální pozici kurzoru
      card.addEventListener('click', () => {
        if (justDraggedOrDropped) return;
        insertSnippetAtCursor(el);
      });

      // Desktop HTML5 dragstart
      card.addEventListener('dragstart', (e) => {
        draggedElementData = el;
        card.classList.add('is-dragging');
        try {
          e.dataTransfer.setData('text/plain', el.snippet);
          e.dataTransfer.setData('application/json', JSON.stringify(el));
        } catch (err) {}
        e.dataTransfer.effectAllowed = 'copy';

        // Pokud je na mobilu otevřený panel, ihned ho skryjeme, aby byl vidět editor
        if (elementsPanel.classList.contains('open')) {
          closeDrawer();
        }
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        hideDropIndicator();
        justDraggedOrDropped = true;
        setTimeout(() => {
          draggedElementData = null;
          justDraggedOrDropped = false;
        }, 250);
      });

      // Mobilní dotykové tažení
      setupTouchDrag(card, el);

      elementsListContainer.appendChild(card);
    });
  }

  // =========================================================================
  // 5. DRAG & DROP PRO DESKTOP
  // =========================================================================
  function setupDesktopDragAndDrop() {
    if (!editor) return;

    editor.on('dragover', (cm, e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';

      const coords = editor.coordsChar({ left: e.clientX, top: e.clientY }, "window");
      showDropIndicator(coords);
    });

    editor.on('dragleave', () => {
      hideDropIndicator();
    });

    editor.on('drop', (cm, e) => {
      e.preventDefault();
      hideDropIndicator();

      let elementToInsert = draggedElementData;
      if (!elementToInsert && e.dataTransfer) {
        try {
          const raw = e.dataTransfer.getData('application/json');
          if (raw) elementToInsert = JSON.parse(raw);
        } catch (err) {}
      }
      if (!elementToInsert && e.dataTransfer) {
        const text = e.dataTransfer.getData('text/plain');
        if (text) {
          const found = HTML_ELEMENTS.find(el => el.snippet === text);
          if (found) elementToInsert = found;
          else elementToInsert = { tag: 'prvek', snippet: text };
        }
      }

      if (!elementToInsert) return;

      const coords = editor.coordsChar({ left: e.clientX, top: e.clientY }, "window") || editor.getCursor();
      
      justDraggedOrDropped = true;
      setTimeout(() => {
        draggedElementData = null;
        justDraggedOrDropped = false;
      }, 250);

      insertSnippetAtPosition(elementToInsert, coords);
    });

    // Fallback obsluha na kontejneru editoru
    editorContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    });

    editorContainer.addEventListener('drop', (e) => {
      if (e.defaultPrevented) return;
      e.preventDefault();
      hideDropIndicator();

      let elementToInsert = draggedElementData;
      if (!elementToInsert && e.dataTransfer) {
        try {
          const raw = e.dataTransfer.getData('application/json');
          if (raw) elementToInsert = JSON.parse(raw);
        } catch (err) {}
      }
      if (!elementToInsert) return;

      const coords = editor.coordsChar({ left: e.clientX, top: e.clientY }, "window") || editor.getCursor();
      justDraggedOrDropped = true;
      setTimeout(() => {
        draggedElementData = null;
        justDraggedOrDropped = false;
      }, 250);

      insertSnippetAtPosition(elementToInsert, coords);
    });
  }

  // =========================================================================
  // 6. TOUCH DRAG & DROP PRO MOBILNÍ ZAŘÍZENÍ
  // =========================================================================
  function setupTouchDrag(card, elementData) {
    let startX = 0;
    let startY = 0;
    let isDragging = false;
    let ghost = null;

    card.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      isDragging = false;
    }, { passive: true });

    card.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - startX);
      const deltaY = Math.abs(touch.clientY - startY);

      // Pokud uživatel začal táhnout prstem
      if (!isDragging && (deltaX > 10 || deltaY > 10)) {
        isDragging = true;
        draggedElementData = elementData;

        // Vytvoříme plovoucí ghost čip bez emoji
        ghost = document.createElement('div');
        ghost.id = 'touch-drag-ghost';
        ghost.textContent = elementData.tag;
        document.body.appendChild(ghost);
        card.classList.add('is-dragging');

        // POŽADAVEK 2: Při zahájení tahu okamžitě skryjeme levý panel, aby byl vidět prostor s kódem
        if (elementsPanel.classList.contains('open')) {
          closeDrawer();
        }
      }

      if (isDragging && ghost) {
        ghost.style.left = `${touch.clientX}px`;
        ghost.style.top = `${touch.clientY}px`;

        // Ověříme pozici nad editorem
        const editorRect = editorContainer.getBoundingClientRect();
        const isOverEditor = (
          touch.clientX >= editorRect.left &&
          touch.clientX <= editorRect.right &&
          touch.clientY >= editorRect.top &&
          touch.clientY <= editorRect.bottom
        );

        if (isOverEditor) {
          const coords = editor.coordsChar({ left: touch.clientX, top: touch.clientY }, "window");
          showDropIndicator(coords);
        } else {
          hideDropIndicator();
        }
      }
    }, { passive: false });

    card.addEventListener('touchend', (e) => {
      if (isDragging) {
        if (e.cancelable) e.preventDefault();
        const touch = e.changedTouches[0];
        const editorRect = editorContainer.getBoundingClientRect();
        const isOverEditor = (
          touch.clientX >= editorRect.left &&
          touch.clientX <= editorRect.right &&
          touch.clientY >= editorRect.top &&
          touch.clientY <= editorRect.bottom
        );

        hideDropIndicator();

        if (isOverEditor) {
          const coords = editor.coordsChar({ left: touch.clientX, top: touch.clientY }, "window") || editor.getCursor();
          insertSnippetAtPosition(elementData, coords);
        }

        if (ghost && ghost.parentNode) {
          ghost.parentNode.removeChild(ghost);
        }
        card.classList.remove('is-dragging');
        draggedElementData = null;
        isDragging = false;
        justDraggedOrDropped = true;
        setTimeout(() => { justDraggedOrDropped = false; }, 250);
      }
    });

    card.addEventListener('touchcancel', () => {
      if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
      card.classList.remove('is-dragging');
      draggedElementData = null;
      hideDropIndicator();
      isDragging = false;
    });
  }

  // =========================================================================
  // 7. VIZUÁLNÍ DROP INDIKÁTOR
  // =========================================================================
  function showDropIndicator(coords) {
    if (!coords || !dropIndicatorLine || !editor) return;

    try {
      editor.setCursor(coords);
      const editorRect = editorContainer.getBoundingClientRect();
      const pagePos = editor.charCoords(coords, 'page');
      const topOffset = pagePos.top - editorRect.top;
      dropIndicatorLine.style.top = `${Math.max(0, topOffset)}px`;
      dropIndicatorLine.style.display = 'block';
    } catch {
      dropIndicatorLine.style.display = 'none';
    }
  }

  function hideDropIndicator() {
    if (dropIndicatorLine) {
      dropIndicatorLine.style.display = 'none';
    }
  }

  // =========================================================================
  // 8. VKLÁDÁNÍ SNIPPETŮ DO KÓDU
  // =========================================================================
  function insertSnippetAtPosition(elementData, coords) {
    if (!editor || !elementData) return;

    let snippet = elementData.snippet;
    const hasCursorMarker = snippet.includes('$CURSOR$');
    const cleanedSnippet = snippet.replace('$CURSOR$', '');

    editor.focus();
    editor.replaceRange(cleanedSnippet, coords);

    if (hasCursorMarker) {
      const cursorOffset = snippet.indexOf('$CURSOR$');
      const lines = snippet.substring(0, cursorOffset).split('\n');
      const targetLine = coords.line + lines.length - 1;
      const targetCh = lines.length === 1 ? coords.ch + lines[0].length : lines[lines.length - 1].length;
      editor.setCursor({ line: targetLine, ch: targetCh });
    } else {
      const lines = cleanedSnippet.split('\n');
      const endLine = coords.line + lines.length - 1;
      const endCh = lines.length === 1 ? coords.ch + lines[0].length : lines[lines.length - 1].length;
      editor.setCursor({ line: endLine, ch: endCh });
    }

    // Automatické odsazení vložených řádků
    const lineCount = cleanedSnippet.split('\n').length;
    for (let i = coords.line; i < coords.line + lineCount; i++) {
      try {
        editor.indentLine(i, 'smart');
      } catch (err) {}
    }

    showToast(`Prvek ${elementData.tag} byl vložen.`);
    updateActivePreviewContent();
  }

  function insertSnippetAtCursor(elementData) {
    if (!editor) return;
    const cursor = editor.getCursor();
    insertSnippetAtPosition(elementData, cursor);

    // Na mobilu po vložení zavřeme panel
    if (elementsPanel.classList.contains('open')) {
      closeDrawer();
    }
  }

  // =========================================================================
  // 9. RYCHLÁ LIŠTA: Zpět, Znovu, Formátovat
  // =========================================================================
  document.getElementById('btn-quick-undo')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!editor) return;
    editor.undo();
  });

  document.getElementById('btn-quick-redo')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!editor) return;
    editor.redo();
  });

  document.getElementById('btn-quick-format')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!editor) return;
    const totalLines = editor.lineCount();
    for (let i = 0; i < totalLines; i++) {
      editor.indentLine(i, 'smart');
    }
    showToast('Kód byl zarovnán.');
  });

  // =========================================================================
  // 10. PŘEPÍNÁNÍ POHLEDŮ (EDITOR / NÁHLED)
  // =========================================================================
  const tabEditor = document.getElementById('tab-editor');
  const tabPreview = document.getElementById('tab-preview');

  function setViewMode(mode) {
    document.body.className = '';
    document.body.classList.add(`view-${mode}`);

    tabEditor.classList.toggle('active', mode === 'editor');
    tabPreview.classList.toggle('active', mode === 'preview');

    if (mode === 'editor') {
      setTimeout(() => editor && editor.refresh(), 50);
    }
    if (mode === 'preview') {
      syncPreviewWithActiveEditorFile();
    }
  }

  tabEditor.addEventListener('click', () => setViewMode('editor'));
  tabPreview.addEventListener('click', () => setViewMode('preview'));

  // =========================================================================
  // 11. MOBILNÍ DRAWER PANELU PRVKŮ
  // =========================================================================
  const btnToggleDrawer = document.getElementById('btn-toggle-drawer');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');

  function openDrawer() {
    elementsPanel.classList.add('open');
    drawerBackdrop.classList.add('active');
  }

  function closeDrawer() {
    elementsPanel.classList.remove('open');
    drawerBackdrop.classList.remove('active');
  }

  btnToggleDrawer.addEventListener('click', () => {
    if (elementsPanel.classList.contains('open')) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  btnCloseDrawer.addEventListener('click', closeDrawer);
  drawerBackdrop.addEventListener('click', closeDrawer);

  // Obnovit náhled
  document.getElementById('btn-refresh-preview')?.addEventListener('click', () => {
    updatePreviewIframe();
    showToast('Náhled byl obnoven.');
  });

  // =========================================================================
  // 12. NASTAVENÍ: BAREVNÝ MOTIV A UKLÁDÁNÍ DAT (MOCKAPI)
  // =========================================================================
  const modalSettings = document.getElementById('modal-settings');
  const btnSettings = document.getElementById('btn-settings');
  const btnShowSaveForm = document.getElementById('btn-show-save-form');
  const saveDataForm = document.getElementById('save-data-form');
  const saveInputName = document.getElementById('save-input-name');
  const saveInputPin = document.getElementById('save-input-pin');
  const btnCancelSave = document.getElementById('btn-cancel-save');
  const btnSubmitSave = document.getElementById('btn-submit-save');
  const saveFeedback = document.getElementById('save-feedback');

  const btnShowLoadForm = document.getElementById('btn-show-load-form');
  const loadDataForm = document.getElementById('load-data-form');
  const loadInputName = document.getElementById('load-input-name');
  const loadInputPin = document.getElementById('load-input-pin');
  const btnCancelLoad = document.getElementById('btn-cancel-load');
  const btnSubmitLoad = document.getElementById('btn-submit-load');
  const loadFeedback = document.getElementById('load-feedback');

  const MOCKAPI_URL = 'https://6acfc93f03feaa52b21eeee7.mockapi.io/api/lists/data';

  btnSettings.addEventListener('click', () => {
    hideSaveForm();
    hideLoadForm();
    openModal(modalSettings);
  });

  btnShowSaveForm?.addEventListener('click', () => {
    hideLoadForm();
    showSaveForm();
  });

  btnCancelSave?.addEventListener('click', () => {
    hideSaveForm();
  });

  btnShowLoadForm?.addEventListener('click', () => {
    hideSaveForm();
    showLoadForm();
  });

  btnCancelLoad?.addEventListener('click', () => {
    hideLoadForm();
  });

  function showSaveForm() {
    if (!saveDataForm || !btnShowSaveForm) return;
    saveDataForm.style.display = 'flex';
    btnShowSaveForm.style.display = 'none';
    clearSaveFeedback();
    const storedName = localStorage.getItem('html_editor_user_name') || '';
    if (storedName) {
      saveInputName.value = storedName;
      saveInputPin.focus();
    } else {
      saveInputName.focus();
    }
  }

  function hideSaveForm() {
    if (saveDataForm) saveDataForm.style.display = 'none';
    if (btnShowSaveForm) btnShowSaveForm.style.display = 'inline-block';
    clearSaveFeedback();
  }

  function showSaveFeedback(type, message) {
    if (!saveFeedback) return;
    saveFeedback.className = `save-feedback ${type}`;
    saveFeedback.textContent = message;
    saveFeedback.style.display = 'block';
  }

  function clearSaveFeedback() {
    if (!saveFeedback) return;
    saveFeedback.textContent = '';
    saveFeedback.className = 'save-feedback';
    saveFeedback.style.display = 'none';
  }

  function showLoadForm() {
    if (!loadDataForm || !btnShowLoadForm) return;
    loadDataForm.style.display = 'flex';
    btnShowLoadForm.style.display = 'none';
    clearLoadFeedback();
    const storedName = localStorage.getItem('html_editor_user_name') || '';
    if (storedName) {
      loadInputName.value = storedName;
      loadInputPin.focus();
    } else {
      loadInputName.focus();
    }
  }

  function hideLoadForm() {
    if (loadDataForm) loadDataForm.style.display = 'none';
    if (btnShowLoadForm) btnShowLoadForm.style.display = 'inline-block';
    clearLoadFeedback();
  }

  function showLoadFeedback(type, message) {
    if (!loadFeedback) return;
    loadFeedback.className = `save-feedback ${type}`;
    loadFeedback.textContent = message;
    loadFeedback.style.display = 'block';
  }

  function clearLoadFeedback() {
    if (!loadFeedback) return;
    loadFeedback.textContent = '';
    loadFeedback.className = 'save-feedback';
    loadFeedback.style.display = 'none';
  }

  // Rekonstrukce pole souborů ze staženého záznamu (podpora více souborů i starších formátů)
  function restoreFilesFromRecord(record) {
    if (!record) return null;

    // 1. Záznam obsahuje přímo pole souborů
    if (Array.isArray(record.files) && record.files.length > 0) {
      return record.files;
    }

    // 2. V record.code je serializované pole souborů ve formátu JSON
    if (record.code && typeof record.code === 'string') {
      const trimmed = record.code.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
            return parsed;
          }
        } catch (e) {}
      }
    }

    // 3. Zpětná kompatibilita: starší záznamy obsahující přímo HTML kód jediného souboru
    return [
      {
        id: 'file_' + Date.now(),
        name: 'index.html',
        content: record.code || STARTER_TEMPLATES.starter
      }
    ];
  }

  // Odeslání všech souborů na MockAPI
  saveDataForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = saveInputName.value.trim();
    const pin = saveInputPin.value.trim();

    if (!name) {
      showSaveFeedback('error', 'Zadejte prosím své jméno.');
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      showSaveFeedback('error', 'PIN musí obsahovat přesně 4 číslice.');
      return;
    }

    // Uložit aktuální stav z editoru do aktivního souboru
    const curActive = getActiveFile();
    if (curActive && editor) {
      curActive.content = editor.getValue();
    }
    saveFilesToStorage();

    // Všechny soubory vytvořené v editoru se serializují do formátu JSON
    const payloadCode = JSON.stringify(files, null, 2);

    btnSubmitSave.disabled = true;
    btnSubmitSave.textContent = 'Odesílám...';
    showSaveFeedback('success', 'Probíhá ověřování a odesílání dat...');

    try {
      // 1. Načtení všech záznamů ze zdroje
      const response = await fetch(MOCKAPI_URL);
      if (!response.ok) {
        throw new Error(`Nepodařilo se načíst data ze serveru (kód ${response.status}).`);
      }
      const records = await response.json();

      // 2. Kontrola, zda v datech existuje záznam se stejným jménem
      const existing = records.find(item => item.name && item.name.trim().toLowerCase() === name.toLowerCase());

      if (existing) {
        // Záznam nalezen -> kontrola PINu
        if (String(existing.pin).trim() === pin) {
          // PIN souhlasí -> aktualizace (PUT)
          const updateRes = await fetch(`${MOCKAPI_URL}/${existing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name,
              pin: pin,
              code: payloadCode,
              files: files,
              updatedAt: new Date().toISOString()
            })
          });

          if (!updateRes.ok) {
            throw new Error(`Chyba při aktualizaci záznamu na serveru (kód ${updateRes.status}).`);
          }

          localStorage.setItem('html_editor_user_name', name);
          showSaveFeedback('success', `Záznam pro „${name}“ byl úspěšně aktualizován (${files.length} souborů).`);
          showToast(`Kód pro „${name}“ byl aktualizován na serveru.`);
        } else {
          // PIN nesouhlasí -> zobrazení chyby
          showSaveFeedback('error', 'Zadaný PIN nesouhlasí se záznamem pro toto jméno.');
        }
      } else {
        // Záznam neexistuje -> vytvoření nového záznamu (POST)
        const createRes = await fetch(MOCKAPI_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name,
            pin: pin,
            code: payloadCode,
            files: files,
            createdAt: new Date().toISOString()
          })
        });

        if (!createRes.ok) {
          throw new Error(`Chyba při vytváření záznamu na serveru (kód ${createRes.status}).`);
        }

        localStorage.setItem('html_editor_user_name', name);
        showSaveFeedback('success', `Nový záznam pro „${name}“ byl úspěšně vytvořen a uložen (${files.length} souborů).`);
        showToast(`Nový záznam pro „${name}“ byl uložen.`);
      }
    } catch (err) {
      showSaveFeedback('error', err.message || 'Došlo k neočekávané chybě při komunikaci se serverem.');
    } finally {
      btnSubmitSave.disabled = false;
      btnSubmitSave.textContent = 'Potvrdit a odeslat';
    }
  });

  // Načtení dat z MockAPI
  loadDataForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = loadInputName.value.trim();
    const pin = loadInputPin.value.trim();

    if (!name) {
      showLoadFeedback('error', 'Zadejte prosím své jméno.');
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      showLoadFeedback('error', 'PIN musí obsahovat přesně 4 číslice.');
      return;
    }

    btnSubmitLoad.disabled = true;
    btnSubmitLoad.textContent = 'Načítám...';
    showLoadFeedback('success', 'Probíhá vyhledávání a stahování dat ze serveru...');

    try {
      const response = await fetch(MOCKAPI_URL);
      if (!response.ok) {
        throw new Error(`Nepodařilo se načíst data ze serveru (kód ${response.status}).`);
      }
      const records = await response.json();

      const existing = records.find(item => item.name && item.name.trim().toLowerCase() === name.toLowerCase());

      if (!existing) {
        showLoadFeedback('error', `Záznam pro jméno „${name}“ nebyl na serveru nalezen.`);
        return;
      }

      if (String(existing.pin).trim() !== pin) {
        showLoadFeedback('error', 'Zadaný PIN nesouhlasí se záznamem pro toto jméno.');
        return;
      }

      const restoredFiles = restoreFilesFromRecord(existing);
      if (!restoredFiles || restoredFiles.length === 0) {
        showLoadFeedback('error', 'V záznamu nebyla nalezena žádná platná data k obnovení.');
        return;
      }

      files = restoredFiles;
      const indexFile = files.find(f => f.name.toLowerCase() === 'index.html');
      activeFileId = indexFile ? indexFile.id : files[0].id;

      saveFilesToStorage();
      renderFileTabs();

      const curActive = getActiveFile();
      if (editor && curActive) {
        editor.setValue(curActive.content);
        editor.clearHistory();
      }

      initDefaultPreviewTab();
      renderPreviewTabs();
      updatePreviewIframe();

      localStorage.setItem('html_editor_user_name', name);
      const count = files.length;
      const countLabel = count === 1 ? '1 soubor' : (count < 5 ? `${count} soubory` : `${count} souborů`);
      showLoadFeedback('success', `Práce pro „${name}“ byla úspěšně načtena (${countLabel}).`);
      showToast(`Práce pro „${name}“ byla načtena.`);
    } catch (err) {
      showLoadFeedback('error', err.message || 'Došlo k neočekávané chybě při načítání dat.');
    } finally {
      btnSubmitLoad.disabled = false;
      btnSubmitLoad.textContent = 'Načíst data';
    }
  });

  document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('html_editor_theme', currentTheme);
    applyTheme();
  });

  function applyTheme() {
    if (currentTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (editor) editor.setOption('theme', 'dracula');
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (editor) editor.setOption('theme', 'eclipse');
    }
  }

  // =========================================================================
  // 13. MODÁLNÍ OBSLUHA & POMOCNÉ FUNKCE
  // =========================================================================
  function openModal(modal) {
    if (modal) modal.classList.add('open');
  }

  function closeModal(modal) {
    if (modal) modal.classList.remove('open');
  }

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.close;
      closeModal(document.getElementById(modalId));
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.2s ease-out';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, 2200);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  searchInput.addEventListener('input', () => {
    renderElementsList();
  });

  // Výchozí zobrazení: Editor
  setViewMode('editor');

  // Spuštění
  applyTheme();
  initCategorySelect();
  renderElementsList();
  initCodeMirror();
});
