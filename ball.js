import { drawCircle } from './graphics.js';

class Ball {
    constructor(x, y, size, initialSpeed, canvas) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.initialSpeed = initialSpeed;
        this.dx = initialSpeed; // ボールのX方向速度
        this.dy = initialSpeed;  // ボールのY方向速度
        this.canvas = canvas;
    }

    draw(ctx) {
        drawCircle(ctx, this.x, this.y, this.size, '#FFEB3B'); // ボールを黄色に
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;

        // ボールが上下の壁に当たった場合の処理
        if (this.y + this.size > this.canvas.height || this.y - this.size < 0) {
            this.dy *= -1; // 速度を反転
            // サウンドはmain.jsで再生するため、ここでは含めない
        }
    }

    reset() {
        this.x = this.canvas.width / 2;
        this.y = this.canvas.height / 2;
        // ボールの方向をランダムに設定
        this.dx = (Math.random() > 0.5 ? 1 : -1) * this.initialSpeed;
        this.dy = (Math.random() > 0.5 ? 1 : -1) * this.initialSpeed;
    }
}

export default Ball;
