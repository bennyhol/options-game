/* ============================================
   OptionMaster: Defeat the Algos
   UI Rendering & Canvas P&L Graphs
   ============================================ */

// ============ LEVEL SELECT ============
function renderLevelSelect() {
  const grid = document.getElementById('levels-grid');
  grid.innerHTML = '';

  for (let i = 0; i < getLevelCount(); i++) {
    const level = getLevelDef(i);
    const unlocked = i <= GameState.unlockedLevel;
    const completed = GameState.completedLevels.includes(i);

    const card = document.createElement('div');
    card.className = 'level-card' + (unlocked ? '' : ' locked') + (completed ? ' completed' : '');
    card.innerHTML = `
      <div class="level-number">${unlocked ? i + 1 : '&#128274;'}</div>
      <div class="level-info">
        <h3>${level.title}</h3>
        <p>${level.concept}</p>
      </div>
    `;
    if (unlocked) {
      card.addEventListener('click', () => {
        GameState.currentLevel = i;
        navigate('gameplay');
      });
    }
    grid.appendChild(card);
  }
}

// ============ GAMEPLAY RENDERING ============
function renderGameplay() {
  const level = getLevelDef(GameState.currentLevel);
  const scenario = GameState.activePuzzle;
  if (!level || !scenario) return;

  const step = level.steps ? level.steps[GameState.currentStep] : level;

  // Header
  document.getElementById('gameplay-title').textContent = `Level ${level.id + 1}: ${level.title}`;
  document.getElementById('portfolio-cash').textContent = '$' + GameState.portfolio.cash.toLocaleString();

  // Contract reminder
  const reminder = document.getElementById('contract-reminder');
  if (level.showReminder) {
    reminder.classList.remove('compact', 'hidden');
  } else {
    reminder.classList.add('compact');
  }

  // Briefing
  const overlay = document.getElementById('briefing-overlay');
  overlay.classList.remove('hidden');
  document.getElementById('briefing-badge').textContent = `Level ${level.id + 1}`;
  document.getElementById('briefing-title').textContent = level.title;

  // Build briefing text with stock price and beginner tips
  let briefingHTML = level.description;
  if (scenario.event) briefingHTML += `<br><br><strong>${scenario.event}</strong>`;
  if (scenario.owns100Shares) briefingHTML += '<br><br>You currently own 100 shares.';

  // Stock price display in briefing
  briefingHTML += `<div class="briefing-stock-price">
    <span class="bsp-label">Current Stock Price</span>
    <span class="bsp-ticker">${scenario.ticker}</span>
    <span class="bsp-price">$${scenario.currentPrice.toFixed(2)}</span>
  </div>`;

  // Beginner tip for early levels
  if (level.id <= 2) {
    briefingHTML += `<div class="beginner-tip">
      <div class="tip-header">Quick Tip for Beginners</div>
      <strong>Bid</strong> = the price someone will pay YOU if you <strong>sell</strong>. Tap Bid to sell.<br>
      <strong>Ask</strong> = the price YOU pay to <strong>buy</strong>. Tap Ask to buy.<br><br>
      Think of it like a store: the Ask is the sticker price (what you pay to buy),
      and the Bid is what a store offers when you sell back to them (always a bit less).
    </div>`;
  }

  document.getElementById('briefing-text').innerHTML = briefingHTML;
  document.getElementById('briefing-objective').innerHTML = step.objective || level.objective || '';

  // Scenario bar
  document.getElementById('ticker').textContent = scenario.ticker;
  document.getElementById('stock-price').textContent = '$' + scenario.currentPrice.toFixed(2);
  document.getElementById('days-to-expiry').textContent = scenario.daysToExpiry + ' DTE';
  document.getElementById('iv-display').textContent = 'IV: ' + scenario.iv + '%';

  // Time decay
  const timeContainer = document.getElementById('time-decay-container');
  if (level.hasTimeDecay) {
    timeContainer.classList.remove('hidden');
    updateTimeDecayBar();
  } else {
    timeContainer.classList.add('hidden');
  }

  // Greeks dashboard
  const greeksDash = document.getElementById('greeks-dashboard');
  const showGreeks = level.showGreeks === true ||
    (Array.isArray(level.showGreeks) && level.showGreeks.length > 0) ||
    GameState.cheatCodesUsed.includes('GREEKGOD');
  if (showGreeks) {
    greeksDash.classList.remove('hidden');
    updateGreeksDashboard({ delta: 0, gamma: 0, theta: 0, vega: 0 });
  } else {
    greeksDash.classList.add('hidden');
  }

  // Puzzle instruction
  document.getElementById('puzzle-instruction').innerHTML = step.objective || level.objective || '';

  // Roll button
  const rollBtn = document.getElementById('btn-roll');
  if (level.rollOptions && GameState.currentStep > 0) {
    rollBtn.classList.remove('hidden');
  } else {
    rollBtn.classList.add('hidden');
  }

  // Option chain
  renderOptionChain(scenario, step);

  // Selected legs
  renderSelectedLegs();
  updateSubmitButton();

  // Special: Level 2 has active position display instead of chain selection
  if (level.id === 1 && scenario.activePosition) {
    renderActivePosition(scenario);
  }
}

// ============ OPTION CHAIN ============
function renderOptionChain(scenario, step) {
  const chain = document.getElementById('option-chain');
  chain.innerHTML = '';

  const selectMode = step.selectMode || 'both';
  const defaultDirection = step.direction || null;

  // Calculate bid/ask spread (ask = premium, bid = premium - small spread)
  function spread(premium) {
    const s = Math.max(0.01, premium * 0.05 + 0.02);
    return Math.round(s * 100) / 100;
  }

  scenario.chain.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'chain-row';
    if (row.isATM) rowEl.classList.add('atm-row');
    // Subtle background tint for ITM regions (no labels!)
    if (row.strike < scenario.currentPrice) rowEl.classList.add('itm-call');
    if (row.strike > scenario.currentPrice) rowEl.classList.add('itm-put');

    const callBid = Math.max(0.01, row.callPremium - spread(row.callPremium));
    const callAsk = row.callPremium;
    const putBid = Math.max(0.01, row.putPremium - spread(row.putPremium));
    const putAsk = row.putPremium;

    // Call Bid
    const callBidEl = document.createElement('div');
    callBidEl.className = 'chain-option';
    if (selectMode === 'put_only') callBidEl.classList.add('disabled');
    callBidEl.textContent = callBid.toFixed(2);
    callBidEl.dataset.type = 'call';
    callBidEl.dataset.strike = row.strike;
    callBidEl.dataset.premium = callBid;
    callBidEl.dataset.side = 'bid';
    callBidEl.dataset.delta = row.callDelta;
    callBidEl.dataset.gamma = row.gamma;
    callBidEl.dataset.theta = row.theta;
    callBidEl.dataset.vega = row.vega;

    // Call Ask
    const callAskEl = document.createElement('div');
    callAskEl.className = 'chain-option';
    if (selectMode === 'put_only') callAskEl.classList.add('disabled');
    callAskEl.textContent = callAsk.toFixed(2);
    callAskEl.dataset.type = 'call';
    callAskEl.dataset.strike = row.strike;
    callAskEl.dataset.premium = callAsk;
    callAskEl.dataset.side = 'ask';
    callAskEl.dataset.delta = row.callDelta;
    callAskEl.dataset.gamma = row.gamma;
    callAskEl.dataset.theta = row.theta;
    callAskEl.dataset.vega = row.vega;

    // Strike
    const strikeEl = document.createElement('div');
    strikeEl.className = 'chain-strike';
    strikeEl.textContent = row.strike;

    // Put Bid
    const putBidEl = document.createElement('div');
    putBidEl.className = 'chain-option';
    if (selectMode === 'call_only') putBidEl.classList.add('disabled');
    putBidEl.textContent = putBid.toFixed(2);
    putBidEl.dataset.type = 'put';
    putBidEl.dataset.strike = row.strike;
    putBidEl.dataset.premium = putBid;
    putBidEl.dataset.side = 'bid';
    putBidEl.dataset.delta = row.putDelta;
    putBidEl.dataset.gamma = row.gamma;
    putBidEl.dataset.theta = row.theta;
    putBidEl.dataset.vega = row.vega;

    // Put Ask
    const putAskEl = document.createElement('div');
    putAskEl.className = 'chain-option';
    if (selectMode === 'call_only') putAskEl.classList.add('disabled');
    putAskEl.textContent = putAsk.toFixed(2);
    putAskEl.dataset.type = 'put';
    putAskEl.dataset.strike = row.strike;
    putAskEl.dataset.premium = putAsk;
    putAskEl.dataset.side = 'ask';
    putAskEl.dataset.delta = row.putDelta;
    putAskEl.dataset.gamma = row.gamma;
    putAskEl.dataset.theta = row.theta;
    putAskEl.dataset.vega = row.vega;

    // Click handlers - bid = sell, ask = buy (like real markets)
    if (selectMode !== 'put_only') {
      callBidEl.addEventListener('click', () => handleOptionClick(callBidEl, 'call', row, 'short'));
      callAskEl.addEventListener('click', () => handleOptionClick(callAskEl, 'call', row, 'long'));
    }
    if (selectMode !== 'call_only') {
      putBidEl.addEventListener('click', () => handleOptionClick(putBidEl, 'put', row, 'short'));
      putAskEl.addEventListener('click', () => handleOptionClick(putAskEl, 'put', row, 'long'));
    }

    // For steps with forced direction, override: clicking either bid or ask uses that direction
    if (defaultDirection) {
      const dir = defaultDirection;
      if (selectMode !== 'put_only') {
        callBidEl.onclick = () => handleOptionClick(callBidEl, 'call', row, dir);
        callAskEl.onclick = () => handleOptionClick(callAskEl, 'call', row, dir);
      }
      if (selectMode !== 'call_only') {
        putBidEl.onclick = () => handleOptionClick(putBidEl, 'put', row, dir);
        putAskEl.onclick = () => handleOptionClick(putAskEl, 'put', row, dir);
      }
    }

    rowEl.appendChild(callBidEl);
    rowEl.appendChild(callAskEl);
    rowEl.appendChild(strikeEl);
    rowEl.appendChild(putBidEl);
    rowEl.appendChild(putAskEl);
    chain.appendChild(rowEl);
  });

  // Scroll to ATM row
  const atmRow = chain.querySelector('.atm-row');
  if (atmRow) {
    setTimeout(() => atmRow.scrollIntoView({ block: 'center', behavior: 'smooth' }), 100);
  }
}

function handleOptionClick(element, type, row, direction) {
  const strike = parseFloat(element.dataset.strike);
  const premium = parseFloat(element.dataset.premium);
  const level = getLevelDef(GameState.currentLevel);
  const maxLegs = level.maxLegs || 4;

  // Check if this exact option is already selected - if so, deselect
  const existingIndex = GameState.selectedLegs.findIndex(
    l => l.type === type && l.strike === strike
  );
  if (existingIndex >= 0) {
    removeLeg(existingIndex);
    // Clear highlights for this strike+type
    document.querySelectorAll('.chain-option').forEach(el => {
      if (el.dataset.strike === String(strike) && el.dataset.type === type) {
        el.classList.remove('selected-long', 'selected-short');
      }
    });
    return;
  }

  // For single-leg levels: auto-deselect previous selection
  if (maxLegs === 1 && GameState.selectedLegs.length > 0) {
    // Clear all selections
    document.querySelectorAll('.chain-option.selected-long, .chain-option.selected-short').forEach(el => {
      el.classList.remove('selected-long', 'selected-short');
    });
    GameState.selectedLegs = [];
  }

  const greeks = {
    delta: parseFloat(element.dataset.delta),
    gamma: parseFloat(element.dataset.gamma),
    theta: parseFloat(element.dataset.theta),
    vega: parseFloat(element.dataset.vega)
  };

  // Highlight both bid and ask cells for this strike+type
  document.querySelectorAll('.chain-option').forEach(el => {
    if (el.dataset.strike === String(strike) && el.dataset.type === type) {
      el.classList.add(direction === 'long' ? 'selected-long' : 'selected-short');
    }
  });

  addLeg(type, direction, strike, premium, greeks);
}

// ============ SELECTED LEGS DISPLAY ============
function renderSelectedLegs() {
  const container = document.getElementById('selected-legs');

  if (GameState.selectedLegs.length === 0) {
    container.innerHTML = '<div class="empty-legs">Tap options above to build your strategy</div>';
    return;
  }

  container.innerHTML = '';
  GameState.selectedLegs.forEach((leg, i) => {
    const card = document.createElement('div');
    card.className = 'leg-card ' + leg.direction;
    card.innerHTML = `
      <span>${leg.direction === 'long' ? 'BUY' : 'SELL'}</span>
      <span>$${leg.strike} ${leg.type.toUpperCase()}</span>
      <span>@ $${leg.premium.toFixed(2)}</span>
      <span class="premium-cost">($${(leg.premium * 100).toFixed(0)})</span>
      <button class="leg-remove" data-index="${i}">&times;</button>
    `;
    card.querySelector('.leg-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      removeLeg(i);
      // Remove chain highlight
      document.querySelectorAll('.chain-option').forEach(el => {
        if (el.dataset.strike === String(leg.strike) && el.dataset.type === leg.type) {
          el.classList.remove('selected-long', 'selected-short');
        }
      });
    });
    container.appendChild(card);
  });
}

function updateStrategyInfo() {
  const nameEl = document.getElementById('strategy-name');
  const summaryEl = document.getElementById('strategy-summary');

  if (GameState.selectedLegs.length === 0) {
    nameEl.textContent = '';
    summaryEl.textContent = '';
    return;
  }

  const stratName = identifyStrategy(GameState.selectedLegs);
  nameEl.textContent = '(' + stratName + ')';

  // Calculate net cost
  let netCost = 0;
  GameState.selectedLegs.forEach(leg => {
    if (leg.direction === 'long') netCost += leg.premium;
    else netCost -= leg.premium;
  });

  const costType = netCost > 0 ? 'Debit' : 'Credit';
  summaryEl.textContent = `Net ${costType}: $${(Math.abs(netCost) * 100).toFixed(0)} (${Math.abs(netCost).toFixed(2)}/share)`;

  // Update greeks
  updateGreeksFromLegs();
}

function updateSubmitButton() {
  const btn = document.getElementById('btn-submit-strategy');
  const level = getLevelDef(GameState.currentLevel);

  // Special case: level 2 uses sell button, not submit
  if (level.id === 1) {
    btn.disabled = true;
    return;
  }

  const maxLegs = level.maxLegs || 4;
  const legCount = GameState.selectedLegs.length;

  // Enable when at least 1 leg is selected, and not exceeding max
  btn.disabled = legCount === 0 || legCount > maxLegs;
}

// ============ GREEKS DASHBOARD ============
function updateGreeksDashboard(greeks) {
  const maxDelta = 1, maxGamma = 0.1, maxTheta = 0.5, maxVega = 0.5;

  setGreekBar('delta', Math.abs(greeks.delta), maxDelta, greeks.delta);
  setGreekBar('gamma', greeks.gamma, maxGamma, greeks.gamma);
  setGreekBar('theta', Math.abs(greeks.theta), maxTheta, greeks.theta);
  setGreekBar('vega', greeks.vega, maxVega, greeks.vega);
}

function setGreekBar(name, value, max, rawValue) {
  const bar = document.getElementById('greek-' + name);
  const valEl = document.getElementById('greek-' + name + '-val');
  if (!bar || !valEl) return;

  const pct = Math.min(100, (value / max) * 100);
  bar.style.height = pct + '%';
  valEl.textContent = (typeof rawValue === 'number') ? rawValue.toFixed(rawValue < 0.1 ? 3 : 2) : '0.00';
}

function updateGreeksFromLegs() {
  if (GameState.selectedLegs.length === 0) {
    updateGreeksDashboard({ delta: 0, gamma: 0, theta: 0, vega: 0 });
    return;
  }

  let netGreeks = { delta: 0, gamma: 0, theta: 0, vega: 0 };
  GameState.selectedLegs.forEach(leg => {
    const mult = leg.direction === 'long' ? 1 : -1;
    netGreeks.delta += (leg.greeks.delta || 0) * mult;
    netGreeks.gamma += (leg.greeks.gamma || 0) * mult;
    netGreeks.theta += (leg.greeks.theta || 0) * mult;
    netGreeks.vega += (leg.greeks.vega || 0) * mult;
  });

  updateGreeksDashboard(netGreeks);
}

// ============ TIME DECAY ============
function updateTimeDecayBar() {
  const scenario = GameState.activePuzzle;
  if (!scenario) return;

  const maxDays = scenario.maxDays || 45;
  const pct = (scenario.daysToExpiry / maxDays) * 100;

  const fill = document.getElementById('time-decay-fill');
  fill.style.width = pct + '%';

  // Color transitions
  fill.classList.remove('warning', 'danger');
  if (scenario.daysToExpiry <= 15) fill.classList.add('danger');
  else if (scenario.daysToExpiry <= 30) fill.classList.add('warning');

  document.getElementById('time-decay-value').textContent = scenario.daysToExpiry + ' days';
}

function updateDecayDisplay() {
  // Update the active position's displayed premium in the chain
  const scenario = GameState.activePuzzle;
  if (!scenario || !scenario.activePosition) return;

  const posCard = document.getElementById('active-position-card');
  if (posCard) {
    const pos = scenario.activePosition;
    const currentValue = pos.premium * 100;
    const originalValue = pos.originalPremium * 100;
    const loss = originalValue - currentValue;
    posCard.querySelector('.pos-premium').textContent = `$${pos.premium.toFixed(2)} ($${currentValue.toFixed(0)})`;
    posCard.querySelector('.pos-loss').textContent = `-$${loss.toFixed(0)} lost to decay`;
    posCard.querySelector('.pos-loss').style.color = loss > originalValue * 0.5 ? 'var(--danger)' : 'var(--warning-dark)';
  }
}

// ============ ACTIVE POSITION (Level 2) ============
function renderActivePosition(scenario) {
  const chain = document.getElementById('option-chain');
  const pos = scenario.activePosition;

  // Replace chain with active position card
  chain.innerHTML = '';

  const card = document.createElement('div');
  card.id = 'active-position-card';
  card.className = 'active-position-card';
  card.style.cssText = 'background: var(--bg-card); border-radius: var(--radius-md); padding: var(--spacing-lg); box-shadow: var(--shadow-md); text-align: center; cursor: pointer; border: 2px solid var(--primary-light);';
  card.innerHTML = `
    <div style="font-size: 0.8rem; color: var(--text-light); margin-bottom: 4px;">YOUR POSITION</div>
    <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 8px;">
      Long $${pos.strike} Call
    </div>
    <div class="pos-premium" style="font-family: var(--font-mono); font-size: 1.3rem; font-weight: 700; margin-bottom: 4px;">
      $${pos.premium.toFixed(2)} ($${(pos.premium * 100).toFixed(0)})
    </div>
    <div class="pos-loss" style="font-size: 0.85rem; color: var(--warning-dark);">
      Original: $${pos.originalPremium.toFixed(2)} ($${(pos.originalPremium * 100).toFixed(0)})
    </div>
    <div style="margin-top: 12px;">
      <button class="btn btn-danger" id="btn-sell-position" style="width: 100%;">
        SELL NOW - Lock in $${(pos.premium * 100).toFixed(0)}
      </button>
    </div>
  `;

  chain.appendChild(card);

  // Sell button handler
  document.getElementById('btn-sell-position').addEventListener('click', () => {
    stopTimeDecay();
    scenario.soldEarly = true;
    scenario.sellPrice = pos.premium;

    const profit = (pos.premium - pos.originalPremium) * 100;
    const won = pos.premium > pos.originalPremium * 0.3; // Kept more than 30%

    GameState.lastResult = {
      won,
      legs: [pos],
      metrics: {
        maxProfit: 0,
        maxLoss: -Math.round(pos.originalPremium * 100),
        breakevens: [pos.strike + pos.originalPremium]
      },
      feedback: won
        ? `You sold at $${pos.premium.toFixed(2)} and kept $${(pos.premium * 100).toFixed(0)} of the original $${(pos.originalPremium * 100).toFixed(0)}. Smart timing!`
        : `You held too long. Only recovered $${(pos.premium * 100).toFixed(0)} of the original $${(pos.originalPremium * 100).toFixed(0)}.`,
      explanation: 'Time decay (Theta) accelerates dramatically in the last 30-45 days. ' +
        'As a buyer, you must be aware that your option loses value every single day. ' +
        'OTM options have ZERO intrinsic value - their entire premium is extrinsic and will decay to zero.'
    };

    completeLevel(1, won);
    navigate('results');
  });

  // Update submit button to disabled for this level
  document.getElementById('btn-submit-strategy').disabled = true;
}

// ============ RESULTS RENDERING ============
function renderResults() {
  const result = GameState.lastResult;
  if (!result) return;

  // Verdict
  const icon = document.getElementById('verdict-icon');
  const title = document.getElementById('verdict-title');
  const subtitle = document.getElementById('verdict-subtitle');

  if (result.won) {
    icon.textContent = '\u{1F3C6}';
    title.textContent = 'Victory!';
    title.style.color = 'var(--success)';
    subtitle.textContent = 'You defeated the Algo!';
  } else {
    icon.textContent = '\u{1F4A5}';
    title.textContent = 'Not Quite!';
    title.style.color = 'var(--danger)';
    subtitle.textContent = 'The Algo got you this time. Try again!';
  }

  // Stock movement display
  const moveEl = document.getElementById('stock-movement');
  if (result.startPrice && result.endPrice) {
    moveEl.classList.remove('hidden');
    document.getElementById('move-start').textContent = '$' + result.startPrice.toFixed(2);
    document.getElementById('move-end').textContent = '$' + result.endPrice.toFixed(2);

    const endEl = document.getElementById('move-end');
    const moved = result.endPrice - result.startPrice;
    endEl.className = 'price-end ' + (moved >= 0 ? 'up' : 'down');
    document.getElementById('move-arrow').innerHTML = moved >= 0 ? '&#8599;' : '&#8600;';

    const pnlEl = document.getElementById('actual-pnl');
    pnlEl.textContent = (result.actualPnL >= 0 ? '+' : '') + '$' + Math.round(result.actualPnL).toLocaleString();
    pnlEl.className = 'actual-pnl ' + (result.actualPnL >= 0 ? 'profit' : 'loss');
  } else {
    moveEl.classList.add('hidden');
  }

  // P&L explanation
  const explainEl = document.getElementById('pnl-explanation');
  if (result.pnlExplanation) {
    explainEl.classList.remove('hidden');
    document.getElementById('pnl-explain-text').innerHTML = result.pnlExplanation;
  } else {
    explainEl.classList.add('hidden');
  }

  // Metrics
  document.getElementById('metric-max-profit').textContent = '$' + result.metrics.maxProfit.toLocaleString();
  document.getElementById('metric-max-loss').textContent = '$' + result.metrics.maxLoss.toLocaleString();
  document.getElementById('metric-breakeven').textContent = result.metrics.breakevens.length > 0
    ? result.metrics.breakevens.map(b => '$' + b.toFixed(2)).join(', ')
    : 'N/A';

  // Explanation
  document.getElementById('results-explanation').innerHTML = result.explanation || result.feedback;

  // P&L Graph
  drawPnLGraph(result.legs, GameState.activePuzzle?.currentPrice || 100);

  // Next level button
  const nextBtn = document.getElementById('btn-next-level');
  if (result.won && GameState.currentLevel < 8) {
    nextBtn.classList.remove('hidden');
    nextBtn.textContent = `Next: Level ${GameState.currentLevel + 2}`;
  } else if (result.won && GameState.currentLevel === 8) {
    nextBtn.classList.remove('hidden');
    nextBtn.textContent = 'You mastered all levels!';
  } else {
    nextBtn.classList.add('hidden');
  }
}

// ============ P&L CANVAS GRAPH ============
function drawPnLGraph(legs, currentPrice) {
  const canvas = document.getElementById('pnl-canvas');
  const ctx = canvas.getContext('2d');

  // High DPI support
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const padding = { top: 30, right: 20, bottom: 40, left: 55 };
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  // Calculate price range
  const minPrice = Math.max(0, currentPrice * 0.7);
  const maxPrice = currentPrice * 1.3;

  // Calculate payoffs
  const points = [];
  let yMin = 0, yMax = 0;
  const numPoints = 200;

  for (let i = 0; i <= numPoints; i++) {
    const price = minPrice + (maxPrice - minPrice) * (i / numPoints);
    const payoff = calculatePayoff(legs, price);
    points.push({ x: price, y: payoff });
    yMin = Math.min(yMin, payoff);
    yMax = Math.max(yMax, payoff);
  }

  // Add padding to y range
  const yRange = Math.max(100, yMax - yMin);
  yMin = yMin - yRange * 0.1;
  yMax = yMax + yRange * 0.1;

  // Map functions
  const mapX = (price) => padding.left + ((price - minPrice) / (maxPrice - minPrice)) * plotW;
  const mapY = (payoff) => padding.top + plotH - ((payoff - yMin) / (yMax - yMin)) * plotH;

  // Animated draw
  let animProgress = 0;
  const animDuration = 60; // frames

  function animate() {
    animProgress++;
    const progress = Math.min(1, animProgress / animDuration);
    const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#fafbff';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const y = padding.top + (plotH / ySteps) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
    }

    // Zero line
    const zeroY = mapY(0);
    if (zeroY > padding.top && zeroY < padding.top + plotH) {
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding.left, zeroY);
      ctx.lineTo(w - padding.right, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Current price line
    const cpX = mapX(currentPrice);
    ctx.strokeStyle = '#a29bfe';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cpX, padding.top);
    ctx.lineTo(cpX, padding.top + plotH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#6c5ce7';
    ctx.font = '11px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$' + currentPrice.toFixed(0), cpX, padding.top - 8);

    // P&L line with clip for animation
    ctx.save();
    ctx.beginPath();
    ctx.rect(padding.left, padding.top, plotW * eased, plotH);
    ctx.clip();

    // Fill profit/loss areas
    ctx.beginPath();
    ctx.moveTo(mapX(points[0].x), zeroY);
    points.forEach(p => ctx.lineTo(mapX(p.x), mapY(p.y)));
    ctx.lineTo(mapX(points[points.length - 1].x), zeroY);
    ctx.closePath();

    // Create gradient fill
    const gradient = ctx.createLinearGradient(0, mapY(yMax), 0, mapY(yMin));
    gradient.addColorStop(0, 'rgba(0, 184, 148, 0.15)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(1, 'rgba(225, 112, 85, 0.15)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw the P&L line
    ctx.beginPath();
    ctx.moveTo(mapX(points[0].x), mapY(points[0].y));
    points.forEach(p => ctx.lineTo(mapX(p.x), mapY(p.y)));
    ctx.strokeStyle = '#6c5ce7';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Color segments (profit green, loss red)
    for (let i = 1; i < points.length; i++) {
      ctx.beginPath();
      ctx.moveTo(mapX(points[i - 1].x), mapY(points[i - 1].y));
      ctx.lineTo(mapX(points[i].x), mapY(points[i].y));
      ctx.strokeStyle = points[i].y >= 0 ? '#00b894' : '#e17055';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.restore();

    // Breakevens
    if (eased > 0.5) {
      const metrics = calculateStrategyMetrics(legs, currentPrice);
      metrics.breakevens.forEach(be => {
        const bx = mapX(be);
        if (bx > padding.left && bx < w - padding.right) {
          ctx.fillStyle = '#fdcb6e';
          ctx.beginPath();
          ctx.arc(bx, zeroY, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#e8a917';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#2d3436';
          ctx.font = '10px "Space Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('BE: $' + be.toFixed(0), bx, zeroY - 12);
        }
      });
    }

    // Y-axis labels
    ctx.fillStyle = '#636e72';
    ctx.font = '10px "Space Mono", monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= ySteps; i++) {
      const val = yMax - (yMax - yMin) * (i / ySteps);
      const y = padding.top + (plotH / ySteps) * i;
      ctx.fillText('$' + Math.round(val), padding.left - 8, y + 4);
    }

    // X-axis labels
    ctx.textAlign = 'center';
    const xSteps = 5;
    for (let i = 0; i <= xSteps; i++) {
      const price = minPrice + (maxPrice - minPrice) * (i / xSteps);
      const x = padding.left + (plotW / xSteps) * i;
      ctx.fillText('$' + Math.round(price), x, padding.top + plotH + 20);
    }

    // Axis labels
    ctx.fillStyle = '#b2bec3';
    ctx.font = '10px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Stock Price at Expiration', padding.left + plotW / 2, h - 4);

    ctx.save();
    ctx.translate(12, padding.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Profit / Loss', 0, 0);
    ctx.restore();

    if (animProgress < animDuration) {
      requestAnimationFrame(animate);
    } else {
      // Draw max profit / loss labels at the end
      drawPnLLabels(ctx, legs, points, mapX, mapY, padding, plotH, w);
    }
  }

  requestAnimationFrame(animate);

  // Legend
  renderPnLLegend(legs);
}

function drawPnLLabels(ctx, legs, points, mapX, mapY, padding, plotH, w) {
  const maxPoint = points.reduce((a, b) => a.y > b.y ? a : b);
  const minPoint = points.reduce((a, b) => a.y < b.y ? a : b);

  // Max profit label
  if (maxPoint.y > 0) {
    const x = Math.min(w - 60, Math.max(60, mapX(maxPoint.x)));
    ctx.fillStyle = '#00b894';
    ctx.font = 'bold 11px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MAX +$' + Math.round(maxPoint.y), x, mapY(maxPoint.y) - 10);
  }

  // Max loss label
  if (minPoint.y < 0) {
    const x = Math.min(w - 60, Math.max(60, mapX(minPoint.x)));
    ctx.fillStyle = '#e17055';
    ctx.font = 'bold 11px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MAX -$' + Math.abs(Math.round(minPoint.y)), x, mapY(minPoint.y) + 18);
  }
}

function renderPnLLegend(legs) {
  const legend = document.getElementById('pnl-legend');
  legend.innerHTML = '';

  legs.forEach(leg => {
    const item = document.createElement('div');
    item.className = 'pnl-legend-item';
    const color = leg.direction === 'long' ? '#00b894' : '#e17055';
    item.innerHTML = `
      <div class="pnl-legend-color" style="background: ${color}"></div>
      <span>${leg.direction === 'long' ? 'Long' : 'Short'} $${leg.strike} ${leg.type.charAt(0).toUpperCase() + leg.type.slice(1)}</span>
    `;
    legend.appendChild(item);
  });

  // Combined line
  if (legs.length > 1) {
    const item = document.createElement('div');
    item.className = 'pnl-legend-item';
    item.innerHTML = `
      <div class="pnl-legend-color" style="background: #6c5ce7"></div>
      <span>Combined P&L</span>
    `;
    legend.appendChild(item);
  }
}
