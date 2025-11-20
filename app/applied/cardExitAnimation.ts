// app/applied/cardExitAnimation.ts
'use client';

type CardExitMode = 'move' | 'delete';

let stylesInjected = false;

const styles = `
@keyframes card-move-out {
  0% {
    transform: translateX(0) scale(1);
    opacity: 1;
    box-shadow: 0 10px 25px rgba(56, 189, 248, 0.35);
    background: linear-gradient(135deg, #e0f2fe, #eef2ff);
    border-color: rgba(56, 189, 248, 0.55);
  }
  55% {
    transform: translateX(8px) scale(1.02);
    background: linear-gradient(135deg, #bae6fd, #e0e7ff);
    border-color: rgba(56, 189, 248, 0.9);
  }
  100% {
    transform: translateX(40px) scale(0.97);
    opacity: 0;
    box-shadow: 0 20px 45px rgba(56, 189, 248, 0.45);
  }
}

.card-exit-move {
  animation: card-move-out 260ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

/* --- DELETE: warm red/rose tone --- */

@keyframes card-delete-out {
  0% {
    transform: translateX(0) scale(1);
    opacity: 1;
    box-shadow: 0 10px 25px rgba(248, 113, 113, 0.45);
    background: linear-gradient(135deg, #fef2f2, #fee2e2);
    border-color: rgba(248, 113, 113, 0.7);
  }
  45% {
    transform: translateX(-6px) scale(0.96);
    background: linear-gradient(135deg, #fee2e2, #fecaca);
    border-color: rgba(248, 113, 113, 1);
  }
  100% {
    transform: translateX(-40px) scale(0.9);
    opacity: 0;
    box-shadow: 0 20px 45px rgba(248, 113, 113, 0.65);
  }
}

.card-exit-delete {
  animation: card-delete-out 260ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
`;

function ensureStyles() {
  if (stylesInjected) return;
  if (typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.setAttribute('data-card-exit-animation', 'true');
  style.textContent = styles;
  document.head.appendChild(style);
  stylesInjected = true;
}

/**
 * Plays a small exit animation on a card element before you
 * actually remove it from state or navigate away.
 *
 * - elementId: the DOM id of the card (e.g. "application-card-123")
 * - mode: "move" | "delete" (different colors / motion)
 * - onDone: callback invoked after the animation completes
 */
export function animateCardExit(
  elementId: string,
  mode: CardExitMode,
  onDone?: () => void,
) {
  if (typeof document === 'undefined') {
    onDone?.();
    return;
  }

  const el = document.getElementById(elementId);
  if (!el) {
    onDone?.();
    return;
  }

  ensureStyles();

  const className = mode === 'delete' ? 'card-exit-delete' : 'card-exit-move';
  el.classList.add(className);

  const handleEnd = (event: Event) => {
    if (event.target !== el) return;
    el.removeEventListener('animationend', handleEnd);
    onDone?.();
  };

  el.addEventListener('animationend', handleEnd);
}
