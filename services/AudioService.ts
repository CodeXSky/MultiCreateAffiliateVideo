/**
 * AudioService handles background music and TTS generation.
 */
export const FREE_BGM_URLS = [
  { 
    id: 'energetic', 
    name: 'TikTok Energetic', 
    url: 'https://huggingface.co/datasets/flow-ai/media-assets/resolve/main/bgm_energetic.mp3' 
  },
  { 
    id: 'luxury', 
    name: 'Cinematic Luxury', 
    url: 'https://huggingface.co/datasets/flow-ai/media-assets/resolve/main/bgm_luxury.mp3' 
  },
  { 
    id: 'chill', 
    name: 'Lo-Fi Chill', 
    url: 'https://huggingface.co/datasets/flow-ai/media-assets/resolve/main/bgm_chill.mp3' 
  },
];
class AudioService {
  /**
   * Fetches an audio file as Uint8Array with better error handling for CSP.
   */
  async fetchAudio(url: string): Promise<Uint8Array> {
    try {
      const response = await fetch(url, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error("Audio fetch error:", error);
      throw new Error(`Lỗi tải nhạc: File không khả dụng hoặc bị chặn bởi CSP.`);
    }
  }
  /**
   * Standard browser TTS with voice selection.
   */
  speak(text: string, rate = 1.1, voiceName?: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = rate;
    
    if (voiceName) {
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.name === voiceName);
      if (voice) utterance.voice = voice;
    }
    
    window.speechSynthesis.speak(utterance);
  }
}
export const audioService = new AudioService();