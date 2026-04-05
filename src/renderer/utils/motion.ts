export interface MotionVariant {
    className: string
    durationSec: number
}

export const noneVariant = { className: "none", durationSec: 4 }
export const motionVariants: Array<MotionVariant> = [
    // noneVariant, 
    { className: "yurayura", durationSec: 3 },
    { className: "poyoyon", durationSec: 4 },
    { className: "pulse", durationSec: 2.5 },   // ★ 追加
    { className: "wobble", durationSec: 4 }    // ★ 追加
]

export function choiceMotionVariant(): MotionVariant {
    const index = Math.floor(Math.random() * motionVariants.length)
    return motionVariants[index]
}

// 画面中央付近を避けるためのランダム座標生成（お好みで調整可能）
export function getRandomPosition() {
    return {
        top: Math.floor(Math.random() * 80) + 10, // 10% ~ 90%
        left: Math.floor(Math.random() * 80) + 10, // 10% ~ 90%
        rotate: Math.floor(Math.random() * 60) - 30, // -30deg ~ 30deg
    };
}
