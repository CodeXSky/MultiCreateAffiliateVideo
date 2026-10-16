export type ReviewStyle = 'tiktok_reviewer' | 'pov_closeup' | 'studio_unbox' | 'demo_usage' | 'showroom';
export type ScriptTone = 'fast' | 'emotional' | 'funny' | 'expert' | 'friendly';
export type AIModelType = 'Veo 3.1 - Lite' | 'Omni 1.1 Flash' | 'Veo 3.1 - Fast' | 'Veo 3.1 - Quality';
export type VnVoiceOption = 'vi-VN-Standard-A (Nữ miền Bắc)' | 'vi-VN-Standard-B (Nam miền Bắc)' | 'vi-VN-Standard-C (Nữ miền Nam)' | 'vi-VN-Standard-D (Nam miền Nam)';
export interface ProductData {
  name: string;
  price: string;
  sellingPoints: string[];
  category: string;
  imageUrls: string[];
  imageMediaIds: string[];
  suggestedStyle?: ReviewStyle;
  physicalTraits?: string; // Tóm tắt đặc tả nhận diện
  dimensionsAndShape?: string; // Độ dài, hình dáng, tỷ lệ khối
  microDetails?: string; // Các chi tiết bề mặt, nút bấm, cổng cắm, logo
}
export interface UserConfig {
  selectedStyle: ReviewStyle;
  scriptTone: ScriptTone;
  reviewerImageUrl?: string;
  reviewerMediaId?: string;
  useReviewerInVideo: boolean;
  bgmId?: string;
  enableTTS?: boolean;
  selectedModel: AIModelType;
  globalVoiceMediaId?: string;
  globalVoiceBase64?: string;
  globalVoiceName?: string;
  speakerId: string;
  voiceLockEnabled: boolean;
  vnVoicePreset: VnVoiceOption;
}
export interface ScriptScene {
  hook: string;
  visual: string;
  duration: number;
  sceneImageBase64?: string;
  sceneImageMediaId?: string;
  videoBase64?: string;
  videoMediaId?: string;
  voiceMediaId?: string;
  voiceBase64?: string;
  voiceName?: string;
}
export interface VideoScript {
  scene1: ScriptScene;
  scene2: ScriptScene;
  scene3: ScriptScene;
  styleLabel: string;
  toneLabel: string;
}
export type TabStatus = 'idle' | 'generating' | 'done' | 'error';
export interface ProductTabInstance {
  id: string;
  title: string;
  step: number;
  productData: ProductData | null;
  userConfig: UserConfig;
  script: VideoScript | null;
  status: TabStatus;
  statusMessage?: string;
  error?: string | null;
}