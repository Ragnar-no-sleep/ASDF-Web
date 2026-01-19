'use strict';

// ============================================
// ASDF Learn - Interactive Learning Journey
// Minimal JS matching the current HTML
// ============================================

// State
const state = {
  currentPhase: 1,
  completedPhases: [],
  exploreClicked: new Set()
};

// DOM Elements
let elements = {};

// ============================================
// INITIALIZATION
// ============================================

function init() {
  // Cache DOM elements
  elements = {
    body: document.body,
    container: document.getElementById('container'),
    progress: document.getElementById('progress'),
    level: document.getElementById('level'),
    phases: document.querySelectorAll('.phase'),
    swipeMasks: document.querySelectorAll('.swipe-mask'),
    dragSlider: document.getElementById('drag-slider'),
    dragHandle: document.getElementById('drag-handle'),
    dragBg: document.getElementById('drag-bg'),
    burnBox: document.getElementById('burn-box'),
    burnCount: document.getElementById('burn-count'),
    burnDots: document.querySelectorAll('.burn-dot'),
    typeWrap: document.getElementById('type-wrap'),
    typeInput: document.getElementById('type-input'),
    typeHint: document.getElementById('type-hint'),
    explore: document.getElementById('explore'),
    exploreItems: document.querySelectorAll('.explore-item'),
    final: document.getElementById('final')
  };

  // Show the page
  elements.body.classList.add('ready');

  // Setup interactions
  setupSwipeMasks();
  setupDragSlider();
  setupBurnBox();
  setupTypeInput();
  setupExplore();
  setupScrollObserver();

  // Initialize first phase
  activatePhase(1);
  updateProgress();
}

// ============================================
// SWIPE MASKS
// ============================================

function setupSwipeMasks() {
  elements.swipeMasks.forEach(mask => {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    const width = mask.offsetWidth;

    const onStart = (e) => {
      isDragging = true;
      startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      mask.classList.add('dragging');
    };

    const onMove = (e) => {
      if (!isDragging) return;
      const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      currentX = Math.max(0, clientX - startX);
      mask.style.transform = `translateX(${currentX}px)`;
    };

    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      mask.classList.remove('dragging');

      if (currentX > width * 0.4) {
        mask.classList.add('done');
        const phaseNum = parseInt(mask.dataset.phase);
        completePhaseInteraction(phaseNum, 'swipe');
      } else {
        mask.style.transform = 'translateX(0)';
      }
      currentX = 0;
    };

    mask.addEventListener('mousedown', onStart);
    mask.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);
  });
}

// ============================================
// DRAG SLIDER (Phase 2)
// ============================================

function setupDragSlider() {
  const { dragSlider, dragHandle, dragBg } = elements;
  if (!dragSlider || !dragHandle) return;

  let isDragging = false;
  let startX = 0;
  const sliderWidth = dragSlider.offsetWidth;
  const handleWidth = dragHandle.offsetWidth;
  const maxDrag = sliderWidth - handleWidth - 8;

  const onStart = (e) => {
    isDragging = true;
    startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    dragHandle.classList.add('dragging');
    e.preventDefault();
  };

  const onMove = (e) => {
    if (!isDragging) return;
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const delta = clientX - startX;
    const newLeft = Math.min(maxDrag, Math.max(0, delta));
    dragHandle.style.left = `${4 + newLeft}px`;
    if (dragBg) {
      dragBg.style.transform = `scaleX(${newLeft / maxDrag})`;
    }
  };

  const onEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    dragHandle.classList.remove('dragging');

    const currentLeft = parseInt(dragHandle.style.left) || 4;
    if (currentLeft >= maxDrag * 0.85) {
      dragSlider.classList.add('done');
      completePhaseInteraction(2, 'drag');
    } else {
      dragHandle.style.left = '4px';
      if (dragBg) dragBg.style.transform = 'scaleX(0)';
    }
  };

  dragHandle.addEventListener('mousedown', onStart);
  dragHandle.addEventListener('touchstart', onStart, { passive: false });
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, { passive: true });
  document.addEventListener('mouseup', onEnd);
  document.addEventListener('touchend', onEnd);
}

// ============================================
// BURN BOX (Phase 3)
// ============================================

function setupBurnBox() {
  const { burnBox, burnCount, burnDots } = elements;
  if (!burnBox) return;

  let clicks = 0;
  const target = 5;

  burnBox.addEventListener('click', (e) => {
    if (burnBox.classList.contains('done')) return;

    clicks++;
    if (burnCount) burnCount.textContent = clicks;

    // Update dots
    if (burnDots && burnDots[clicks - 1]) {
      burnDots[clicks - 1].classList.add('on');
    }

    // Fire emoji animation
    const emoji = document.createElement('span');
    emoji.className = 'burn-emoji';
    emoji.textContent = '\u{1F525}';
    emoji.style.left = `${e.offsetX}px`;
    emoji.style.top = `${e.offsetY}px`;
    burnBox.appendChild(emoji);
    setTimeout(() => emoji.remove(), 800);

    if (clicks >= target) {
      burnBox.classList.add('done');
      completePhaseInteraction(3, 'burn');
    }
  });
}

// ============================================
// TYPE INPUT (Phase 4)
// ============================================

function setupTypeInput() {
  const { typeWrap, typeInput, typeHint } = elements;
  if (!typeInput) return;

  const phrase = 'this is fine';
  updateTypeHint('', phrase);

  typeInput.addEventListener('input', () => {
    const value = typeInput.value.toLowerCase().trim();
    updateTypeHint(value, phrase);

    if (value === phrase) {
      typeWrap.classList.add('done');
      completePhaseInteraction(4, 'type');
    } else if (value.length > 0 && !phrase.startsWith(value)) {
      typeInput.classList.add('shake');
      setTimeout(() => typeInput.classList.remove('shake'), 300);
    }
  });
}

function updateTypeHint(typed, phrase) {
  const { typeHint } = elements;
  if (!typeHint) return;

  let html = '';
  for (let i = 0; i < phrase.length; i++) {
    const char = phrase[i];
    const isTyped = i < typed.length && typed[i] === char;
    html += isTyped ? `<span class="on">${char}</span>` : char;
  }
  typeHint.innerHTML = html;
}

// ============================================
// EXPLORE GRID (Phase 5)
// ============================================

function setupExplore() {
  const { explore, exploreItems } = elements;
  if (!explore) return;

  exploreItems.forEach(item => {
    item.addEventListener('click', () => {
      item.classList.toggle('on');
      const tool = item.dataset.tool;

      if (item.classList.contains('on')) {
        state.exploreClicked.add(tool);
      } else {
        state.exploreClicked.delete(tool);
      }

      // Check if all 4 explored
      if (state.exploreClicked.size >= 4) {
        explore.classList.add('done');
        completePhaseInteraction(5, 'explore');
      }
    });
  });
}

// ============================================
// PHASE MANAGEMENT
// ============================================

function activatePhase(phaseNum) {
  state.currentPhase = phaseNum;

  elements.phases.forEach((phase, index) => {
    const num = index + 1;
    phase.classList.remove('active', 'locked', 'completed');

    if (num < phaseNum) {
      phase.classList.add('completed');
    } else if (num === phaseNum) {
      phase.classList.add('active');
    } else {
      phase.classList.add('locked');
    }
  });

  updateLevel(phaseNum);
}

function completePhaseInteraction(phaseNum, type) {
  if (!state.completedPhases.includes(phaseNum)) {
    state.completedPhases.push(phaseNum);
  }

  // Mark current phase as completed
  const currentPhase = document.getElementById(`phase-${phaseNum}`);
  if (currentPhase) {
    currentPhase.classList.add('completed');
    currentPhase.classList.remove('active');
  }

  // Unlock next phase
  const nextPhaseNum = phaseNum + 1;
  if (nextPhaseNum <= 5) {
    const nextPhase = document.getElementById(`phase-${nextPhaseNum}`);
    if (nextPhase) {
      nextPhase.classList.remove('locked');
      nextPhase.classList.add('active');
      state.currentPhase = nextPhaseNum;
      updateLevel(nextPhaseNum);
    }
  } else {
    // Show final section
    showFinal();
  }

  updateProgress();
}

function showFinal() {
  const { final, phases } = elements;
  if (final) {
    final.classList.add('show');
    // Scroll to final
    setTimeout(() => {
      final.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  }
}

// ============================================
// UI UPDATES
// ============================================

function updateProgress() {
  const { progress } = elements;
  if (!progress) return;

  const completed = state.completedPhases.length;
  const total = 5;
  const percent = (completed / total) * 100;
  progress.style.width = `${percent}%`;
}

function updateLevel(phaseNum) {
  const { level } = elements;
  if (!level) return;

  const levels = {
    1: 'Newcomer',
    2: 'Initiate',
    3: 'Initiate',
    4: 'Believer',
    5: 'Believer'
  };

  level.textContent = levels[phaseNum] || 'Newcomer';
}

// ============================================
// SCROLL OBSERVER
// ============================================

function setupScrollObserver() {
  const { container, phases } = elements;
  if (!container || !phases.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
        const phaseId = entry.target.id;
        const phaseNum = parseInt(phaseId.replace('phase-', ''));

        // Only auto-activate if it's already unlocked
        if (!entry.target.classList.contains('locked') && phaseNum !== state.currentPhase) {
          state.currentPhase = phaseNum;
          updateLevel(phaseNum);
        }
      }
    });
  }, {
    root: container,
    threshold: 0.5
  });

  phases.forEach(phase => observer.observe(phase));
}

// ============================================
// START
// ============================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
