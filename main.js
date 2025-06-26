// main.js

import Game from './game.js';

// ブラウザで読み込まれたときにゲームを初期化
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game('pongCanvas');
    game.init();
});
