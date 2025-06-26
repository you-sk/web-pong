const fs = require('fs');
const path = require('path');

// HTMLファイルを読み込む
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

// main.jsからcreateGame関数をインポート
const createGame = require('../main.js').default;

describe('Web Pong Game', () => {
    let gameModule; // createGame関数が返すゲームインスタンスを保持

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

        // createGame関数を呼び出してゲームインスタンスを取得
        gameModule = createGame();
        gameModule.init(); // ゲームを初期化

        // requestAnimationFrameをモック
        global.requestAnimationFrame = jest.fn(cb => cb());
    });

    beforeEach(() => {
        // 各テストの前にゲームの状態をリセット
        gameModule.player1.score = 0;
        gameModule.player2.score = 0;
        gameModule.resetBall(); // resetBall関数を呼び出してボールとパドルをリセット

        // スコア表示要素もリセット
        document.getElementById('player1-score').textContent = '0';
        document.getElementById('player2-score').textContent = '0';

        // メッセージボックスを非表示に
        document.getElementById('message-box').classList.add('hidden');
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

describe('Ball Class', () => {
    let canvas;
    let ball;
    let Ball;

    beforeEach(() => {
        canvas = {
            width: 800,
            height: 600,
        };
        // Ballクラスを動的にインポート
        Ball = require('../ball.js').default;
        ball = new Ball(canvas.width / 2, canvas.height / 2, 10, 5, canvas);
    });

    test('Ballが正しく初期化されるか', () => {
        expect(ball.x).toBe(400);
        expect(ball.y).toBe(300);
        expect(ball.size).toBe(10);
        expect(ball.initialSpeed).toBe(5);
        expect(ball.dx).toBe(5);
        expect(ball.dy).toBe(5);
    });

    test('Ballのupdate()が正しくボールの位置を更新するか', () => {
        ball.update();
        expect(ball.x).toBe(405);
        expect(ball.y).toBe(305);
    });

    test('Ballが上下の壁に当たったときにdyが反転するか', () => {
        ball.y = canvas.height - ball.size + 1; // 下の壁に当たるように設定
        ball.update();
        expect(ball.dy).toBe(-5); // dyが反転することを確認

        ball.y = ball.size - 1; // 上の壁に当たるように設定
        ball.update();
        expect(ball.dy).toBe(5); // dyが再度反転することを確認
    });

    test('Ballのreset()がボールを中央にリセットし、速度をランダムに設定するか', () => {
        ball.x = 100;
        ball.y = 100;
        ball.dx = -10;
        ball.dy = -10;

        ball.reset();

        expect(ball.x).toBe(canvas.width / 2);
        expect(ball.y).toBe(canvas.height / 2);
        expect(Math.abs(ball.dx)).toBe(ball.initialSpeed);
        expect(Math.abs(ball.dy)).toBe(ball.initialSpeed);
    });
});

describe('Paddle Class', () => {
    let canvas;
    let paddle;
    let Paddle;

    beforeEach(() => {
        canvas = {
            width: 800,
            height: 600,
        };
        Paddle = require('../paddle.js').default;
        paddle = new Paddle(0, 0, 15, 100, 8, canvas);
    });

    test('Paddleが正しく初期化されるか', () => {
        expect(paddle.x).toBe(0);
        expect(paddle.y).toBe(0);
        expect(paddle.width).toBe(15);
        expect(paddle.height).toBe(100);
        expect(paddle.speed).toBe(8);
    });

    test('moveUp()がパドルを上に移動させるか', () => {
        paddle.y = 100;
        paddle.moveUp();
        expect(paddle.y).toBe(92);
    });

    test('moveUp()がキャンバスの上端を超えないか', () => {
        paddle.y = 5;
        paddle.moveUp();
        expect(paddle.y).toBe(0);
    });

    test('moveDown()がパドルを下に移動させるか', () => {
        paddle.y = 100;
        paddle.moveDown();
        expect(paddle.y).toBe(108);
    });

    test('moveDown()がキャンバスの下端を超えないか', () => {
        paddle.y = canvas.height - paddle.height - 5; // 下端から5px上に設定
        paddle.moveDown();
        expect(paddle.y).toBe(canvas.height - paddle.height);
    });

    test('reset()がパドルを初期Y位置にリセットするか', () => {
        paddle.y = 100;
        paddle.reset(50);
        expect(paddle.y).toBe(50);
    });
});