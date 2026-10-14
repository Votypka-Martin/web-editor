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

  // =========================================================================
  // 2. INICIALIZACE CODEMIRROR
  // =========================================================================
  function initCodeMirror() {
    if (typeof CodeMirror === 'undefined') {
      setTimeout(initCodeMirror, 100);
      return;
    }

    const savedCode = localStorage.getItem('html_editor_code') || STARTER_TEMPLATES.starter;

    editor = CodeMirror(editorContainer, {
      value: savedCode,
      mode: 'htmlmixed',
      theme: currentTheme === 'dark' ? 'dracula' : 'eclipse',
      lineNumbers: true,
      lineWrapping: true,
      autoCloseTags: true,
      matchBrackets: true,
      tabSize: 2,
      indentUnit: 2,
      dragDrop: true, // Povoleno, aby CodeMirror přijímal drop události ze scrolleru a předával je našemu editor.on('drop')
      inputStyle: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'contenteditable' : 'textarea'
    });

    // Změny v kódu -> živá aktualizace náhledu a uložení
    editor.on('change', () => {
      clearTimeout(previewDebounceTimer);
      clearTimeout(saveDebounceTimer);

      previewDebounceTimer = setTimeout(updatePreview, 300);
      saveDebounceTimer = setTimeout(() => {
        localStorage.setItem('html_editor_code', editor.getValue());
      }, 800);
    });

    updatePreview();
    setupDesktopDragAndDrop();
  }

  // =========================================================================
  // 3. AKTUALIZACE NÁHLEDU (PREVIEW)
  // =========================================================================
  function updatePreview() {
    if (!editor || !previewIframe) return;
    const code = editor.getValue();
    previewIframe.srcdoc = code;
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
    updatePreview();
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
      updatePreview();
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
    updatePreview();
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

  const MOCKAPI_URL = 'https://6acfc93f03feaa52b21eeee7.mockapi.io/api/lists/data';

  btnSettings.addEventListener('click', () => {
    hideSaveForm();
    openModal(modalSettings);
  });

  btnShowSaveForm?.addEventListener('click', () => {
    showSaveForm();
  });

  btnCancelSave?.addEventListener('click', () => {
    hideSaveForm();
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

  saveDataForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = saveInputName.value.trim();
    const pin = saveInputPin.value.trim();
    const code = editor ? editor.getValue() : '';

    if (!name) {
      showSaveFeedback('error', 'Zadejte prosím své jméno.');
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      showSaveFeedback('error', 'PIN musí obsahovat přesně 4 číslice.');
      return;
    }

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
              code: code,
              updatedAt: new Date().toISOString()
            })
          });

          if (!updateRes.ok) {
            throw new Error(`Chyba při aktualizaci záznamu na serveru (kód ${updateRes.status}).`);
          }

          localStorage.setItem('html_editor_user_name', name);
          showSaveFeedback('success', `Záznam pro „${name}“ byl úspěšně aktualizován.`);
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
            code: code,
            createdAt: new Date().toISOString()
          })
        });

        if (!createRes.ok) {
          throw new Error(`Chyba při vytváření záznamu na serveru (kód ${createRes.status}).`);
        }

        localStorage.setItem('html_editor_user_name', name);
        showSaveFeedback('success', `Nový záznam pro „${name}“ byl úspěšně vytvořen a uložen.`);
        showToast(`Nový záznam pro „${name}“ byl uložen.`);
      }
    } catch (err) {
      showSaveFeedback('error', err.message || 'Došlo k neočekávané chybě při komunikaci se serverem.');
    } finally {
      btnSubmitSave.disabled = false;
      btnSubmitSave.textContent = 'Potvrdit a odeslat';
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
