import sound from "../../../assets/audio/sound.mp3";

const notifySound = new Audio(sound);
notifySound.preload = "auto";

export function audioPlay() {
    console.log("[Audio] Fallback sound triggered");
    notifySound.currentTime = 0;
    notifySound.play();
}
