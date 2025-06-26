// soundManager.js

class SoundManager {
    constructor() {
        // パドルヒット用のシンセ
        this.paddleHitSynth = new Tone.Synth().toDestination();
        this.paddleHitSynth.envelope.attack = 0.005;
        this.paddleHitSynth.envelope.decay = 0.1;
        this.paddleHitSynth.envelope.sustain = 0.05;
        this.paddleHitSynth.envelope.release = 0.2;

        // スコア時のサウンド用のシンセ
        this.scoreSynth = new Tone.Synth().toDestination();
        this.scoreSynth.oscillator.type = 'triangle';
        this.scoreSynth.envelope.attack = 0.01;
        this.scoreSynth.envelope.decay = 0.3;
        this.scoreSynth.envelope.sustain = 0.1;
        this.scoreSynth.envelope.release = 0.5;

        // 勝利/敗北時のサウンド用のシンセ
        this.winLossSynth = new Tone.Synth().toDestination();
        this.winLossSynth.oscillator.type = 'sine';
        this.winLossSynth.envelope.attack = 0.05;
        this.winLossSynth.envelope.decay = 0.8;
        this.winLossSynth.envelope.sustain = 0.2;
        this.winLossSynth.envelope.release = 1.0;

        this.soundEnabled = true; // サウンドのON/OFF状態, デフォルトON
    }

    async toggleSound() {
        await Tone.start();
        console.log('AudioContext started via sound toggle');
        this.soundEnabled = !this.soundEnabled;
    }

    playPaddleHitSound() {
        if (this.soundEnabled) {
            this.paddleHitSynth.triggerAttackRelease('E5', '8n');
        }
    }

    playWallHitSound() {
        if (this.soundEnabled) {
            this.paddleHitSynth.triggerAttackRelease('C5', '8n');
        }
    }

    playScoreSound(isPlayer1Score) {
        if (this.soundEnabled) {
            if (isPlayer1Score) {
                this.scoreSynth.triggerAttackRelease('C4', '4n');
            } else {
                this.scoreSynth.triggerAttackRelease('G4', '4n');
            }
        }
    }

    playWinLossSound(isWin) {
        if (this.soundEnabled) {
            if (isWin) {
                this.winLossSynth.triggerAttackRelease('C6', '1n');
            } else {
                this.winLossSynth.triggerAttackRelease('G3', '1n');
            }
        }
    }
}

export default SoundManager;
