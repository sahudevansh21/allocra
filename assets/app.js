(() => {
  const stateKey = 'allocra-demo-state-v2';
  const defaults = {
    monthly: 1200,
    preset: 'core',
    allocations: [55, 27, 18],
    walletConnected: false,
    preferences: { marketWindows: true, quoteChecks: true, planReminders: false },
    profile: { name: 'Avery Morgan', email: 'avery@allocra.example' }
  };
  const presets = {
    income: { title: 'Income allocation', assets: ['Dividend equity', 'US treasury', 'Real estate'], values: [35, 46, 19], overlap: '8%', issuer: 'Low', costRate: .0018 },
    core: { title: 'Core allocation', assets: ['Global equity', 'US treasury', 'Gold trust'], values: [55, 27, 18], overlap: '11%', issuer: 'Low', costRate: .0021 },
    growth: { title: 'Growth allocation', assets: ['US technology', 'Global equity', 'Gold trust'], values: [62, 27, 11], overlap: '28%', issuer: 'Elevated', costRate: .0026 }
  };
  const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: value % 1 ? 2 : 0 }).format(value);
  let state;
  try { state = { ...defaults, ...JSON.parse(localStorage.getItem(stateKey) || '{}') }; } catch { state = { ...defaults }; }
  state.preferences = { ...defaults.preferences, ...(state.preferences || {}) };
  state.profile = { ...defaults.profile, ...(state.profile || {}) };

  const saveState = () => localStorage.setItem(stateKey, JSON.stringify(state));
  const all = selector => [...document.querySelectorAll(selector)];
  const one = selector => document.querySelector(selector);

  const toast = message => {
    let region = one('.toast-region');
    if (!region) {
      region = document.createElement('div');
      region.className = 'toast-region';
      region.setAttribute('aria-live', 'polite');
      document.body.append(region);
    }
    const item = document.createElement('div');
    item.className = 'toast';
    item.textContent = message;
    region.append(item);
    window.setTimeout(() => { item.classList.add('out'); item.addEventListener('animationend', () => item.remove(), { once: true }); }, 3200);
  };

  const closePublicMenu = () => {
    const menu = one('#mobile-public-nav');
    const button = one('#mobile-public-toggle');
    if (!menu || !button) return;
    menu.classList.remove('is-open');
    menu.inert = true;
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Open navigation');
  };
  const setupPublicMenu = () => {
    const menu = one('#mobile-public-nav');
    const button = one('#mobile-public-toggle');
    if (!menu || !button) return;
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      menu.classList.toggle('is-open', open);
      menu.inert = !open;
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
    document.addEventListener('pointerdown', event => { if (!menu.contains(event.target) && !button.contains(event.target)) closePublicMenu(); });
  };

  const setupDialogs = () => {
    all('[data-open-dialog]').forEach(trigger => trigger.addEventListener('click', () => {
      const dialog = one(`#${trigger.dataset.openDialog}`);
      if (dialog?.showModal) dialog.showModal();
    }));
    all('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog')?.close()));
    all('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
  };

  const updateMonthly = () => {
    const rate = presets[state.preset]?.costRate ?? presets.core.costRate;
    const cost = Math.max(1.05, state.monthly * rate);
    all('[data-monthly-output]').forEach(node => { node.textContent = money(state.monthly); });
    all('[data-monthly-input]').forEach(input => {
      input.value = String(state.monthly);
      const fill = ((state.monthly - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100;
      input.style.setProperty('--fill', `${fill}%`);
    });
    all('[data-cost-output]').forEach(node => { node.textContent = money(cost); });
    const preview = one('[data-preview-copy]');
    if (preview) preview.textContent = `A ${money(state.monthly)} monthly draft split across three individually held ETFs.`;
  };

  const updatePreset = presetName => {
    if (!presets[presetName]) return;
    state.preset = presetName;
    state.allocations = [...presets[presetName].values];
    saveState();
    const preset = presets[presetName];
    all('[data-basket-title]').forEach(node => { node.textContent = preset.title; });
    all('[data-asset-name]').forEach((node, index) => { node.textContent = preset.assets[index]; });
    all('[data-allocation-output]').forEach((node, index) => { node.textContent = `${preset.values[index]}%`; });
    all('[data-allocation-ring]').forEach(node => {
      node.style.setProperty('--one', `${preset.values[0]}%`);
      node.style.setProperty('--two', `${preset.values[1]}%`);
    });
    all('[data-overlap-output]').forEach(node => { node.textContent = preset.overlap; });
    all('[data-issuer-output]').forEach(node => { node.textContent = preset.issuer; });
    all('[data-preset]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.preset === presetName)));
    all('[data-allocation-input]').forEach((input, index) => { input.value = String(preset.values[index]); input.style.setProperty('--fill', `${preset.values[index]}%`); });
    updateAllocationTotal();
    updateMonthly();
  };

  const updateAllocationTotal = () => {
    const inputs = all('[data-allocation-input]');
    if (!inputs.length) return;
    const values = inputs.map(input => Number(input.value));
    state.allocations = values;
    const total = values.reduce((sum, value) => sum + value, 0);
    all('[data-allocation-editor-output]').forEach((node, index) => { node.textContent = `${values[index]}%`; });
    all('[data-allocation-total]').forEach(node => {
      node.textContent = `${total}%`;
      node.classList.toggle('invalid', total !== 100);
    });
    all('[data-save-basket]').forEach(button => { button.disabled = total !== 100; button.setAttribute('aria-disabled', String(total !== 100)); });
  };

  const setupPlannerControls = () => {
    all('[data-monthly-input]').forEach(input => input.addEventListener('input', () => { state.monthly = Number(input.value); saveState(); updateMonthly(); }));
    all('[data-preset]').forEach(button => button.addEventListener('click', () => updatePreset(button.dataset.preset)));
    all('[data-allocation-input]').forEach(input => input.addEventListener('input', () => { input.style.setProperty('--fill', `${input.value}%`); updateAllocationTotal(); }));
    all('[data-save-basket]').forEach(button => button.addEventListener('click', () => {
      if (state.allocations.reduce((sum, value) => sum + value, 0) !== 100) { toast('Allocations must total 100% before saving.'); return; }
      saveState();
      toast('Basket changes saved to this browser.');
    }));
    updatePreset(state.preset);
  };

  const setupActivityFilters = () => {
    const filters = all('[data-activity-filter]');
    if (!filters.length) return;
    filters.forEach(button => button.addEventListener('click', () => {
      const filter = button.dataset.activityFilter;
      filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      all('[data-activity-type]').forEach(item => { item.hidden = filter !== 'all' && item.dataset.activityType !== filter; });
    }));
  };

  const setupInsightControls = () => {
    const periods = all('[data-period]');
    const values = { '1m': ['$24,980', '+1.7%'], '3m': ['$25,340', '+3.1%'], '1y': ['$28,720', '+14.4%'] };
    periods.forEach(button => button.addEventListener('click', () => {
      periods.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      const [portfolio, performance] = values[button.dataset.period];
      const amount = one('[data-portfolio-value]');
      const change = one('[data-portfolio-change]');
      if (amount) amount.textContent = portfolio;
      if (change) change.textContent = performance;
      const line = one('[data-chart-line]');
      if (line) line.setAttribute('d', button.dataset.period === '1y' ? 'M0,147 C70,138 120,155 182,122 S280,104 350,105 S448,62 510,82 S600,29 690,51' : button.dataset.period === '3m' ? 'M0,143 C75,128 120,149 190,112 S290,117 365,88 S500,76 584,55 S650,59 690,35' : 'M0,124 C76,108 128,132 201,101 S290,116 375,73 S500,88 588,48 S650,52 690,33');
    }));
  };

  const setupSettings = () => {
    all('[data-preference]').forEach(input => {
      input.checked = Boolean(state.preferences[input.dataset.preference]);
      input.addEventListener('change', () => { state.preferences[input.dataset.preference] = input.checked; saveState(); toast('Preference saved.'); });
    });
    const profileForm = one('[data-profile-form]');
    if (profileForm) profileForm.addEventListener('submit', event => {
      event.preventDefault();
      if (!profileForm.reportValidity()) return;
      const data = new FormData(profileForm);
      state.profile = { name: String(data.get('name')), email: String(data.get('email')) };
      saveState();
      toast('Profile updated in this browser.');
    });
  };

  const setupAuth = () => {
    const form = one('[data-auth-form]');
    if (!form) return;
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      state.profile.email = String(data.get('email'));
      state.walletConnected = true;
      saveState();
      window.location.assign('dashboard.html');
    });
  };

  const setupWallet = () => {
    all('[data-connect-wallet]').forEach(button => button.addEventListener('click', () => {
      state.walletConnected = true;
      saveState();
      all('[data-wallet-label]').forEach(label => { label.textContent = '0x6e3a…9C11'; });
      all('[data-wallet-status]').forEach(label => { label.textContent = 'Connected'; });
      toast('Demo wallet connected. No wallet request was made.');
      button.closest('dialog')?.close();
    }));
    all('[data-wallet-label]').forEach(label => { if (state.walletConnected) label.textContent = '0x6e3a…9C11'; });
    all('[data-wallet-status]').forEach(label => { if (state.walletConnected) label.textContent = 'Connected'; });
  };

  const setCurrentLinks = () => {
    const page = location.pathname.split('/').pop() || 'index.html';
    all('[data-nav]').forEach(link => { if (link.getAttribute('href') === page) link.setAttribute('aria-current', 'page'); });
  };

  document.addEventListener('keydown', event => { if (event.key === 'Escape') closePublicMenu(); });
  setupPublicMenu();
  setupDialogs();
  setupPlannerControls();
  setupActivityFilters();
  setupInsightControls();
  setupSettings();
  setupAuth();
  setupWallet();
  setCurrentLinks();
})();
