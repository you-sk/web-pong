// キャンバスと2D描画コンテキストを取得
const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

// スコア表示要素を取得
const player1ScoreElem = document.getElementById('player1-score');
const player2ScoreElem = document.getElementById('player2-score');
const messageBox = document.getElementById('message-box');
const resetButton = document.getElementById('reset-button');
const toggleSoundButton = document.getElementById('toggle-sound-button');
const cpuStrongButton = document.getElementById('cpu-strong-button');
const cpuWeakButton = document.getElementById('cpu-weak-button');
const paddleWideButton = document.getElementById('paddle-wide-button');
const paddleNormalButton = document.getElementById('paddle-normal-button');
const paddleNarrowButton = document.getElementById('paddle-narrow-button');

// ゲームの状態変数
const paddleWidth = 15; // パドルの横幅は固定
const basePaddleHeight = 100; // パドルの基準となる高さ（「普通」の高さ）
const ballSize = 10;
const paddleSpeed = 8;
const ballInitialSpeed = 5; // ボールの初期速度
const winningScore = 10; // 勝利に必要な点数
const minVerticalSpeedAfterCollision = 2; // ボールがパドルに当たった後の最小垂直速度

let cpuSpeed = 4; // CPUパドルの速度 (初期値は「強い」)
let currentCpuDifficulty = 'strong'; // 'strong' or 'weak'

let player1 = {
    x: 0,
    y: canvas.height / 2 - basePaddleHeight / 2, // 初期位置はbasePaddleHeight基準
    score: 0,
    height: basePaddleHeight // プレイヤー1の現在のパドル高さ
};

let player2 = { // CPUプレイヤー
    x: canvas.width - paddleWidth,
    y: canvas.height / 2 - basePaddleHeight / 2, // 初期位置はbasePaddleHeight基準
    score: 0,
    height: basePaddleHeight // プレイヤー2の現在のパドル高さ (常に普通サイズ)
};

let ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    dx: ballInitialSpeed, // ボールのX方向速度
    dy: ballInitialSpeed  // ボールのY方向速度
};

// キー入力の状態 (カーソルキー用に変更)
let upArrowPressed = false;
let downArrowPressed = false;
let gameRunning = false; // ゲームが実行中かどうか (true: 実行中, false: 一時停止/開始待ち)
let soundEnabled = true; // サウンドのON/OFF状態, デフォルトON

// --- サウンド設定 ---
// パドルヒット用のシンセ
const paddleHitSynth = new Tone.Synth().toDestination();
paddleHitSynth.envelope.attack = 0.005;
paddleHitSynth.envelope.decay = 0.1;
paddleHitSynth.envelope.sustain = 0.05;
paddleHitSynth.envelope.release = 0.2;

// スコア時のサウンド用のシンセ
const scoreSynth = new Tone.Synth().toDestination();
scoreSynth.oscillator.type = 'triangle';
scoreSynth.envelope.attack = 0.01;
scoreSynth.envelope.decay = 0.3;
scoreSynth.envelope.sustain = 0.1;
scoreSynth.envelope.release = 0.5;

// 勝利/敗北時のサウンド用のシンセ
const winLossSynth = new Tone.Synth().toDestination();
winLossSynth.oscillator.type = 'sine';
winLossSynth.envelope.attack = 0.05;
winLossSynth.envelope.decay = 0.8;
winLossSynth.envelope.sustain = 0.2;
winLossSynth.envelope.release = 1.0;


// --- 描画関数 ---

// 長方形を描画
function drawRect(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
}

// 円（ボール）を描画
function drawCircle(x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}

// 全てのゲーム要素を描画
function draw() {
    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // パドルを描画 (player1.height, player2.heightを使用)
    drawRect(player1.x, player1.y, paddleWidth, player1.height, '#4CAF50'); // プレイヤー1を緑色に
    drawRect(player2.x, player2.y, paddleWidth, player2.height, '#2196F3'); // プレイヤー2 (CPU) を青色に

    // ボールを描画
    drawCircle(ball.x, ball.y, ballSize, '#FFEB3B'); // ボールを黄色に

    // スコアを更新 (HTML要素のtextContentを更新)
    player1ScoreElem.textContent = player1.score;
    player2ScoreElem.textContent = player2.score;
}

// --- ゲームロジック関数 ---

// ボールとパドルの衝突判定
function checkCollision(ball, paddle) {
    return ball.x - ballSize < paddle.x + paddleWidth &&
        ball.x + ballSize > paddle.x &&
        ball.y - ballSize < paddle.y + paddle.height && // paddle.heightを使用
        ball.y + ballSize > paddle.y;
}

// ゲームの状態を更新
function update() {
    if (!gameRunning) return; // ゲームが実行中でなければ更新しない

    // プレイヤー1パドルの移動 (カーソルキーに対応)
    if (upArrowPressed && player1.y > 0) {
        player1.y -= paddleSpeed;
    }
    if (downArrowPressed && player1.y < canvas.height - player1.height) { // player1.heightを使用
        player1.y += paddleSpeed;
    }

    // CPUパドルの移動ロジック
    // ボールがCPU側に向かっている場合、ボールのY座標を追従
    if (ball.dx > 0) { // ボールが右に移動している場合
        if (ball.y > player2.y + player2.height / 2 && player2.y < canvas.height - player2.height) { // player2.heightを使用
            player2.y += cpuSpeed;
        } else if (ball.y < player2.y + player2.height / 2 && player2.y > 0) { // player2.heightを使用
            player2.y -= cpuSpeed;
        }
    } else { // ボールが左に移動している場合、パドルを中央に戻す
        if (player2.y + player2.height / 2 < canvas.height / 2) { // player2.heightを使用
            player2.y += cpuSpeed / 2;
        } else if (player2.y + player2.height / 2 > canvas.height / 2) { // player2.heightを使用
            player2.y -= cpuSpeed / 2;
        }
    }
    // パドルがキャンバスの境界を越えないようにする
    player2.y = Math.max(0, Math.min(canvas.height - player2.height, player2.y)); // player2.heightを使用


    // ボールの移動
    ball.x += ball.dx;
    ball.y += ball.dy;

    // ボールが上下の壁に当たった場合の処理
    if (ball.y + ballSize > canvas.height || ball.y - ballSize < 0) {
        ball.dy *= -1; // 速度を反転
        if (soundEnabled) { // サウンドが有効な場合のみ再生
            paddleHitSynth.triggerAttackRelease('C5', '8n'); // 壁に当たった音
        }
    }

    // ボールが左右の壁に当たった場合（得点）
    if (ball.x - ballSize < 0) { // CPUが得点
        player2.score++;
        if (soundEnabled) { // サウンドが有効な場合のみ再生
            scoreSynth.triggerAttackRelease('G4', '4n'); // スコア音
        }
        // 勝敗判定
        if (player2.score >= winningScore) {
            gameRunning = false;
            showMessage("CPUの勝ち！スペースキーでリスタート");
            if (soundEnabled) winLossSynth.triggerAttackRelease('G3', '1n'); // 敗北音
        } else {
            resetBall();
        }
    } else if (ball.x + ballSize > canvas.width) { // プレイヤー1が得点
        player1.score++;
        if (soundEnabled) { // サウンドが有効な場合のみ再生
            scoreSynth.triggerAttackRelease('C4', '4n'); // スコア音
        }
        // 勝敗判定
        if (player1.score >= winningScore) {
            gameRunning = false;
            showMessage("あなたの勝ち！スペースキーでリスタート");
            if (soundEnabled) winLossSynth.triggerAttackRelease('C6', '1n'); // 勝利音
        } else {
            resetBall();
        }
    }

    // ボールとプレイヤー1パドルの衝突判定
    if (checkCollision(ball, player1) && ball.dx < 0) {
        ball.dx *= -1; // ボールのX方向速度を反転
        // ボールのY方向の跳ね返りを調整（パドルのどこに当たったかによって）
        let collidePoint = ball.y - (player1.y + player1.height / 2); // player1.heightを使用
        collidePoint = collidePoint / (player1.height / 2); // -1から1の範囲に正規化 // player1.heightを使用
        ball.dy = collidePoint * ballInitialSpeed; // 角度を調整
        // 垂直速度が小さくなりすぎないように調整
        if (Math.abs(ball.dy) < minVerticalSpeedAfterCollision) {
            ball.dy = Math.sign(ball.dy) * minVerticalSpeedAfterCollision;
            if (ball.dy === 0) { // 完全に0になった場合、ランダムな方向を与える
                ball.dy = (Math.random() > 0.5 ? 1 : -1) * minVerticalSpeedAfterCollision;
            }
        }
        if (soundEnabled) { // サウンドが有効な場合のみ再生
            paddleHitSynth.triggerAttackRelease('E5', '8n'); // パドルに当たった音
        }
    }

    // ボールとCPUパドルの衝突判定
    if (checkCollision(ball, player2) && ball.dx > 0) {
        ball.dx *= -1; // ボールのX方向速度を反転
        // ボールのY方向の跳ね返りを調整
        let collidePoint = ball.y - (player2.y + player2.height / 2); // player2.heightを使用
        collidePoint = collidePoint / (player2.height / 2); // -1から1の範囲に正規化 // player2.heightを使用
        ball.dy = collidePoint * ballInitialSpeed; // 角度を調整
        // 垂直速度が小さくなりすぎないように調整
        if (Math.abs(ball.dy) < minVerticalSpeedAfterCollision) {
            ball.dy = Math.sign(ball.dy) * minVerticalSpeedAfterCollision;
            if (ball.dy === 0) { // 完全に0になった場合、ランダムな方向を与える
                ball.dy = (Math.random() > 0.5 ? 1 : -1) * minVerticalSpeedAfterCollision;
            }
        }
        if (soundEnabled) { // サウンドが有効な場合のみ再生
            paddleHitSynth.triggerAttackRelease('E5', '8n'); // パドルに当たった音
        }
    }
}

// ボールとパドルを中央にリセット
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    // ボールの方向をランダムに設定
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * ballInitialSpeed;
    ball.dy = (Math.random() > 0.5 ? 1 : -1) * ballInitialSpeed;

    // パドル位置を初期位置にリセット (現在のパドル高さに基づいて中央に配置)
    player1.y = canvas.height / 2 - player1.height / 2;
    player2.y = canvas.height / 2 - player2.height / 2; // CPUパドルは常に普通サイズで中央に

    gameRunning = false; // ボールがリセットされたらゲームを一時停止
    // 勝敗が決まっていない場合のみメッセージを表示
    if (player1.score < winningScore && player2.score < winningScore) {
        showMessage("ゲームを開始するにはスペースキーを押してください");
    }
}

// メッセージボックスの表示/非表示
function showMessage(text) {
    messageBox.textContent = text;
    messageBox.classList.remove('hidden');
}

function hideMessage() {
    messageBox.classList.add('hidden');
}

// ヘルパー関数: ボタンのアクティブスタイルを更新
function updateButtonStyles(activeButton, allButtons) {
    allButtons.forEach(button => {
        button.classList.remove('bg-blue-500');
        button.classList.add('bg-gray-500');
    });
    activeButton.classList.remove('bg-gray-500');
    activeButton.classList.add('bg-blue-500');
}

// CPUの強さを設定する関数
function setCpuDifficulty(difficulty) {
    currentCpuDifficulty = difficulty;
    const cpuButtons = [cpuStrongButton, cpuWeakButton];
    if (currentCpuDifficulty === 'strong') {
        cpuSpeed = 4; // 強いCPUの速度
        updateButtonStyles(cpuStrongButton, cpuButtons);
    } else { // 'weak'
        cpuSpeed = 2; // 弱いCPUの速度 (速度を遅くする)
        updateButtonStyles(cpuWeakButton, cpuButtons);
    }
}

// パドルの高さを設定する関数 (プレイヤー側のみ)
function setPaddleSize(size) {
    let newHeight;
    const paddleButtons = [paddleWideButton, paddleNormalButton, paddleNarrowButton];

    switch (size) {
        case 'wide':
            newHeight = basePaddleHeight * 2;
            updateButtonStyles(paddleWideButton, paddleButtons);
            break;
        case 'narrow':
            newHeight = basePaddleHeight / 2;
            updateButtonStyles(paddleNarrowButton, paddleButtons);
            break;
        case 'normal':
        default:
            newHeight = basePaddleHeight;
            updateButtonStyles(paddleNormalButton, paddleButtons);
            break;
    }
    player1.height = newHeight; // プレイヤー1のパドル高さのみ変更
    // player2.height は常に basePaddleHeight で固定
    resetBall(); // パドルサイズ変更後に位置をリセット
}

// --- イベントリスナー ---

// キーダウンイベント
document.addEventListener('keydown', async (e) => {
    switch (e.key) {
        case 'ArrowUp':
            upArrowPressed = true;
            break;
        case 'ArrowDown':
            downArrowPressed = true;
            break;
        case ' ': // スペースキーでゲーム開始/一時停止/リスタート
            if (!gameRunning) {
                // ゲームが停止中の場合、開始する
                // ユーザーの操作でオーディオコンテキストを開始
                await Tone.start();
                console.log('AudioContext started');
                // スコアが勝利点に達している場合は、ゲームを完全にリセットしてから開始
                if (player1.score >= winningScore || player2.score >= winningScore) {
                    player1.score = 0;
                    player2.score = 0;
                    resetBall(); // パドルとボールをリセット
                }
                gameRunning = true;
                hideMessage();
            } else {
                // ゲームが実行中の場合、一時停止する
                gameRunning = false;
                showMessage("一時停止中... スペースキーで再開");
            }
            break;
    }
});

// キーアップイベント
document.addEventListener('keyup', (e) => {
    switch (e.key) {
        case 'ArrowUp':
            upArrowPressed = false;
            break;
        case 'ArrowDown':
            downArrowPressed = false;
            break;
    }
});

// リセットボタンのクリックイベント
resetButton.addEventListener('click', async () => {
    // ユーザーの操作でオーディオコンテキストを開始
    await Tone.start();
    console.log('AudioContext started via reset button');
    player1.score = 0;
    player2.score = 0;
    resetBall(); // パドルとボールをリセット
});

// サウンドON/OFFボタンのクリックイベント
toggleSoundButton.addEventListener('click', async () => {
    // ユーザーの操作でオーディオコンテキストを開始
    await Tone.start();
    console.log('AudioContext started via sound toggle button');

    soundEnabled = !soundEnabled; // サウンド状態を反転
    toggleSoundButton.textContent = `サウンド: ${soundEnabled ? 'ON' : 'OFF'}`; // ボタンのテキストを更新
    // 必要に応じてボタンのスタイルも更新
    if (soundEnabled) {
        toggleSoundButton.classList.remove('from-gray-500', 'to-gray-600');
        toggleSoundButton.classList.add('from-green-500', 'to-teal-500');
    } else {
        toggleSoundButton.classList.remove('from-green-500', 'to-teal-500');
        toggleSoundButton.classList.add('from-gray-500', 'to-gray-600');
    }
});

// CPU強さボタンのクリックイベント
cpuStrongButton.addEventListener('click', () => setCpuDifficulty('strong'));
cpuWeakButton.addEventListener('click', () => setCpuDifficulty('weak'));

// パドル幅ボタンのクリックイベント
paddleWideButton.addEventListener('click', () => setPaddleSize('wide'));
paddleNormalButton.addEventListener('click', () => setPaddleSize('normal'));
paddleNarrowButton.addEventListener('click', () => setPaddleSize('narrow'));


// --- ゲームループ ---

// メインのゲームループ
function gameLoop() {
    update();   // ゲームの状態を更新
    draw();     // 描画
    requestAnimationFrame(gameLoop); // 次のフレームを要求
}

// ゲームの初期化と開始
window.onload = function() {
    resetBall(); // ボールとパドルを初期位置にリセットし、ゲームを一時停止状態にする
    gameLoop();  // ゲームループを開始（描画は常に実行される）
    setCpuDifficulty('strong'); // デフォルトはCPU「強い」に設定
    setPaddleSize('normal'); // デフォルトはプレイヤーパドル「普通」に設定
};
