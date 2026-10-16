import React, { useState, useEffect, useRef } from 'react';
import { Flow } from 'flow-sdk';
import { VideoScript, UserConfig, ScriptScene, VnVoiceOption } from '../types';
import { audioService } from '../services/AudioService';
interface ScriptPanelProps {
  script: VideoScript;
  onUpdateScript: (script: VideoScript) => void;
  config: UserConfig;
  onUpdateConfig: (config: UserConfig) => void;
  onNext: () => void;
  onBack: () => void;
  isActive: boolean;
}
export const ScriptPanel: React.FC<ScriptPanelProps> = ({ script, onUpdateScript, config, onUpdateConfig, onNext, onBack, isActive }) => {
  const [isRecordingScene, setIsRecordingScene] = useState<number | null>(null);
  const [recordTime, setRecordTime] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const timerRef = useRef<number | null>(null);
  const sceneFileInputRef = useRef<HTMLInputElement>(null);
  const [activeSceneUpload, setActiveSceneUpload] = useState<number | null>(null);
  useEffect(() => {
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      const viVoices = allVoices.filter(v => v.lang.toLowerCase().includes('vi'))
        .sort((a, b) => {
          if (a.name.includes('Google') || a.name.includes('Natural')) return -1;
          return 0;
        });
      setVoices(viVoices);
      if (viVoices.length > 0 && !selectedVoice) {
        const bestVoice = viVoices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || viVoices[0];
        setSelectedVoice(bestVoice.name);
      }
    };
    
    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectedVoice]);
  const handleUpdateScene = (sceneId: 1 | 2 | 3, updates: Partial<ScriptScene>) => {
    const updatedScript = { ...script };
    const sceneKey = `scene${sceneId}` as keyof VideoScript;
    (updatedScript[sceneKey] as ScriptScene) = { ...updatedScript[sceneKey], ...updates };
    onUpdateScript(updatedScript);
  };
  const handleRecordScene = async (id: 1 | 2 | 3) => {
    setIsRecordingScene(id);
    setRecordTime(0);
    timerRef.current = window.setInterval(() => setRecordTime(prev => prev + 1), 1000);
    try {
      const audio = await Flow.microphone.record({ durationMs: 30000 });
      handleUpdateScene(id, {
        voiceBase64: audio.base64,
        voiceName: `Ghi âm Tiếng Việt Cảnh ${id}`
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsRecordingScene(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };
  const handleUploadSceneGallery = async (id: 1 | 2 | 3) => {
    try {
      const audio = await Flow.media.select({ filter: 'audio' });
      handleUpdateScene(id, {
        voiceMediaId: audio.mediaId,
        voiceBase64: audio.base64,
        voiceName: audio.name || `Voice VN Cảnh ${id}`
      });
    } catch (err) {
      console.error(err);
    }
  };
  const handleSceneFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeSceneUpload || !e.target.files?.[0]) return;
    const id = activeSceneUpload as 1 | 2 | 3;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      handleUpdateScene(id, {
        voiceBase64: base64,
        voiceName: file.name
      });
      setActiveSceneUpload(null);
    };
    reader.readAsDataURL(file);
  };
  const handlePreviewTTS = (text: string) => {
    audioService.speak(text, 1.15, selectedVoice);
  };
  const handlePlayVoice = (base64?: string) => {
    if (!base64) return;
    const audio = new Audio(`data:audio/webm;base64,${base64}`);
    audio.play();
  };
  const vnPresets: VnVoiceOption[] = [
    'vi-VN-Standard-A (Nữ miền Bắc)',
    'vi-VN-Standard-B (Nam miền Bắc)',
    'vi-VN-Standard-C (Nữ miền Nam)',
    'vi-VN-Standard-D (Nam miền Nam)',
  ];
  const scenes: { id: 1 | 2 | 3; title: string; data: ScriptScene; icon: string }[] = [
    { id: 1, title: 'Cảnh 1: Mở đầu Hook', data: script.scene1, icon: 'campaign' },
    { id: 2, title: 'Cảnh 2: Trải nghiệm thực tế', data: script.scene2, icon: 'touch_app' },
    { id: 3, title: 'Cảnh 3: Kêu gọi chốt đơn', data: script.scene3, icon: 'shopping_cart' },
  ];
  return (
    <div className={`w-full flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500 ${!isActive ? 'opacity-50 pointer-events-none' : ''}`}>
      <input type="file" ref={sceneFileInputRef} onChange={handleSceneFileChange} accept="audio/*" className="hidden" />
      {/* Voice Lock Panel chuyên biệt Tiếng Việt */}
      <div className="p-6 rounded-3xl bg-[#1d1b2e] border border-purple-500/30 shadow-2xl flex flex-col gap-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400">lock</span>
              <label className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">
                Voice Lock: Khóa Giọng Đọc Tiếng Việt 100%
              </label>
            </div>
            <p className="text-[10px] text-slate-400">
              Đảm bảo toàn bộ lời thoại review là Tiếng Việt thuần, không bị lẫn tiếng Anh hoặc đổi tone giữa các cảnh.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">verified</span>
            VIETNAMESE AUDIO LOCKED
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">Giọng Đọc Tiếng Việt Mẫu</label>
            <select 
              value={config.vnVoicePreset}
              onChange={(e) => onUpdateConfig({ ...config, vnVoicePreset: e.target.value as VnVoiceOption })}
              className="w-full bg-black/50 border border-purple-800/40 rounded-xl px-3 py-2.5 text-xs text-purple-200 font-medium focus:border-purple-500 outline-none"
            >
              {vnPresets.map(preset => (
                <option key={preset} value={preset} className="bg-slate-900 text-white">{preset}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">Speaker Tag / Định Danh</label>
            <input 
              type="text"
              value={config.speakerId}
              onChange={(e) => onUpdateConfig({ ...config, speakerId: e.target.value })}
              className="w-full bg-black/50 border border-purple-800/40 rounded-xl px-4 py-2.5 text-xs text-purple-300 font-mono focus:border-purple-500 outline-none"
              placeholder="e.g. MC_VIETNAMESE_PRO_01"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">Trình đọc TTS Trình Duyệt</label>
            <select 
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full bg-black/50 border border-slate-800 rounded-xl px-3 py-2.5 text-[11px] text-slate-300 outline-none focus:border-purple-500"
            >
              {voices.length > 0 ? (
                voices.map(v => (
                  <option key={v.name} value={v.name} className="bg-slate-900">{v.name} ({v.lang})</option>
                ))
              ) : (
                <option value="">Giọng Tiếng Việt mặc định</option>
              )}
            </select>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        {scenes.map((scene) => (
          <div key={scene.id} className="p-6 rounded-3xl bg-[#181524] border border-purple-800/20 flex flex-col gap-6 group hover:border-purple-500/40 transition-all shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center border border-purple-500/30">
                  <span className="material-symbols-outlined text-purple-400 text-xl">{scene.icon}</span>
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white">{scene.title}</h3>
              </div>
              <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-slate-800/50">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Thời lượng:</span>
                <select 
                  value={scene.data.duration}
                  onChange={(e) => handleUpdateScene(scene.id, { duration: Number(e.target.value) })}
                  className="bg-transparent text-[10px] text-purple-400 font-bold outline-none cursor-pointer"
                >
                  {[4, 6, 8, 10].map(d => <option key={d} value={d} className="bg-slate-900">{d}s</option>)}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black uppercase text-purple-400 tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Lời Thoại Tiếng Việt (Khóa Voice)
                  </label>
                  <button 
                    onClick={() => handlePreviewTTS(scene.data.hook)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xs">volume_up</span>
                    <span className="text-[9px] font-bold uppercase">Nghe Thử Voice VN</span>
                  </button>
                </div>
                <textarea
                  value={scene.data.hook}
                  onChange={(e) => handleUpdateScene(scene.id, { hook: e.target.value })}
                  className="w-full p-4 rounded-2xl bg-black/40 border border-purple-800/20 min-h-[100px] text-[13px] text-slate-100 leading-relaxed focus:outline-none focus:border-purple-500 transition-all resize-none shadow-inner"
                  placeholder="Nhập lời thoại review tiếng Việt..."
                />
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black uppercase text-rose-400 tracking-widest flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs">center_focus_strong</span>
                    Visual Lock Prompt (English SKU Anchoring)
                  </label>
                </div>
                <textarea
                  value={scene.data.visual}
                  onChange={(e) => handleUpdateScene(scene.id, { visual: e.target.value })}
                  className="w-full p-4 rounded-2xl bg-black/40 border border-rose-900/20 min-h-[100px] text-[12px] text-rose-100/70 leading-relaxed focus:outline-none focus:border-rose-500 transition-all resize-none shadow-inner italic"
                  placeholder="Describe camera movement and product action..."
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-3 border-t border-slate-800/50">
               <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                    Ghi âm hoặc Tải Voice Tiếng Việt riêng cho Cảnh {scene.id} (Tùy chọn)
                  </span>
                  {scene.data.voiceBase64 && (
                    <div className="flex items-center gap-3">
                      <button onClick={() => handlePlayVoice(scene.data.voiceBase64)} className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">play_circle</span>
                        <span className="text-[9px] font-bold">Nghe lại</span>
                      </button>
                      <button onClick={() => handleUpdateScene(scene.id, { voiceBase64: undefined, voiceMediaId: undefined, voiceName: undefined })} className="text-slate-600 hover:text-rose-500">
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  )}
               </div>
               {isRecordingScene === scene.id ? (
                 <div className="flex items-center justify-center gap-4 bg-rose-500/10 border border-rose-500/20 py-3 rounded-2xl animate-pulse">
                    <div className="w-3 h-3 bg-rose-500 rounded-full" />
                    <span className="text-[11px] font-black text-rose-300 uppercase tracking-widest">Đang thu âm tiếng Việt: {recordTime}s</span>
                 </div>
               ) : scene.data.voiceName ? (
                 <div className="flex items-center gap-3 bg-emerald-500/10 px-4 py-2.5 rounded-2xl border border-emerald-500/20">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
                    <span className="text-[11px] font-bold text-emerald-300 truncate">{scene.data.voiceName}</span>
                 </div>
               ) : (
                 <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => handleRecordScene(scene.id)} className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 hover:bg-rose-500/5 transition-all group/btn">
                      <span className="material-symbols-outlined text-sm text-rose-500 group-hover/btn:scale-110 transition-transform">mic</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Thu âm Mic</span>
                    </button>
                    <button onClick={() => { setActiveSceneUpload(scene.id); sceneFileInputRef.current?.click(); }} className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group/btn">
                      <span className="material-symbols-outlined text-sm text-blue-500 group-hover/btn:scale-110 transition-transform">upload_file</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Tải File Âm</span>
                    </button>
                    <button onClick={() => handleUploadSceneGallery(scene.id)} className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group/btn">
                      <span className="material-symbols-outlined text-sm text-purple-500 group-hover/btn:scale-110 transition-transform">gallery_thumbnail</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Chọn Từ Gallery</span>
                    </button>
                 </div>
               )}
            </div>
          </div>
        ))}
      </div>
      {isActive && (
        <div className="flex gap-4 mt-4 sticky bottom-4 z-10">
          <button onClick={onBack} className="px-8 py-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl">Quay lại</button>
          <button onClick={onNext} className="flex-1 py-5 rounded-2xl bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-2xl shadow-purple-900/40 active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined">center_focus_strong</span>
            Khóa Kịch Bản & Sang Bước 4 (Tạo Ảnh Neo)
          </button>
        </div>
      )}
    </div>
  );
};