const fs = require('fs');
const path = require('path');

// HTMLファイルを読み込む
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

// main.jsのコードを一度だけ読み込む
const mainJsCode = fs.readFileSync(path.resolve(__dirname, '../main.js'), 'utf8');

describe('Web Pong Game', () => {
    let gameModule; // main.jsからエクスポートされるオブジェクトを保持

    beforeAll(() => {
        // JSDOMのdocumentにHTML構造をセット
        document.documentElement.innerHTML = html.toString();

        // CanvasのgetContextをモック
        const mockGetContext = jest.fn(() => ({
            clearRect: jest.fn(),
            fillRect: jest.fn(),
            beginPath: jest.fn(),
            arc: jest.fn(),
            fill: jest.fn(),
            // 必要に応じて他のCanvasメソッドも追加
        }));
        HTMLCanvasElement.prototype.getContext = mockGetContext;

        // Canvas要素のwidthとheightを設定
        const canvas = document.getElementById('pongCanvas');
        canvas.width = 800;
        canvas.height = 600;

        // Tone.jsのモック
        global.Tone = {
            Synth: jest.fn().mockImplementation(() => ({
                toDestination: jest.fn().mockReturnThis(),
                triggerAttackRelease: jest.fn(),
                envelope: {
                    attack: 0,
                    decay: 0,
                    sustain: 0,
                    release: 0,
                },
                oscillator: {
                    type: ''
                }
            })),
            start: jest.fn().mockResolvedValue(undefined),
        };

        // main.jsのコードをIIFEでラップし、テストに必要な変数をエクスポートする
        // これにより、main.jsのconst/let変数をテストからアクセス可能にする
        const wrappedMainJsCode = `
            (function() {
                ${mainJsCode}
                window.gameModule = {
                    player1,
                    player2,
                    ball,
                    gameRunning,
                    resetBall,
                    canvas, // canvasもエクスポート
                    // 他にもテストしたい変数や関数があればここに追加
                };
            })();
        `;

        // ラップしたコードを評価してグローバルスコープにロード
        eval(wrappedMainJsCode);

        // window.onloadが実行されるのを待つ
        // main.jsのwindow.onload関数が実行されるように、DOMContentLoadedイベントを発火させる
        document.dispatchEvent(new Event('DOMContentLoaded'));

        // エクスポートされたオブジェクトを取得
        gameModule = window.gameModule;
    });

    beforeEach(() => {
        // 各テストの前にゲームの状態をリセット
        // gameModuleから取得した初期値を使ってリセットする
        gameModule.player1.score = 0;
        gameModule.player2.score = 0;
        gameModule.resetBall(); // resetBall関数を呼び出してボールとパドルをリセット

        // スコア表示要素もリセット
        document.getElementById('player1-score').textContent = '0';
        document.getElementById('player2-score').textContent = '0';

        // メッセージボックスを非表示に
        document.getElementById('message-box').classList.add('hidden');

        // requestAnimationFrameをモック
        global.requestAnimationFrame = jest.fn(cb => cb());
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('ゲームの初期変数が正しく設定されているか', () => {
        expect(gameModule.player1).toBeDefined();
        expect(gameModule.player2).toBeDefined();
        expect(gameModule.ball).toBeDefined();
        expect(gameModule.gameRunning).toBe(false); // 初期状態はゲームが実行されていない
    });

    test('初期スコアが0であるか', () => {
        expect(gameModule.player1.score).toBe(0);
        expect(gameModule.player2.score).toBe(0);
        // HTML上の表示も確認
        const player1ScoreElem = document.getElementById('player1-score');
        const player2ScoreElem = document.getElementById('player2-score');
        expect(player1ScoreElem.textContent).toBe('0');
        expect(player2ScoreElem.textContent).toBe('0');
    });

    test('resetBall()関数がボールとパドルを初期位置に戻すか', () => {
        // 初期位置を保存
        const initialPlayer1Y = gameModule.player1.y;
        const initialPlayer2Y = gameModule.player2.y;

        // パドルとボールの位置を意図的に変更
        gameModule.player1.y = 100;
        gameModule.player2.y = 100;
        gameModule.ball.x = 100;
        gameModule.ball.y = 100;

        // リセット関数を実行
        gameModule.resetBall();

        // 位置が初期状態に戻っているかを確認
        expect(gameModule.ball.x).toBe(gameModule.canvas.width / 2);
        expect(gameModule.ball.y).toBe(gameModule.canvas.height / 2);
        expect(gameModule.player1.y).toBe(initialPlayer1Y);
        expect(gameModule.player2.y).toBe(initialPlayer2Y);
        expect(gameModule.gameRunning).toBe(false);
    });
});