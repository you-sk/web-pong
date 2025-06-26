const fs = require('fs');
const path = require('path');

// HTMLファイルを読み込む
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

// Gameクラスをインポート
const Game = require('../game.js').default;
const SoundManager = require('../soundManager.js').default;
const { updateButtonStyles } = require('../utils.js');

describe('Web Pong Game', () => {
    let gameInstance; // Gameクラスのインスタンスを保持

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

        // Gameクラスのインスタンスを作成し、初期化
        gameInstance = new Game('pongCanvas');
        gameInstance.init();

        // requestAnimationFrameをモック
        global.requestAnimationFrame = jest.fn(cb => cb());
    });

    beforeEach(() => {
        // 各テストの前にゲームの状態をリセット
        gameInstance.player1.score = 0;
        gameInstance.player2.score = 0;
        gameInstance.resetBall(); // resetBall関数を呼び出してボールとパドルをリセット

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
        expect(gameInstance.player1).toBeDefined();
        expect(gameInstance.player2).toBeDefined();
        expect(gameInstance.ball).toBeDefined();
        expect(gameInstance.gameRunning).toBe(false); // 初期状態はゲームが実行されていない
    });

    test('初期スコアが0であるか', () => {
        expect(gameInstance.player1.score).toBe(0);
        expect(gameInstance.player2.score).toBe(0);
        // HTML上の表示も確認
        const player1ScoreElem = document.getElementById('player1-score');
        const player2ScoreElem = document.getElementById('player2-score');
        expect(player1ScoreElem.textContent).toBe('0');
        expect(player2ScoreElem.textContent).toBe('0');
    });

    test('resetBall()関数がボールとパドルを初期位置に戻すか', () => {
        // 初期位置を保存
        const initialPlayer1Y = gameInstance.player1.y;
        const initialPlayer2Y = gameInstance.player2.y;

        // パドルとボールの位置を意図的に変更
        gameInstance.player1.y = 100;
        gameInstance.player2.y = 100;
        gameInstance.ball.x = 100;
        gameInstance.ball.y = 100;

        // リセット関数を実行
        gameInstance.resetBall();

        // 位置が初期状態に戻っているかを確認
        expect(gameInstance.ball.x).toBe(gameInstance.canvas.width / 2);
        expect(gameInstance.ball.y).toBe(gameInstance.canvas.height / 2);
        expect(gameInstance.player1.y).toBe(initialPlayer1Y);
        expect(gameInstance.player2.y).toBe(initialPlayer2Y);
        expect(gameInstance.gameRunning).toBe(false);
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

describe('SoundManager Class', () => {
    let soundManager;
    let Tone;

    beforeEach(() => {
        // Tone.jsのモックをリセット
        Tone = {
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
        global.Tone = Tone; // グローバルに設定

        soundManager = new SoundManager();
    });

    test('SoundManagerが正しく初期化されるか', () => {
        expect(soundManager.soundEnabled).toBe(true);
        expect(Tone.Synth).toHaveBeenCalledTimes(3); // 3つのシンセが作成される
    });

    test('toggleSound()がsoundEnabledの状態を切り替えるか', async () => {
        expect(soundManager.soundEnabled).toBe(true);
        await soundManager.toggleSound();
        expect(soundManager.soundEnabled).toBe(false);
        await soundManager.toggleSound();
        expect(soundManager.soundEnabled).toBe(true);
    });

    test('playPaddleHitSound()がsoundEnabledがtrueの場合にサウンドを再生するか', () => {
        soundManager.soundEnabled = true;
        soundManager.playPaddleHitSound();
        expect(soundManager.paddleHitSynth.triggerAttackRelease).toHaveBeenCalledWith('E5', '8n');
    });

    test('playPaddleHitSound()がsoundEnabledがfalseの場合にサウンドを再生しないか', () => {
        soundManager.soundEnabled = false;
        soundManager.playPaddleHitSound();
        expect(soundManager.paddleHitSynth.triggerAttackRelease).not.toHaveBeenCalled();
    });

    test('playWallHitSound()がsoundEnabledがtrueの場合にサウンドを再生するか', () => {
        soundManager.soundEnabled = true;
        soundManager.playWallHitSound();
        expect(soundManager.paddleHitSynth.triggerAttackRelease).toHaveBeenCalledWith('C5', '8n');
    });

    test('playWallHitSound()がsoundEnabledがfalseの場合にサウンドを再生しないか', () => {
        soundManager.soundEnabled = false;
        soundManager.playWallHitSound();
        expect(soundManager.paddleHitSynth.triggerAttackRelease).not.toHaveBeenCalled();
    });

    test('playScoreSound()がsoundEnabledがtrueの場合にサウンドを再生するか (player1)', () => {
        soundManager.soundEnabled = true;
        soundManager.playScoreSound(true);
        expect(soundManager.scoreSynth.triggerAttackRelease).toHaveBeenCalledWith('C4', '4n');
    });

    test('playScoreSound()がsoundEnabledがtrueの場合にサウンドを再生するか (player2)', () => {
        soundManager.soundEnabled = true;
        soundManager.playScoreSound(false);
        expect(soundManager.scoreSynth.triggerAttackRelease).toHaveBeenCalledWith('G4', '4n');
    });

    test('playScoreSound()がsoundEnabledがfalseの場合にサウンドを再生しないか', () => {
        soundManager.soundEnabled = false;
        soundManager.playScoreSound(true);
        expect(soundManager.scoreSynth.triggerAttackRelease).not.toHaveBeenCalled();
    });

    test('playWinLossSound()がsoundEnabledがtrueの場合にサウンドを再生するか (win)', () => {
        soundManager.soundEnabled = true;
        soundManager.playWinLossSound(true);
        expect(soundManager.winLossSynth.triggerAttackRelease).toHaveBeenCalledWith('C6', '1n');
    });

    test('playWinLossSound()がsoundEnabledがtrueの場合にサウンドを再生するか (loss)', () => {
        soundManager.soundEnabled = true;
        soundManager.playWinLossSound(false);
        expect(soundManager.winLossSynth.triggerAttackRelease).toHaveBeenCalledWith('G3', '1n');
    });

    test('playWinLossSound()がsoundEnabledがfalseの場合にサウンドを再生しないか', () => {
        soundManager.soundEnabled = false;
        soundManager.playWinLossSound(true);
        expect(soundManager.winLossSynth.triggerAttackRelease).not.toHaveBeenCalled();
    });
});

describe('Utils', () => {
    let mockButton1;
    let mockButton2;
    let mockButton3;
    let allButtons;

    beforeEach(() => {
        mockButton1 = {
            classList: {
                remove: jest.fn(),
                add: jest.fn(),
            },
        };
        mockButton2 = {
            classList: {
                remove: jest.fn(),
                add: jest.fn(),
            },
        };
        mockButton3 = {
            classList: {
                remove: jest.fn(),
                add: jest.fn(),
            },
        };
        allButtons = [mockButton1, mockButton2, mockButton3];
    });

    test('updateButtonStylesがアクティブボタンのスタイルを正しく更新するか', () => {
        updateButtonStyles(mockButton1, allButtons);

        // アクティブボタン (mockButton1) の検証
        expect(mockButton1.classList.remove).toHaveBeenCalledWith('bg-gray-500');
        expect(mockButton1.classList.add).toHaveBeenCalledWith('bg-blue-500');

        // 非アクティブボタン (mockButton2, mockButton3) の検証
        expect(mockButton2.classList.remove).toHaveBeenCalledWith('bg-blue-500');
        expect(mockButton2.classList.add).toHaveBeenCalledWith('bg-gray-500');
        expect(mockButton3.classList.remove).toHaveBeenCalledWith('bg-blue-500');
        expect(mockButton3.classList.add).toHaveBeenCalledWith('bg-gray-500');
    });

    test('updateButtonStylesがアクティブボタンがallButtonsに含まれていない場合でも動作するか', () => {
        const newButton = {
            classList: {
                remove: jest.fn(),
                add: jest.fn(),
            },
        };
        updateButtonStyles(newButton, allButtons);

        // 新しいボタンの検証
        expect(newButton.classList.remove).toHaveBeenCalledWith('bg-gray-500');
        expect(newButton.classList.add).toHaveBeenCalledWith('bg-blue-500');

        // 既存のボタンの検証
        expect(mockButton1.classList.remove).toHaveBeenCalledWith('bg-blue-500');
        expect(mockButton1.classList.add).toHaveBeenCalledWith('bg-gray-500');
    });
});
