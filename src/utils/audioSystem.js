export const audioContext = new (window.AudioContext || window.webkitAudioContext)();
export const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;
analyser.connect(audioContext.destination);

let scheduledSources = [];
let nextStartTime = 0;

export function playAudioBuffer(buffer, onEndedCallback) {
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(analyser);

  const now = audioContext.currentTime;
  nextStartTime = Math.max(now, nextStartTime);
  source.start(nextStartTime);
  nextStartTime += buffer.duration;

  scheduledSources.push(source);
  source.onended = () => {
    const idx = scheduledSources.indexOf(source);
    if (idx > -1) scheduledSources.splice(idx, 1);
    if (scheduledSources.length === 0 && onEndedCallback) {
      onEndedCallback();
    }
  };
}

export function stopAudioPlayback() {
  scheduledSources.forEach((s) => {
    try { s.stop(); } catch (e) {}
  });
  scheduledSources = [];
  nextStartTime = audioContext.currentTime;
}

export function getVolume() {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i];
  }
  return (sum / dataArray.length) / 255.0;
}
