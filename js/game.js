/* ============================================
   OptionMaster: Defeat the Algos
   Core Game Engine
   ============================================ */

// ============ GAME STATE ============
const STORAGE_KEY = 'optionmaster_save';

const GameState = {
  currentScreen: 'menu',
  currentLevel: 0,
  unlockedLevel: 0,
  completedLevels: [],
  portfolio: { cash: 10000 },
  activePuzzle: null,
  currentStep: 0,
  selectedLegs: [],
  cheatCodesUsed: []
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      GameState.unlockedLevel = saved.unlockedLevel || 0;
      GameState.completedLevels = saved.completedLevels || [];
      GameState.portfolio = saved.portfolio || { cash: 10000 };
      GameState.cheatCodesUsed = saved.cheatCodesUsed || [];
    }
  } catch (e) {
    console.warn('Failed to load save:', e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      unlockedLevel: GameState.unlockedLevel,
      completedLevels: GameState.completedLevels,
      portfolio: GameState.portfolio,
      cheatCodesUsed: GameState.cheatCodesUsed
    }));
  } catch (e) {
    console.warn('Failed to save:', e);
  }
}

function resetProgress() {
  localStorage.removeItem(STORAGE_KEY);
  GameState.unlockedLevel = 0;
  GameState.completedLevels = [];
  GameState.portfolio = { cash: 10000 };
  GameState.cheatCodesUsed = [];
  GameState.selectedLegs = [];
  GameState.activePuzzle = null;
  GameState.currentStep = 0;
  navigate('menu');
}

// ============ SCREEN ROUTER ============
function navigate(screen) {
  GameState.currentScreen = screen;
  document.querySelectorAll('[data-screen]').forEach(s => {
    s.classList.add('hidden');
  });
  const target = document.querySelector(`[data-screen="${screen}"]`);
  if (target) {
    target.classList.remove('hidden');
  }
  // Screen-specific initialization
  if (screenInitializers[screen]) {
    screenInitializers[screen]();
  }
  // Scroll to top
  window.scrollTo(0, 0);
}

const screenInitializers = {
  menu: initMenuScreen,
  howToPlay: () => {},
  levelSelect: initLevelSelect,
  gameplay: initGameplay,
  results: initResults
};

// ============ MENU SCREEN ============
function initMenuScreen() {
  // Nothing special needed
}

// ============ LEVEL SELECT ============
function initLevelSelect() {
  renderLevelSelect();
}

// ============ GAMEPLAY ============
function initGameplay() {
  const level = getLevelDef(GameState.currentLevel);
  if (!level) return;

  GameState.selectedLegs = [];
  GameState.currentStep = 0;
  GameState.activePuzzle = level.generateScenario();

  renderGameplay();
}

// ============ RESULTS ============
function initResults() {
  renderResults();
}

// ============ LEVEL COMPLETION ============
function completeLevel(levelIndex, won) {
  if (won) {
    if (!GameState.completedLevels.includes(levelIndex)) {
      GameState.completedLevels.push(levelIndex);
    }
    if (levelIndex >= GameState.unlockedLevel && levelIndex < 8) {
      GameState.unlockedLevel = levelIndex + 1;
    }
  }
  saveState();
}

// ============ CHEAT CODE SYSTEM ============
const CHEAT_CODES = {
  'SKIPPY': {
    desc: 'Skip to next level',
    action: () => {
      if (GameState.unlockedLevel < 8) {
        GameState.unlockedLevel++;
        saveState();
        return 'Next level unlocked!';
      }
      return 'All levels already unlocked!';
    }
  },
  'IRONMAN': {
    desc: 'Unlock all levels',
    action: () => {
      GameState.unlockedLevel = 8;
      saveState();
      return 'All 9 levels unlocked!';
    }
  },
  'SHOWMETHE': {
    desc: 'Add $50,000 cash',
    action: () => {
      GameState.portfolio.cash += 50000;
      saveState();
      return '+$50,000 added to portfolio!';
    }
  },
  'GREEKGOD': {
    desc: 'Show Greeks on all levels',
    action: () => {
      GameState.cheatCodesUsed.push('GREEKGOD');
      saveState();
      return 'Greeks visible on all levels!';
    }
  },
  'LEVEL': {
    desc: 'Jump to specific level (LEVEL1-LEVEL9)',
    action: () => null // handled specially
  }
};

function processCheatCode(code) {
  const upper = code.toUpperCase().trim();

  // Handle LEVEL1 through LEVEL9
  const levelMatch = upper.match(/^LEVEL(\d)$/);
  if (levelMatch) {
    const lvl = parseInt(levelMatch[1]) - 1;
    if (lvl >= 0 && lvl <= 8) {
      if (lvl > GameState.unlockedLevel) {
        GameState.unlockedLevel = lvl;
      }
      saveState();
      return { success: true, message: `Level ${lvl + 1} unlocked!` };
    }
  }

  if (CHEAT_CODES[upper] && upper !== 'LEVEL') {
    const msg = CHEAT_CODES[upper].action();
    if (!GameState.cheatCodesUsed.includes(upper)) {
      GameState.cheatCodesUsed.push(upper);
      saveState();
    }
    return { success: true, message: msg };
  }

  return { success: false, message: 'Invalid code. Try again!' };
}

// Desktop keyboard cheat buffer
let cheatBuffer = '';
let cheatTimeout = null;

document.addEventListener('keypress', (e) => {
  // Only on menu screen
  if (GameState.currentScreen !== 'menu' && GameState.currentScreen !== 'levelSelect') return;

  cheatBuffer += e.key.toUpperCase();
  clearTimeout(cheatTimeout);
  cheatTimeout = setTimeout(() => { cheatBuffer = ''; }, 2000);

  // Check all codes
  for (const code of Object.keys(CHEAT_CODES)) {
    if (cheatBuffer.endsWith(code)) {
      const result = processCheatCode(code);
      if (result.success) {
        showCheatFeedback(result.message, true);
        cheatBuffer = '';
      }
    }
  }

  // Check LEVEL codes
  const match = cheatBuffer.match(/LEVEL(\d)$/);
  if (match) {
    const result = processCheatCode('LEVEL' + match[1]);
    if (result.success) {
      showCheatFeedback(result.message, true);
      cheatBuffer = '';
    }
  }
});

function showCheatFeedback(message, success) {
  const feedback = document.getElementById('cheat-feedback');
  if (feedback) {
    feedback.textContent = message;
    feedback.className = 'cheat-feedback ' + (success ? 'success' : 'error');
    setTimeout(() => { feedback.textContent = ''; feedback.className = 'cheat-feedback'; }, 3000);
  }
}

// Mobile triple-tap for cheat input
let tapCount = 0;
let tapTimeout = null;

// ============ OPTION SELECTION LOGIC ============
function addLeg(type, direction, strike, premium, greeks) {
  const level = getLevelDef(GameState.currentLevel);
  const scenario = GameState.activePuzzle;
  const maxLegs = level.maxLegs || 4;

  if (GameState.selectedLegs.length >= maxLegs) return;

  // Check if already selected this exact option
  const exists = GameState.selectedLegs.find(
    l => l.type === type && l.strike === strike
  );
  if (exists) return;

  GameState.selectedLegs.push({
    type,
    direction,
    strike,
    premium,
    quantity: 1,
    underlyingPrice: scenario.currentPrice,
    greeks: greeks || {}
  });

  renderSelectedLegs();
  updateStrategyInfo();
  updateSubmitButton();
}

function removeLeg(index) {
  GameState.selectedLegs.splice(index, 1);
  renderSelectedLegs();
  updateStrategyInfo();
  updateSubmitButton();
}

function clearLegs() {
  GameState.selectedLegs = [];
  renderSelectedLegs();
  updateStrategyInfo();
  updateSubmitButton();
  // Clear chain selections
  document.querySelectorAll('.chain-option.selected-long, .chain-option.selected-short').forEach(el => {
    el.classList.remove('selected-long', 'selected-short');
  });
}

// ============ STRATEGY IDENTIFICATION ============
function identifyStrategy(legs) {
  if (legs.length === 0) return '';
  if (legs.length === 1) {
    const l = legs[0];
    return `${l.direction === 'long' ? 'Long' : 'Short'} ${l.type === 'call' ? 'Call' : 'Put'}`;
  }

  const calls = legs.filter(l => l.type === 'call');
  const puts = legs.filter(l => l.type === 'put');
  const longLegs = legs.filter(l => l.direction === 'long');
  const shortLegs = legs.filter(l => l.direction === 'short');

  if (legs.length === 2) {
    // Straddle: same strike, one call one put, both long
    if (calls.length === 1 && puts.length === 1 &&
        calls[0].strike === puts[0].strike &&
        longLegs.length === 2) {
      return 'Long Straddle';
    }
    // Strangle: different strikes, one call one put, both long
    if (calls.length === 1 && puts.length === 1 &&
        calls[0].strike !== puts[0].strike &&
        longLegs.length === 2) {
      return 'Long Strangle';
    }
    // Bull Call Spread
    if (calls.length === 2 && longLegs.length === 1 && shortLegs.length === 1) {
      const longCall = calls.find(c => c.direction === 'long');
      const shortCall = calls.find(c => c.direction === 'short');
      if (longCall && shortCall && longCall.strike < shortCall.strike) {
        return 'Bull Call Spread';
      }
      if (longCall && shortCall && longCall.strike > shortCall.strike) {
        return 'Bear Call Spread';
      }
    }
    // Bull Put Spread / Bear Put Spread
    if (puts.length === 2 && longLegs.length === 1 && shortLegs.length === 1) {
      const longPut = puts.find(p => p.direction === 'long');
      const shortPut = puts.find(p => p.direction === 'short');
      if (longPut && shortPut && longPut.strike < shortPut.strike) {
        return 'Bull Put Spread';
      }
      if (longPut && shortPut && longPut.strike > shortPut.strike) {
        return 'Bear Put Spread';
      }
    }
    // Covered Call (long stock + short call) - represented as long put surrogate
    // Married Put (long stock + long put)
    // Collar: long put + short call
    if (calls.length === 1 && puts.length === 1) {
      if (calls[0].direction === 'short' && puts[0].direction === 'long') {
        return 'Collar';
      }
    }
  }

  if (legs.length === 4) {
    // Iron Condor: short put spread + short call spread
    if (calls.length === 2 && puts.length === 2) {
      const shortPut = puts.find(p => p.direction === 'short');
      const longPut = puts.find(p => p.direction === 'long');
      const shortCall = calls.find(c => c.direction === 'short');
      const longCall = calls.find(c => c.direction === 'long');
      if (shortPut && longPut && shortCall && longCall &&
          longPut.strike < shortPut.strike &&
          shortCall.strike < longCall.strike) {
        return 'Iron Condor';
      }
    }
  }

  return 'Custom Strategy';
}

// ============ P&L CALCULATION ============
function calculatePayoff(legs, priceAtExpiry) {
  let totalPayoff = 0;
  for (const leg of legs) {
    let intrinsic = 0;
    if (leg.type === 'call') {
      intrinsic = Math.max(0, priceAtExpiry - leg.strike);
    } else {
      intrinsic = Math.max(0, leg.strike - priceAtExpiry);
    }

    if (leg.direction === 'long') {
      totalPayoff += (intrinsic - leg.premium) * 100;
    } else {
      totalPayoff += (leg.premium - intrinsic) * 100;
    }
  }
  return totalPayoff;
}

function calculateStrategyMetrics(legs, currentPrice) {
  const minPrice = Math.max(0, currentPrice * 0.7);
  const maxPrice = currentPrice * 1.3;
  const step = (maxPrice - minPrice) / 200;

  let maxProfit = -Infinity;
  let maxLoss = Infinity;
  const breakevens = [];

  let prevPayoff = null;
  for (let price = minPrice; price <= maxPrice; price += step) {
    const payoff = calculatePayoff(legs, price);
    maxProfit = Math.max(maxProfit, payoff);
    maxLoss = Math.min(maxLoss, payoff);

    // Find breakevens (where payoff crosses 0)
    if (prevPayoff !== null && ((prevPayoff < 0 && payoff >= 0) || (prevPayoff >= 0 && payoff < 0))) {
      breakevens.push(Math.round(price * 100) / 100);
    }
    prevPayoff = payoff;
  }

  return {
    maxProfit: Math.round(maxProfit),
    maxLoss: Math.round(maxLoss),
    breakevens
  };
}

// ============ SUBMISSION & VALIDATION ============
function submitStrategy() {
  const level = getLevelDef(GameState.currentLevel);
  if (!level) return;

  const step = level.steps ? level.steps[GameState.currentStep] : level;
  const result = step.validate(GameState.selectedLegs, GameState.activePuzzle);

  if (result.correct) {
    // Multi-step level?
    if (level.steps && GameState.currentStep < level.steps.length - 1) {
      showStepComplete(result.feedback, () => {
        GameState.currentStep++;
        GameState.selectedLegs = [];
        const nextStep = level.steps[GameState.currentStep];
        // Update scenario if step modifies it
        if (nextStep.modifyScenario) {
          nextStep.modifyScenario(GameState.activePuzzle);
        }
        renderGameplay();
      });
      return;
    }

    // Final step or single-step level - show results
    const metrics = calculateStrategyMetrics(
      GameState.selectedLegs,
      GameState.activePuzzle.currentPrice
    );
    GameState.lastResult = {
      won: true,
      legs: [...GameState.selectedLegs],
      metrics,
      feedback: result.feedback,
      explanation: result.explanation || level.explanation
    };
    completeLevel(GameState.currentLevel, true);
    navigate('results');
  } else {
    // Show feedback in puzzle instruction
    showFeedback(result.feedback, false);
  }
}

function showFeedback(message, success) {
  const el = document.getElementById('puzzle-instruction');
  el.innerHTML = message;
  el.style.borderLeftColor = success ? 'var(--success)' : 'var(--danger)';
  el.style.background = success
    ? 'rgba(0, 184, 148, 0.1)'
    : 'rgba(225, 112, 85, 0.1)';

  // Reset after 4 seconds
  setTimeout(() => {
    const level = getLevelDef(GameState.currentLevel);
    const step = level.steps ? level.steps[GameState.currentStep] : level;
    el.innerHTML = step.objective;
    el.style.borderLeftColor = '';
    el.style.background = '';
  }, 4000);
}

function showStepComplete(message, onNext) {
  const overlay = document.getElementById('step-overlay');
  document.getElementById('step-text').textContent = message;
  overlay.classList.remove('hidden');

  const btn = document.getElementById('btn-next-step');
  btn.onclick = () => {
    overlay.classList.add('hidden');
    onNext();
  };
}

// ============ ROLL MECHANIC ============
function showRollModal() {
  const level = getLevelDef(GameState.currentLevel);
  if (!level.rollOptions) return;

  const modal = document.getElementById('roll-modal');
  const container = document.getElementById('roll-options');
  container.innerHTML = '';

  level.rollOptions.forEach((opt, i) => {
    const div = document.createElement('div');
    div.className = 'roll-option';
    div.innerHTML = `
      <h4>${opt.name}</h4>
      <p>${opt.description}</p>
      <span class="roll-cost">${opt.cost > 0 ? 'Debit: $' + opt.cost : 'Credit: $' + Math.abs(opt.cost)}</span>
    `;
    div.addEventListener('click', () => {
      executeRoll(opt);
      modal.classList.add('hidden');
    });
    container.appendChild(div);
  });

  modal.classList.remove('hidden');
}

function executeRoll(rollOption) {
  // Update the active puzzle with rolled position
  if (rollOption.apply) {
    rollOption.apply(GameState.activePuzzle, GameState.selectedLegs);
  }
  GameState.portfolio.cash -= rollOption.cost;
  renderGameplay();
  showFeedback(`Rolled! ${rollOption.result}`, true);
}

// ============ TIME DECAY ENGINE ============
let decayInterval = null;

function startTimeDecay() {
  stopTimeDecay();
  if (!GameState.activePuzzle || !GameState.activePuzzle.daysToExpiry) return;

  decayInterval = setInterval(() => {
    if (GameState.currentScreen !== 'gameplay') {
      stopTimeDecay();
      return;
    }

    GameState.activePuzzle.daysToExpiry--;
    updateTimeDecayBar();

    // Update premium based on theta
    if (GameState.activePuzzle.activePosition) {
      const pos = GameState.activePuzzle.activePosition;
      const dte = GameState.activePuzzle.daysToExpiry;
      // Accelerating decay: more aggressive in last 30 days
      const decayRate = dte < 15 ? 0.08 : dte < 30 ? 0.04 : 0.02;
      pos.premium = Math.max(0.01, pos.premium * (1 - decayRate));
      updateDecayDisplay();
    }

    if (GameState.activePuzzle.daysToExpiry <= 0) {
      stopTimeDecay();
      handleExpiration();
    }
  }, 2000); // Each tick = 1 game day
}

function stopTimeDecay() {
  if (decayInterval) {
    clearInterval(decayInterval);
    decayInterval = null;
  }
}

function handleExpiration() {
  const level = getLevelDef(GameState.currentLevel);
  if (level.onExpiration) {
    level.onExpiration(GameState.activePuzzle, GameState);
  }
}

// ============ CONFIRM DIALOG ============
function showConfirm(title, text, onYes) {
  const modal = document.getElementById('confirm-modal');
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-text').textContent = text;
  modal.classList.remove('hidden');

  document.getElementById('confirm-yes').onclick = () => {
    modal.classList.add('hidden');
    onYes();
  };
  document.getElementById('confirm-no').onclick = () => {
    modal.classList.add('hidden');
  };
}

// ============ EVENT LISTENERS ============
document.addEventListener('DOMContentLoaded', () => {
  loadState();

  // Menu buttons
  document.getElementById('btn-play').addEventListener('click', () => navigate('levelSelect'));
  document.getElementById('btn-how-to-play').addEventListener('click', () => navigate('howToPlay'));
  document.getElementById('btn-reset-progress').addEventListener('click', () => {
    showConfirm('Reset Progress', 'This will erase all your progress. Are you sure?', resetProgress);
  });

  // Back buttons
  document.getElementById('btn-back-howto').addEventListener('click', () => navigate('menu'));
  document.getElementById('btn-back-levels').addEventListener('click', () => navigate('menu'));
  document.getElementById('btn-back-gameplay').addEventListener('click', () => {
    stopTimeDecay();
    navigate('levelSelect');
  });

  // Gameplay buttons
  document.getElementById('btn-start-puzzle').addEventListener('click', () => {
    document.getElementById('briefing-overlay').classList.add('hidden');
    const level = getLevelDef(GameState.currentLevel);
    if (level.hasTimeDecay) startTimeDecay();
  });

  document.getElementById('btn-clear-legs').addEventListener('click', clearLegs);
  document.getElementById('btn-submit-strategy').addEventListener('click', submitStrategy);
  document.getElementById('btn-roll').addEventListener('click', showRollModal);

  // Roll modal cancel
  document.getElementById('roll-cancel').addEventListener('click', () => {
    document.getElementById('roll-modal').classList.add('hidden');
  });

  // Results buttons
  document.getElementById('btn-next-level').addEventListener('click', () => {
    if (GameState.currentLevel < 8) {
      GameState.currentLevel++;
      navigate('gameplay');
    } else {
      navigate('levelSelect');
    }
  });
  document.getElementById('btn-retry-level').addEventListener('click', () => {
    navigate('gameplay');
  });
  document.getElementById('btn-back-to-levels').addEventListener('click', () => {
    navigate('levelSelect');
  });

  // Cheat code - mobile triple-tap
  const title = document.getElementById('game-title');
  if (title) {
    title.addEventListener('click', () => {
      tapCount++;
      clearTimeout(tapTimeout);
      tapTimeout = setTimeout(() => { tapCount = 0; }, 500);
      if (tapCount >= 3) {
        tapCount = 0;
        document.getElementById('cheat-modal').classList.remove('hidden');
        document.getElementById('cheat-input').value = '';
        document.getElementById('cheat-input').focus();
      }
    });
  }

  document.getElementById('cheat-submit').addEventListener('click', () => {
    const input = document.getElementById('cheat-input');
    const result = processCheatCode(input.value);
    const feedback = document.getElementById('cheat-feedback');
    feedback.textContent = result.message;
    feedback.className = 'cheat-feedback ' + (result.success ? 'success' : 'error');
    if (result.success) {
      input.value = '';
      setTimeout(() => {
        document.getElementById('cheat-modal').classList.add('hidden');
        feedback.textContent = '';
        // Refresh level select if visible
        if (GameState.currentScreen === 'levelSelect') renderLevelSelect();
      }, 1500);
    }
  });

  document.getElementById('cheat-close').addEventListener('click', () => {
    document.getElementById('cheat-modal').classList.add('hidden');
  });

  // Contract reminder toggle (compact mode)
  const reminder = document.getElementById('contract-reminder');
  if (reminder) {
    reminder.addEventListener('click', () => {
      if (reminder.classList.contains('compact')) {
        reminder.classList.remove('compact');
        setTimeout(() => reminder.classList.add('compact'), 3000);
      }
    });
  }

  // Start at menu
  navigate('menu');
});
