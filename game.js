// game.js

import Ball from './ball.js';
import Paddle from './paddle.js';
import SoundManager from './soundManager.js';

class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // スコア表示要素を取得
        this.player1ScoreElem = document.getElementById('player1-score');
        this.player2ScoreElem = document.getElementById('player2-score');
        this.messageBox = document.getElementById('message-box');
        this.resetButton = document.getElementById('reset-button');
        this.toggleSoundButton = document.getElementById('toggle-sound-button');
        this.cpuStrongButton = document.getElementById('cpu-strong-button');
        this.cpuWeakButton = document.getElementById('cpu-weak-button');
        this.paddleWideButton = document.getElementById('paddle-wide-button');
        this.paddleNormalButton = document.getElementById('paddle-normal-button');
        this.paddleNarrowButton = document.getElementById('paddle-narrow-button');

        // ゲームの状態変数
        this.paddleWidth = 15; // パドルの横幅は固定
        this.basePaddleHeight = 100; // パドルの基準となる高さ（「普通」の高さ）
        this.ballSize = 10;
        this.paddleSpeed = 8;
        this.ballInitialSpeed = 5; // ボールの初期速度
        this.winningScore = 10; // 勝利に必要な点数
        this.minVerticalSpeedAfterCollision = 2; // ボールがパドルに当たった後の最小垂直速度

        this.cpuSpeed = 4; // CPUパドルの速度 (初期値は「強い」)
        this.currentCpuDifficulty = 'strong'; // 'strong' or 'weak'

        this.player1 = new Paddle(0, this.canvas.height / 2 - this.basePaddleHeight / 2, this.paddleWidth, this.basePaddleHeight, this.paddleSpeed, this.canvas);
        this.player1.score = 0; 

        this.player2 = new Paddle(this.canvas.width - this.paddleWidth, this.canvas.height / 2 - this.basePaddleHeight / 2, this.paddleWidth, this.basePaddleHeight, this.cpuSpeed, this.canvas); // CPUプレイヤー
        this.player2.score = 0; 

        this.ball = new Ball(this.canvas.width / 2, this.canvas.height / 2, this.ballSize, this.ballInitialSpeed, this.canvas);

        // キー入力の状態 (カーソルキー用に変更)
        this.upArrowPressed = false;
        this.downArrowPressed = false;
        this.gameRunning = false; // ゲームが実行中かどうか (true: 実行中, false: 一時停止/開始待ち)
        this.soundManager = new SoundManager(); // SoundManagerのインスタンスを作成

    }

    // 全てのゲーム要素を描画
    draw() {
        // キャンバスをクリア
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // パドルを描画
        this.player1.draw(this.ctx, '#4CAF50'); // プレイヤー1を緑色に
        this.player2.draw(this.ctx, '#2196F3'); // プレイヤー2 (CPU) を青色に

        // ボールを描画
        this.ball.draw(this.ctx);

        // スコアを更新 (HTML要素のtextContentを更新)
        this.player1ScoreElem.textContent = this.player1.score;
        this.player2ScoreElem.textContent = this.player2.score;
    }

    // ボールとパドルの衝突判定
    checkCollision(ball, paddle) {
        return ball.x - ball.size < paddle.x + paddle.width &&
            ball.x + ball.size > paddle.x &&
            ball.y - ball.size < paddle.y + paddle.height &&
            ball.y + ball.size > paddle.y;
    }

    // ゲームの状態を更新
    update() {
        if (!this.gameRunning) return; // ゲームが実行中でなければ更新しない

        // プレイヤー1パドルの移動 (カーソルキーに対応)
        if (this.upArrowPressed) {
            this.player1.moveUp();
        }
        if (this.downArrowPressed) {
            this.player1.moveDown();
        }

        // CPUパドルの移動ロジック
        // ボールがCPU側に向かっている場合、ボールのY座標を追従
        if (this.ball.dx > 0) { // ボールが右に移動している場合
            if (this.ball.y > this.player2.y + this.player2.height / 2) {
                this.player2.y += this.cpuSpeed;
            } else if (this.ball.y < this.player2.y + this.player2.height / 2) {
                this.player2.y -= this.cpuSpeed;
            }
        }
        // パドルがキャンバスの境界を越えないようにする
        this.player2.y = Math.max(0, Math.min(this.canvas.height - this.player2.height, this.player2.y));


        // ボールの移動
        this.ball.update();

        // ボールが上下の壁に当たった場合の処理 (Ballクラスに移動済みだが、サウンド再生はmain.jsに残す)
        if (this.ball.y + this.ball.size > this.canvas.height || this.ball.y - this.ball.size < 0) {
            this.soundManager.playWallHitSound();
        }

        // ボールが左右の壁に当たった場合（得点）
        if (this.ball.x - this.ball.size < 0) { // CPUが得点
            this.player2.score++;
            this.soundManager.playScoreSound(false);
            // 勝敗判定
            if (this.player2.score >= this.winningScore) {
                this.gameRunning = false;
                this.showMessage("CPUの勝ち！スペースキーでリスタート");
                this.soundManager.playWinLossSound(false);
            } else {
                this.resetBall();
            }
        } else if (this.ball.x + this.ball.size > this.canvas.width) { // プレイヤー1が得点
            this.player1.score++;
            this.soundManager.playScoreSound(true);
            // 勝敗判定
            if (this.player1.score >= this.winningScore) {
                this.gameRunning = false;
                this.showMessage("あなたの勝ち！スペースキーでリスタート");
                this.soundManager.playWinLossSound(true);
            } else {
                this.resetBall();
            }
        }

        // ボールとプレイヤー1パドルの衝突判定
        if (this.checkCollision(this.ball, this.player1) && this.ball.dx < 0) {
            this.ball.dx *= -1; // ボールのX方向速度を反転
            // ボールのY方向の跳ね返りを調整（パドルのどこに当たったかによって）
            let collidePoint = this.ball.y - (this.player1.y + this.player1.height / 2);
            collidePoint = collidePoint / (this.player1.height / 2); // -1から1の範囲に正規化
            this.ball.dy = collidePoint * this.ballInitialSpeed; // 角度を調整
            // 垂直速度が小さくなりすぎないように調整
            if (Math.abs(this.ball.dy) < this.minVerticalSpeedAfterCollision) {
                this.ball.dy = Math.sign(this.ball.dy) * this.minVerticalSpeedAfterCollision;
                if (this.ball.dy === 0) { // 完全に0になった場合、ランダムな方向を与える
                    this.ball.dy = (Math.random() > 0.5 ? 1 : -1) * this.minVerticalSpeedAfterCollision;
                }
            }
            this.soundManager.playPaddleHitSound();
        }

        // ボールとCPUパドルの衝突判定
        if (this.checkCollision(this.ball, this.player2) && this.ball.dx > 0) {
            this.ball.dx *= -1; // ボールのX方向速度を反転
            // ボールのY方向の跳ね返りを調整
            let collidePoint = this.ball.y - (this.player2.y + this.player2.height / 2);
            collidePoint = collidePoint / (this.player2.height / 2); // -1から1の範囲に正規化
            this.ball.dy = collidePoint * this.ballInitialSpeed; // 角度を調整
            // 垂直速度が小さくなりすぎないように調整
            if (Math.abs(this.ball.dy) < this.minVerticalSpeedAfterCollision) {
                this.ball.dy = Math.sign(this.ball.dy) * this.minVerticalSpeedAfterCollision;
                if (this.ball.dy === 0) { // 完全に0になった場合、ランダムな方向を与える
                    this.ball.dy = (Math.random() > 0.5 ? 1 : -1) * this.minVerticalSpeedAfterCollision;
                }
            }
            this.soundManager.playPaddleHitSound();
        }
    }

    // ボールとパドルを中央にリセット
    resetBall() {
        this.ball.reset(); // Ballクラスのresetメソッドを呼び出す

        // パドル位置を初期位置にリセット (現在のパドル高さに基づいて中央に配置)
        this.player1.reset(this.canvas.height / 2 - this.player1.height / 2);
        this.player2.reset(this.canvas.height / 2 - this.player2.height / 2); // CPUパドルは常に普通サイズで中央に

        this.gameRunning = false; // ボールがリセットされたらゲームを一時停止
        // 勝敗が決まっていない場合のみメッセージを表示
        if (this.player1.score < this.winningScore && this.player2.score < this.winningScore) {
            this.showMessage("ゲームを開始するにはスペースキーを押してください");
        }
    }

    // メッセージボックスの表示/非表示
    showMessage(text) {
        this.messageBox.textContent = text;
        this.messageBox.classList.remove('hidden');
    }

    hideMessage() {
        this.messageBox.classList.add('hidden');
    }

    // ヘルパー関数: ボタンのアクティブスタイルを更新
    updateButtonStyles(activeButton, allButtons) {
        allButtons.forEach(button => {
            button.classList.remove('bg-blue-500');
            button.classList.add('bg-gray-500');
        });
        activeButton.classList.remove('bg-gray-500');
        activeButton.classList.add('bg-blue-500');
    }

    // CPUの強さを設定する関数
    setCpuDifficulty(difficulty) {
        this.currentCpuDifficulty = difficulty;
        const cpuButtons = [this.cpuStrongButton, this.cpuWeakButton];
        if (this.currentCpuDifficulty === 'strong') {
            this.cpuSpeed = 4; // 強いCPUの速度
            this.updateButtonStyles(this.cpuStrongButton, cpuButtons);
        } else { // 'weak'
            this.cpuSpeed = 2; // 弱いCPUの速度 (速度を遅くする)
            this.updateButtonStyles(this.cpuWeakButton, cpuButtons);
        }
        this.player2.speed = this.cpuSpeed; // CPUパドルの速度を更新
    }

    // パドルの高さを設定する関数 (プレイヤー側のみ)
    setPaddleSize(size) {
        let newHeight;
        const paddleButtons = [this.paddleWideButton, this.paddleNormalButton, this.paddleNarrowButton];

        switch (size) {
            case 'wide':
                newHeight = this.basePaddleHeight * 2;
                this.updateButtonStyles(this.paddleWideButton, paddleButtons);
                break;
            case 'narrow':
                newHeight = this.basePaddleHeight / 2;
                this.updateButtonStyles(this.paddleNarrowButton, paddleButtons);
                break;
            case 'normal':
            default:
                newHeight = this.basePaddleHeight;
                this.updateButtonStyles(this.paddleNormalButton, paddleButtons);
                break;
        }
        this.player1.height = newHeight; // プレイヤー1のパドル高さのみ変更
        this.player1.y = this.canvas.height / 2 - this.player1.height / 2; // パドル位置を中央に再調整
        this.resetBall(); // パドルサイズ変更後に位置をリセット
    }

    // --- イベントリスナー --- (createGame関数内で定義し、initでアタッチ)

    attachEventListeners() {
        // キーダウンイベント
        document.addEventListener('keydown', async (e) => {
            switch (e.key) {
                case 'ArrowUp':
                    this.upArrowPressed = true;
                    break;
                case 'ArrowDown':
                    this.downArrowPressed = true;
                    break;
                case ' ': // スペースキーでゲーム開始/一時停止/リスタート
                    if (!this.gameRunning) {
                        // ゲームが停止中の場合、開始する
                        // ユーザーの操作でオーディオコンテキストを開始
                        await Tone.start();
                        console.log('AudioContext started');
                        // スコアが勝利点に達している場合は、ゲームを完全にリセットしてから開始
                        if (this.player1.score >= this.winningScore || this.player2.score >= this.winningScore) {
                            this.player1.score = 0;
                            this.player2.score = 0;
                            this.resetBall(); // パドルとボールをリセット
                        }
                        this.gameRunning = true;
                        this.hideMessage();
                    } else {
                        // ゲームが実行中の場合、一時停止する
                        this.gameRunning = false;
                        this.showMessage("一時停止中... スペースキーで再開");
                    }
                    break;
            }
        });

        // キーアップイベント
        document.addEventListener('keyup', (e) => {
            switch (e.key) {
                case 'ArrowUp':
                    this.upArrowPressed = false;
                    break;
                case 'ArrowDown':
                    this.downArrowPressed = false;
                    break;
            }
        });

        // リセットボタンのクリックイベント
        this.resetButton.addEventListener('click', async () => {
            // ユーザーの操作でオーディオコンテキストを開始
            await Tone.start();
            console.log('AudioContext started via reset button');
            this.player1.score = 0;
            this.player2.score = 0;
            this.resetBall(); // パドルとボールをリセット
        });

        // サウンドON/OFFボタンのクリックイベント
        this.toggleSoundButton.addEventListener('click', async () => {
            // ユーザーの操作でオーディオコンテキストを開始
            await Tone.start();
            console.log('AudioContext started via sound toggle button');

            this.soundManager.toggleSound(); // SoundManagerのtoggleSoundを呼び出す
            this.toggleSoundButton.textContent = `サウンド: ${this.soundManager.soundEnabled ? 'ON' : 'OFF'}`; // ボタンのテキストを更新
            // 必要に応じてボタンのスタイルも更新
            if (this.soundManager.soundEnabled) {
                this.toggleSoundButton.classList.remove('from-gray-500', 'to-gray-600');
                this.toggleSoundButton.classList.add('from-green-500', 'to-teal-500');
            } else {
                this.toggleSoundButton.classList.remove('from-green-500', 'to-teal-500');
                this.toggleSoundButton.classList.add('from-gray-500', 'to-gray-600');
            }
        });

        // CPU強さボタンのクリックイベント
        this.cpuStrongButton.addEventListener('click', () => this.setCpuDifficulty('strong'));
        this.cpuWeakButton.addEventListener('click', () => this.setCpuDifficulty('weak'));

        // パドル幅ボタンのクリックイベント
        this.paddleWideButton.addEventListener('click', () => this.setPaddleSize('wide'));
        this.paddleNormalButton.addEventListener('click', () => this.setPaddleSize('normal'));
        this.paddleNarrowButton.addEventListener('click', () => this.setPaddleSize('narrow'));
    }

    // --- ゲームループ ---

    // メインのゲームループ
    gameLoop() {
        this.update();   // ゲームの状態を更新
        this.draw();     // 描画
        requestAnimationFrame(() => this.gameLoop()); // 次のフレームを要求
    }

    // ゲームの初期化と開始
    init() {
        this.attachEventListeners(); // イベントリスナーをアタッチ
        this.resetBall(); // ボールとパドルを初期位置にリセットし、ゲームを一時停止状態にする
        this.gameLoop();  // ゲームループを開始（描画は常に実行される）
        this.setCpuDifficulty('strong'); // デフォルトはCPU「強い」に設定
        this.setPaddleSize('normal'); // デフォルトはプレイヤーパドル「普通」に設定
    }
}

export default Game;

