/* 
   CAFÉ MORADA — script.js
   Jogo de exploração + painel de gestão da cafeteria.
   Tudo é guardado em localStorage (não precisa de servidor). */

(() => {
  "use strict";

  /*  storage keys  */
  const LS = {
    bebidas: 'morada_bebidas',
    doces: 'morada_doces',
    horario: 'morada_horario',
    atracoes: 'morada_atracoes',
    rua: 'morada_rua',
  };

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const toggleBtn = document.getElementById("toggleDarkMode");
  const mapImg = document.getElementById("mapImg");

  let isDarkMode = false;

  toggleBtn.addEventListener("click", () => {

    isDarkMode = !isDarkMode;

    if (isDarkMode) {
      mapImg.src = "img/map_cafeteria_noite.png";
      toggleBtn.textContent = "☀️";
    } else {
      mapImg.src = "img/map_cafeteria.png";
      toggleBtn.textContent = "   🌙";
    }

  });


  const SEED_BEBIDAS = [
    { id: uid(), name: 'Expresso', price: 5, summary: 'Café curto e intenso, servido bem quente.' },
    { id: uid(), name: 'Café Coado', price: 6, summary: 'Método tradicional, sabor suave e limpo.' },
    { id: uid(), name: 'Cappuccino', price: 8, summary: 'Espresso, leite vaporizado e espuma cremosa.' },
    { id: uid(), name: 'Latte', price: 8, summary: 'Café suave com bastante leite cremoso.' },
    { id: uid(), name: 'Mocha', price: 9, summary: 'Espresso, chocolate e leite. Doce e intenso.' },
    { id: uid(), name: 'Chocolate Quente', price: 7, summary: 'Chocolate cremoso, ideal para dias frios.' },
    { id: uid(), name: 'Chá', price: 5, summary: 'Seleção de chás quentes, folhas soltas.' },
    { id: uid(), name: 'Suco Natural', price: 6, summary: 'Fruta fresca espremida na hora.' },
    { id: uid(), name: 'Água', price: 4, summary: 'Água natural ou com gás, bem fresca.' },
  ];
  const SEED_DOCES = [
    { id: uid(), name: 'Bolo de Cenoura', price: 7, summary: 'Fofo, com cobertura de chocolate.' },
    { id: uid(), name: 'Cheesecake', price: 9, summary: 'Cremoso, base de bolacha, fruta a gosto.' },
    { id: uid(), name: 'Torta de Maçã', price: 8, summary: 'Massa amanteigada e maçã caramelizada.' },
    { id: uid(), name: 'Cookie', price: 5, summary: 'Crocante por fora, macio por dentro.' },
    { id: uid(), name: 'Brownie', price: 6, summary: 'Chocolate intenso, textura húmida.' },
  ];
  const SEED_HORARIO = [
    { dia: 'Segunda', aberto: true, abre: '08:00', fecha: '20:00' },
    { dia: 'Terça', aberto: true, abre: '08:00', fecha: '20:00' },
    { dia: 'Quarta', aberto: true, abre: '08:00', fecha: '20:00' },
    { dia: 'Quinta', aberto: true, abre: '08:00', fecha: '20:00' },
    { dia: 'Sexta', aberto: true, abre: '08:00', fecha: '22:00' },
    { dia: 'Sábado', aberto: true, abre: '09:00', fecha: '22:00' },
    { dia: 'Domingo', aberto: false, abre: '09:00', fecha: '18:00' },
  ];
  const SEED_RUA = { nome: 'Rua das Flores', endereco: 'Rua das Flores 12, Porto' };

  /*  data layer  */
  const store = {
    read(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return structuredClone(fallback);
        return JSON.parse(raw);
      } catch (e) {
        console.warn('Falha a ler', key, e);
        return structuredClone(fallback);
      }
    },
    write(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        console.warn('Falha a guardar', key, e);
        return false;
      }
    }
  };

  let data = {
    bebidas: store.read(LS.bebidas, SEED_BEBIDAS),
    doces: store.read(LS.doces, SEED_DOCES),
    horario: store.read(LS.horario, SEED_HORARIO),
    atracoes: store.read(LS.atracoes, []),
    rua: store.read(LS.rua, SEED_RUA),
  };

  function persist(key) {
    const map = { bebidas: LS.bebidas, doces: LS.doces, horario: LS.horario, atracoes: LS.atracoes, rua: LS.rua };
    store.write(map[key], data[key]);
  }

  // garante que a cache em localStorage fica logo preenchida na primeira visita
  Object.keys(LS).forEach(key => { if (localStorage.getItem(LS[key]) === null) persist(key); });

  /*  toast  */
  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 2200);
  }

  /*  world / camera  */
  const WORLD_W = 1672, WORLD_H = 941;
  const stage = document.getElementById('stage');
  const world = document.getElementById('world');

  let cameraX = 0;
  let cameraY = 0;
  let scale = 1;

  function fitWorld() {

    const vw = stage.clientWidth;
    const vh = stage.clientHeight;

    if (vw < 768) {
      scale = Math.max(vw / WORLD_W, vh / WORLD_H);
    } else {
      scale = Math.min(vw / WORLD_W, vh / WORLD_H);
    }

    updateCamera();
  }
  function updateCamera() {

    const vw = stage.clientWidth;
    const vh = stage.clientHeight;

    const viewW = vw / scale;
    const viewH = vh / scale;

    let targetX = player.x - viewW / 2;

    let targetY;

    if (vw < 768) {

        // personagem mais embaixo da tela
        targetY = player.y - viewH * 0.72;

    } else {

        targetY = player.y - viewH / 2;

    }

    targetX = Math.max(0, Math.min(targetX, WORLD_W - viewW));
    targetY = Math.max(0, Math.min(targetY, WORLD_H - viewH));

    cameraX += (targetX - cameraX) * 0.12;
    cameraY += (targetY - cameraY) * 0.12;

    world.style.transform =
        `translate(${-cameraX * scale}px, ${-cameraY * scale}px) scale(${scale})`;
}
  window.addEventListener('resize', fitWorld);

  /*   zonas  */
  const ZONES = [
    { id: 'drinks', key: 'b', x: 535, y: 345, r: 130, label: 'Ver bebidas' },
    { id: 'desserts', key: 'd', x: 650, y: 345, r: 130, label: 'Ver doces' },
    { id: 'menuboard', key: 'm', x: 956, y: 253, r: 140, label: 'Editar menu' },
    { id: 'hours', key: 'l', x: 975, y: 875, r: 140, label: 'Editar horário' },
    { id: 'attractionsView', key: 'a', x: 566, y: 539, r: 130, label: 'Ver atrações' },
    { id: 'attractionsEdit', key: 'z', x: 1268, y: 500, r: 140, label: 'Gerir atrações' },
    { id: 'street', key: 'f', x: 210, y: 500, r: 190, label: 'Editar rua' },
    { id: 'npc', key: 'e', x: 800, y: 445, r: 120, label: 'Falar com a Belatrix' },

  ];

  /* small glow rings so the player can see where the hotspots are */
  const zoneLayer = document.getElementById('zoneLayer');
  const zoneRings = {};
  ZONES.forEach(z => {
    const ring = document.createElement('div');
    ring.className = 'zone-ring';
    ring.style.left = z.x + 'px';
    ring.style.top = z.y + 'px';
    zoneLayer.appendChild(ring);
    zoneRings[z.id] = ring;
  });

  /*  obstacles (simple AABB collision)  */
  const OBSTACLES = [
    // { x: 460, y: 15, w: 1190, h: 320 }, 
    // zona de serviço (frigoríficos, máquina de café, lavatórios)
    // { x: 700, y: 335, w: 520, h: 105 }, 
    // balcão da frente / caixa registadora
    // { x: 644, y: 498, w: 100, h: 140 }, 
    // mesa 1
    // { x: 930, y: 490, w: 140, h: 140 },   
    // mesa 2
    // { x: 1230, y: 450, w: 100, h: 120 }, 
    // mesa 3
    // { x: 580, y: 640, w: 150, h: 140 },  
    // mesa 4
    // { x: 1230, y: 650, w: 160, h: 140 }, 
    // mesa 5
  ];
  const BOUNDS = { minX: 25, minY: 25, maxX: WORLD_W - 25, maxY: WORLD_H - 20 };

  function rectHit(px, py) {
    const hw = 20, hh = 18; // metade da caixa de colisão do jogador (pés)
    const bx0 = px - hw, bx1 = px + hw, by0 = py - hh, by1 = py + hh;
    for (const o of OBSTACLES) {
      if (bx1 > o.x && bx0 < o.x + o.w && by1 > o.y && by0 < o.y + o.h) return true;
    }
    return false;
  }
  /*  player state  */
  const playerEl = document.getElementById('player');
  const npcEl = document.getElementById('npc');
  const ronEl = document.getElementById('ron');
  const promptBubble = document.getElementById('promptBubble');
  const promptKey = document.getElementById('promptKey');
  const promptText = document.getElementById('promptText');

  const player = { x: 880, y: 560, speed: 260, facing: 1 };
  npcEl.style.left = ZONES.find(z => z.id === 'npc').x + 'px';
  npcEl.style.top = (ZONES.find(z => z.id === 'npc').y) + 'px';


  const ron = { x: 1400, y: 600, speed: 260, facing: 1 };
  ronEl.style.left = ron.x + 'px';
  ronEl.style.top = ron.y + 'px';


  const pressed = new Set();
  const KEYMAP_MOVE = {
    arrowup: 'up', w: 'up',
    arrowdown: 'down', s: 'down',
    arrowleft: 'left', a: 'left',
    arrowright: 'right', d: 'right',
  };
  const ACTION_KEYS = new Set(['b', 'd', 'm', 'l', 'a', 'z', 'f', 'e']);

  let modalOpen = false;
  let nearestZone = null;

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'escape') { closeModal(); return; }

    if (modalOpen) return; // não move nem ativa zonas com um modal aberto

    if (KEYMAP_MOVE[k]) { pressed.add(KEYMAP_MOVE[k]); e.preventDefault(); }

    if (ACTION_KEYS.has(k) && nearestZone && nearestZone.key === k) {
      triggerZone(nearestZone.id);
    }
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (KEYMAP_MOVE[k]) pressed.delete(KEYMAP_MOVE[k]);
  });
  window.addEventListener('blur', () => pressed.clear());

  /*  touch controls  */
  const touchControls = document.getElementById('touchControls');
  const touchAction = document.getElementById('touchAction');
  const isTouch = matchMedia('(pointer: coarse)').matches;
  if (isTouch) { touchControls.classList.add('show'); touchAction.classList.add('show'); }

  touchControls.querySelectorAll('.tc-btn').forEach(btn => {
    const dir = btn.dataset.dir;
    const start = (ev) => { ev.preventDefault(); if (!modalOpen) pressed.add(dir); };
    const end = (ev) => { ev.preventDefault(); pressed.delete(dir); };
    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('touchend', end, { passive: false });
    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', end);
    btn.addEventListener('mouseleave', end);
  });
  touchAction.addEventListener('click', () => { if (nearestZone) triggerZone(nearestZone.id); });

  /*  game loop  */
  let lastT = performance.now();
  function frame(t) {
    const dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;
    if (!modalOpen) updatePlayer(dt);
    updateProximity();
    requestAnimationFrame(frame);
  }

  function updatePlayer(dt) {
    let dx = 0, dy = 0;
    if (pressed.has('up')) dy -= 1;
    if (pressed.has('down')) dy += 1;
    if (pressed.has('left')) dx -= 1;
    if (pressed.has('right')) dx += 1;

    const moving = dx !== 0 || dy !== 0;
    if (moving) {
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const step = player.speed * dt;

      const nx = player.x + dx * step;
      if (!rectHit(nx, player.y) && nx > BOUNDS.minX && nx < BOUNDS.maxX) player.x = nx;

      const ny = player.y + dy * step;
      if (!rectHit(player.x, ny) && ny > BOUNDS.minY && ny < BOUNDS.maxY) player.y = ny;

      if (dx > 0) player.facing = 1;
      if (dx < 0) player.facing = -1;
    }

    playerEl.classList.toggle('walking', moving);
    playerEl.classList.toggle('facing-left', player.facing === -1);
    playerEl.style.left = player.x + 'px';
    playerEl.style.top = player.y + 'px';
    updateCamera();
  }

  function updateProximity() {
    let best = null, bestDist = Infinity;
    for (const z of ZONES) {
      const dist = Math.hypot(player.x - z.x, player.y - z.y);
      const active = dist <= z.r;
      zoneRings[z.id].classList.toggle('active', active);
      if (active && dist < bestDist) { best = z; bestDist = dist; }
    }
    nearestZone = best;

    if (best) {
      promptBubble.classList.remove('hidden');
      promptBubble.style.left = player.x + 'px';
      promptBubble.style.top = (player.y - 60) + 'px';
      promptKey.textContent = best.key.toUpperCase();
      promptText.textContent = best.label;
    } else {
      promptBubble.classList.add('hidden');
    }
  }

  /*  modal system  */
  const modalRoot = document.getElementById('modalRoot');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const allModals = Array.from(document.querySelectorAll('.modal'));

  function openModal(name) {
    modalRoot.classList.remove('hidden');
    allModals.forEach(m => m.classList.toggle('show', m.dataset.modal === name));
    modalOpen = true;
    pressed.clear();
  }
  function closeModal() {
    modalRoot.classList.add('hidden');
    allModals.forEach(m => m.classList.remove('show'));
    modalOpen = false;
  }
  modalBackdrop.addEventListener('click', closeModal);
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));

  function triggerZone(id) {
    switch (id) {
      case 'npc': openNpc(); break;
      case 'drinks': openDrinksView(); break;
      case 'desserts': openDessertsView(); break;
      case 'menuboard': openMenuEditor(); break;
      case 'hours': openHoursEditor(); break;
      case 'attractionsView': openAttractionsView(); break;
      case 'attractionsEdit': openAttractionsEditor(); break;
      case 'street': openStreetEditor(); break;
    }
  }

  /*  NPC dialogue  */
  const NPC_QA = [
    { q: 'Onde mudo o menu?', a: 'Vê aquele quadro-negro atrás do balcão? Aproxima-te dele e pressiona M — dá para editar bebidas e doces, com nome, preço e um resumo curtinho.' },
    { q: 'Onde mudo o horário de funcionamento?', a: 'Junto à porta de entrada. Chega perto e pressiona L para abrires o editor de horário, dia a dia.' },
    { q: 'Onde coloco as atrações?', a: 'No balcão de gestão, ali ao fundo — pressiona Z para adicionares, editares ou removeres atrações. Para veres a lista como um cliente vê, vai ao mural perto da entrada e pressiona A.' },
    { q: 'Onde vejo as bebidas e os doces?', a: 'O frigorífico de bebidas mostra o menu de bebidas com a tecla B, e a vitrine de doces ao lado mostra os doces com a tecla D.' },
    { q: 'Onde mudo o nome da rua?', a: 'Sai porta fora até à rua e pressiona F — podes editar o nome da rua e a morada completa.' },
  ];
  const npcQuestionsEl = document.getElementById('npcQuestions');
  const npcAnswerEl = document.getElementById('npcAnswer');
  function openNpc() {
    npcQuestionsEl.innerHTML = '';
    npcAnswerEl.textContent = 'Olá! Sou a Belatrix. Em que posso ajudar? Escolhe uma pergunta abaixo. 👇';
    NPC_QA.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'npc-q-btn';
      btn.textContent = item.q;
      btn.addEventListener('click', () => { npcAnswerEl.textContent = item.a; });
      npcQuestionsEl.appendChild(btn);
    });
    openModal('npc');
  }

  /*  drinks / desserts view (chalkboard)  */
  function renderChalkList(container, items) {
    container.innerHTML = '';
    if (!items.length) {
      container.innerHTML = '<div class="chalk-empty">Ainda não há itens aqui. Usa o M no quadro do menu para adicionar!</div>';
      return;
    }
    items.forEach(it => {
      const row = document.createElement('div');
      row.className = 'chalk-item';
      row.innerHTML = `
        <div class="chalk-item-top"><span>${escapeHtml(it.name)}</span><span class="chalk-item-price">€${Number(it.price).toFixed(2)}</span></div>
        <div class="chalk-item-summary">${escapeHtml(it.summary || '')}</div>`;
      container.appendChild(row);
    });
  }
  function openDrinksView() { renderChalkList(document.getElementById('drinksList'), data.bebidas); openModal('drinks'); }
  function openDessertsView() { renderChalkList(document.getElementById('dessertsList'), data.doces); openModal('desserts'); }

  /*  menu editor (CRUD bebidas/doces)  */
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + btn.dataset.tab));
    });
  });

  function renderEditableList(container, items, kind) {
    container.innerHTML = '';
    if (!items.length) {
      container.innerHTML = '<div class="empty-note">Sem itens ainda. Adiciona um abaixo.</div>';
      return;
    }
    items.forEach(it => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
        <div class="ic-info">
          <div class="ic-name">${escapeHtml(it.name)}</div>
          <div class="ic-meta">${escapeHtml(it.summary || '')}</div>
        </div>
        <div class="ic-price">€${Number(it.price).toFixed(2)}</div>
        <button class="icon-btn" data-act="edit" title="Editar">✏️</button>
        <button class="icon-btn danger" data-act="del" title="Excluir">🗑️</button>`;
      card.querySelector('[data-act="del"]').addEventListener('click', () => {
        data[kind] = data[kind].filter(x => x.id !== it.id);
        persist(kind);
        renderEditableList(container, data[kind], kind);
        if (kind === 'bebidas') renderChalkList(document.getElementById('drinksList'), data.bebidas);
        else renderChalkList(document.getElementById('dessertsList'), data.doces);
        toast('Item removido.');
      });
      card.querySelector('[data-act="edit"]').addEventListener('click', () => {
        startEditItem(kind, it, card);
      });
      container.appendChild(card);
    });
  }

  function startEditItem(kind, it, card) {
    card.innerHTML = `
      <form class="edit-inline" style="display:flex;flex-direction:column;gap:6px;width:100%;">
        <div class="form-row" style="margin-bottom:0;">
          <input type="text" name="name" value="${escapeAttr(it.name)}" maxlength="40" required>
          <input type="number" name="price" value="${it.price}" min="0" step="0.5" required>
        </div>
        <div class="form-row" style="margin-bottom:0;">
          <textarea name="summary" maxlength="50" required>${escapeHtml(it.summary || '')}</textarea>
          <span class="char-counter"><span class="cc-cur">${(it.summary || '').length}</span>/50</span>
        </div>
        <div style="display:flex; gap:6px;">
          <button type="submit" class="btn-primary" style="margin-top:0;">💾 Guardar</button>
        </div>
      </form>`;
    const ta = card.querySelector('textarea');
    const cc = card.querySelector('.cc-cur');
    ta.addEventListener('input', () => cc.textContent = ta.value.length);
    card.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      it.name = fd.get('name').trim();
      it.price = parseFloat(fd.get('price'));
      it.summary = fd.get('summary').trim().slice(0, 50);
      persist(kind);
      const listEl = kind === 'bebidas' ? document.getElementById('editBebidasList') : document.getElementById('editDocesList');
      renderEditableList(listEl, data[kind], kind);
      if (kind === 'bebidas') renderChalkList(document.getElementById('drinksList'), data.bebidas);
      else renderChalkList(document.getElementById('dessertsList'), data.doces);
      toast('Item atualizado.');
    });
  }

  function wireAddForm(formId, listId, kind) {
    const form = document.getElementById(formId);
    const listEl = document.getElementById(listId);
    const ta = form.querySelector('textarea');
    const cc = form.querySelector('.cc-cur');
    ta.addEventListener('input', () => cc.textContent = ta.value.length);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const item = {
        id: uid(),
        name: fd.get('name').trim(),
        price: parseFloat(fd.get('price')),
        summary: fd.get('summary').trim().slice(0, 50),
      };
      data[kind].push(item);
      persist(kind);
      renderEditableList(listEl, data[kind], kind);
      if (kind === 'bebidas') renderChalkList(document.getElementById('drinksList'), data.bebidas);
      else renderChalkList(document.getElementById('dessertsList'), data.doces);
      form.reset();
      cc.textContent = '0';
      toast(kind === 'bebidas' ? 'Bebida adicionada!' : 'Doce adicionado!');
    });
  }
  wireAddForm('formBebidas', 'editBebidasList', 'bebidas');
  wireAddForm('formDoces', 'editDocesList', 'doces');

  function openMenuEditor() {
    renderEditableList(document.getElementById('editBebidasList'), data.bebidas, 'bebidas');
    renderEditableList(document.getElementById('editDocesList'), data.doces, 'doces');
    openModal('menuEdit');
  }

  /*  hours editor  */
  const hoursGrid = document.getElementById('hoursGrid');
  function renderHoursForm() {
    hoursGrid.innerHTML = '';
    data.horario.forEach((d, idx) => {
      const row = document.createElement('div');
      row.className = 'hours-row';
      row.innerHTML = `
        <span class="day-label">${d.dia}</span>
        <input type="checkbox" data-idx="${idx}" class="chk-open" ${d.aberto ? 'checked' : ''}>
        <input type="time" data-idx="${idx}" class="inp-abre" value="${d.abre}" ${d.aberto ? '' : 'disabled'}>
        <span>–</span>
        <input type="time" data-idx="${idx}" class="inp-fecha" value="${d.fecha}" ${d.aberto ? '' : 'disabled'}>
        <span class="closed-label" style="${d.aberto ? 'display:none;' : ''}">fechado</span>`;
      hoursGrid.appendChild(row);
    });
    hoursGrid.querySelectorAll('.chk-open').forEach(chk => {
      chk.addEventListener('change', () => {
        const row = chk.closest('.hours-row');
        row.querySelector('.inp-abre').disabled = !chk.checked;
        row.querySelector('.inp-fecha').disabled = !chk.checked;
        row.querySelector('.closed-label').style.display = chk.checked ? 'none' : '';
      });
    });
  }
  document.getElementById('formHours').addEventListener('submit', (e) => {
    e.preventDefault();
    hoursGrid.querySelectorAll('.hours-row').forEach((row, idx) => {
      data.horario[idx].aberto = row.querySelector('.chk-open').checked;
      data.horario[idx].abre = row.querySelector('.inp-abre').value;
      data.horario[idx].fecha = row.querySelector('.inp-fecha').value;
    });
    persist('horario');
    toast('Horário guardado!');
    closeModal();
  });
  function openHoursEditor() { renderHoursForm(); openModal('hours'); }

  /*  attractions (view  CRUD)  */
  function renderAttractionsView() {
    const container = document.getElementById('attractionsViewList');
    container.innerHTML = '';
    const list = [...data.atracoes].sort((a, b) => (a.data || '').localeCompare(b.data || ''));
    if (!list.length) {
      container.innerHTML = '<div class="chalk-empty">Sem atrações marcadas de momento. Volta em breve!</div>';
      return;
    }
    list.forEach(it => {
      const row = document.createElement('div');
      row.className = 'chalk-item';
      const precoTxt = it.gratuito ? 'Grátis' : `€${Number(it.preco || 0).toFixed(2)}`;
      const dataTxt = formatDate(it.data);
      row.innerHTML = `
        <div class="chalk-item-top"><span>${escapeHtml(it.nome)}</span><span class="chalk-item-price">${precoTxt}</span></div>
        <div class="chalk-item-summary">${dataTxt} · ${escapeHtml(it.horario || '')} — ${escapeHtml(it.resumo || '')}</div>`;
      container.appendChild(row);
    });
  }
  function openAttractionsView() { renderAttractionsView(); openModal('attractionsView'); }

  function renderAttractionsEdit() {
    const container = document.getElementById('editAttractionsList');
    container.innerHTML = '';
    if (!data.atracoes.length) {
      container.innerHTML = '<div class="empty-note">Sem atrações ainda. Adiciona uma abaixo.</div>';
      return;
    }
    data.atracoes.forEach(it => {
      const card = document.createElement('div');
      card.className = 'item-card';
      const precoTxt = it.gratuito ? 'Grátis' : `€${Number(it.preco || 0).toFixed(2)}`;
      card.innerHTML = `
        <div class="ic-info">
          <div class="ic-name">${escapeHtml(it.nome)}</div>
          <div class="ic-meta">${formatDate(it.data)} · ${escapeHtml(it.horario || '')} — ${escapeHtml(it.resumo || '')}</div>
        </div>
        <div class="ic-price">${precoTxt}</div>
        <button class="icon-btn danger" data-act="del" title="Excluir">🗑️</button>`;
      card.querySelector('[data-act="del"]').addEventListener('click', () => {
        data.atracoes = data.atracoes.filter(x => x.id !== it.id);
        persist('atracoes');
        renderAttractionsEdit();
        toast('Atração removida.');
      });
      container.appendChild(card);
    });
  }

  const formAtt = document.getElementById('formAttractions');
  const attGratuito = formAtt.querySelector('[name="gratuito"]');
  const attPreco = formAtt.querySelector('[name="preco"]');
  attGratuito.addEventListener('change', () => { attPreco.disabled = attGratuito.checked; if (attGratuito.checked) attPreco.value = ''; });
  const attTa = formAtt.querySelector('textarea');
  const attCc = formAtt.querySelector('.cc-cur');
  attTa.addEventListener('input', () => attCc.textContent = attTa.value.length);
  formAtt.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(formAtt);
    const item = {
      id: uid(),
      nome: fd.get('nome').trim(),
      data: fd.get('data'),
      horario: fd.get('horario'),
      gratuito: attGratuito.checked,
      preco: attGratuito.checked ? 0 : parseFloat(fd.get('preco') || 0),
      resumo: fd.get('resumo').trim().slice(0, 100),
    };
    data.atracoes.push(item);
    persist('atracoes');
    renderAttractionsEdit();
    formAtt.reset();
    attCc.textContent = '0';
    attPreco.disabled = false;
    toast('Atração adicionada!');
  });

  function openAttractionsEditor() { renderAttractionsEdit(); openModal('attractionsEdit'); }

  /*  street editor  */
  const formStreet = document.getElementById('formStreet');
  function openStreetEditor() {
    document.getElementById('streetEndereco').value = data.rua.endereco || '';
    openModal('street');
  }
  formStreet.addEventListener('submit', (e) => {
    e.preventDefault();
    data.rua = {
      endereco: document.getElementById('streetEndereco').value.trim(),
    };
    persist('rua');
    document.getElementById('statusText').textContent = `☕ Café Morada — ${data.rua.endereco}`;
    toast('Morada guardada!');
    closeModal();
  });

  /*  HUD toggle  */
  const hudToggle = document.getElementById('hudToggle');
  const hudPanel = document.getElementById('hudPanel');
  hudToggle.addEventListener('click', () => hudPanel.classList.toggle('hidden'));

  /*  helpers  */
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
  }
  function escapeAttr(str) { return escapeHtml(str); }
  function formatDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  /*  init  */
  function init() {
    fitWorld();
    document.getElementById('statusText').textContent = `☕ Café Morada — ${data.rua.endereco} `;
    requestAnimationFrame((t) => { lastT = t; requestAnimationFrame(frame); });

    setTimeout(() => document.getElementById('boot').classList.add('gone'), 700);
  }
  init();
})();




