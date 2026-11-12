// Entry Point

import { Game } from './engine/Game.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');

  // Handle responsive canvas scaling for various landscape displays
  const resizeCanvas = () => {
    const container = document.getElementById('game-container');
    const targetRatio = 16 / 9;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const winRatio = winW / winH;

    let displayW, displayH;
    if (winRatio > targetRatio) {
      displayH = winH;
      displayW = winH * targetRatio;
    } else {
      displayW = winW;
      displayH = winW / targetRatio;
    }

    container.style.width = `${Math.floor(displayW)}px`;
    container.style.height = `${Math.floor(displayH)}px`;
  };

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', resizeCanvas);
  resizeCanvas();

  // Initialize and run game
  const game = new Game(canvas);
  window.__GAME__ = game; // Exposed for headless QA bot test runner
  game.init();

  // Android Hardware Back Button Handling via Capacitor
  try {
    import('@capacitor/app').then(({ App }) => {
      App.addListener('backButton', () => {
        if (game.uiManager && game.uiManager.activeModal) {
          game.uiManager.closeModal();
        }
      });
    }).catch(() => {});
  } catch (e) {
    // Browser fallback
  }
});
