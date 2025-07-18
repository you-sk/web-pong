// paddle.js

import { drawRect } from './graphics.js';

class Paddle {
    constructor(x, y, width, height, speed, canvas) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.canvas = canvas;
    }

    draw(ctx, color) {
        drawRect(ctx, this.x, this.y, this.width, this.height, color);
    }

    moveUp() {
        this.y -= this.speed;
        if (this.y < 0) {
            this.y = 0;
        }
    }

    moveDown() {
        this.y += this.speed;
        if (this.y + this.height > this.canvas.height) {
            this.y = this.canvas.height - this.height;
        }
    }

    reset(initialY) {
        this.y = initialY;
    }
}

export default Paddle;
