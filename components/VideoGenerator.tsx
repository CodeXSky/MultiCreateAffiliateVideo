import React, { useState, useEffect } from 'react';
import { Flow } from 'flow-sdk';
import { ProductData, VideoScript, UserConfig, ScriptScene, AIModelType } from '../types';
import { ffmpegService } from '../services/ffmpegService';
import { audioService, FREE_BGM_URLS } from '../services/AudioService';
interface VideoGeneratorProps {
  productData: ProductData;
  userConfig: UserConfig;
  onUpdateConfig: (config: UserConfig) => void;
  script: VideoScript;
  onUpdateScript: React.Dispatch<React.SetStateAction<VideoScript | null>> | ((script: VideoScript) => void);
  onBack: () => void;
}
export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ productData, userConfig, onUpdateConfig, script, onUpdateScript, onBack }) => {
  const [isRendering, setIsRendering] = useState<Record<number, boolean>>({});
  const [isRenderingBatch, setIsRenderingBatch] = useState(false);
  const [batchProgressText, setBatchProgressText] = useState<string>('');
  const [isCombining, setIsCombining] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [finalBase64, setFinalBase64] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isFFmpegReady, setIsFFmpegReady] = useState(false);
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'error' | 'system'}[]>([]);
  const [editingPromptId, setEditingPromptId] = useState<number | null>(null);
  const [selectedVideoScenes, setSelectedVideoScenes] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true });
  const availableVideoModels: { id: AIModelType; name: string; tag: string; desc: string; icon: string }[] = [
    {
      id: 'Veo 3.1 - Lite',
      name: 'Veo 3.1 - Lite',
      tag: 'Khuyên Dùng (Mặc định)',
      desc: 'Tối ưu độ ổn định hình thể sản phẩm, chuyển động mượt mà điện ảnh (8s, 720p).',
      icon: 'verified'
    },
    {
      id: 'Omni 1.1 Flash',
      name: 'Omni 1.1 Flash',
      tag: 'Tốc độ cao & Linh hoạt',
      desc: 'Render nhanh, hỗ trợ đa độ dài (4s - 10s) và âm thanh tích hợp trực tiếp.',
      icon: 'bolt'
    },
    {
      id: 'Veo 3.1 - Fast',
      name: 'Veo 3.1 - Fast',
      tag: 'Chất lượng cao nhanh',
      desc: 'Chuyển động sắc nét cao hơn, tối ưu độ trung thực chi tiết.',
      icon: 'speed'
    },
    {
      id: 'Veo 3.1 - Quality',
      name: 'Veo 3.1 - Quality',
      tag: 'Chi tiết cao nhất',
      desc: 'Mô hình chất lượng điện ảnh cao cấp nhất cho sản phẩm thương mại.',
      icon: 'star'
    }
  ];
  useEffect(() => {
    addLog('Khởi tạo hệ thống Render Video...', 'system');
    ffmpegService.load((msg) => {
      if (msg.includes('Error') || msg.includes('fail')) addLog(msg, 'error');
    }).then(() => {
      setIsFFmpegReady(true);
      addLog('Hệ thống xử lý FFmpeg WASM sẵn sàng.', 'system');
    }).catch(err => {
      addLog('Khởi tạo FFmpeg: ' + err.message, 'error');
    });
  }, []);
  const addLog = (msg: string, type: 'info' | 'error' | 'system' = 'info') => {
    setLogs(prev => [...prev, { msg, type }].slice(-30));
  };
  // Cập nhật cảnh an toàn bằng functional update
  const handleUpdateScene = (id: 1 | 2 | 3, updates: Partial<ScriptScene>) => {
    (onUpdateScript as any)((prev: VideoScript | null) => {
      const base = prev || script;
      const key = `scene${id}` as keyof VideoScript;
      return {
        ...base,
        [key]: {
          ...(base[key] as ScriptScene),
          ...updates
        }
      };
    });
  };
  const toggleSelectVideo = (id: 1 | 2 | 3) => {
    setSelectedVideoScenes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  const handleSelectAllVideos = (select: boolean) => {
    setSelectedVideoScenes({ 1: select, 2: select, 3: select });
  };
  const renderSingleScene = async (id: 1 | 2 | 3, retryCount = 1): Promise<{ id: 1 | 2 | 3; base64: string; mediaId: string }> => {
    const sceneData = id === 1 ? script.scene1 : id === 2 ? script.scene2 : script.scene3;
    
    if (!sceneData.sceneImageMediaId) {
      throw new Error(`Cảnh ${id} chưa có Khung hình Neo (Ảnh Mẫu). Vui lòng quay lại Bước 4 để tạo trước.`);
    }
    const currentModel = userConfig.selectedModel || 'Veo 3.1 - Lite';
    addLog(`Đang gửi lệnh render Cảnh ${id} bằng [${currentModel}]...`, 'info');
    
    const productTraits = productData.physicalTraits || productData.name;
    const cleanDialogue = (sceneData.hook || '').trim().replace(/"/g, "'");
    const prompt = `CRITICAL PRODUCT CONTINUITY (EXACT FIRST FRAME ANCHOR):
The video clip MUST start EXACTLY from the provided first frame without morphing or redesigning the object.
PRODUCT SKU: "${productData.name}".
PHYSICAL TRAITS: ${productTraits}.
AUDIO & SPOKEN DIALOGUE (NATIVE VIETNAMESE VOICEOVER):
Voiceover speaker speaks fluent, natural native Vietnamese.
Says: "${cleanDialogue}"
DESIRED VISUAL ACTION:
${sceneData.visual}
STRICT TECHNICAL RULES:
- AUDIO MUST SPEAK IN VIETNAMESE matching the dialogue: "${cleanDialogue}". No English gibberish audio or random English speech.
- The item in the video must maintain the EXACT shape, color, surface material, branding, and buttons shown in the initial frame.
- Smooth natural video motion, photorealistic commercial physics, 9:16 vertical format.
- STRICT NO TEXT OVERLAYS: Do not render or generate any English subtitles, English typography, or random floating English words in the footage.
- NO morphing of the product, NO vanishing logos, NO sudden product substitution.`;
    const isVeo = currentModel.startsWith('Veo');
    const targetDuration = isVeo ? 8 : (sceneData.duration || 8);
    try {
      const result = await Flow.generate.video({
        prompt,
        modelDisplayName: currentModel,
        aspectRatio: '9:16',
        durationSeconds: targetDuration,
        resolution: '720p',
        firstFrameImageMediaId: sceneData.sceneImageMediaId,
      });
      addLog(`✓ Đã render thành công Cảnh ${id} bằng [${currentModel}]!`, 'system');
      return { id, base64: result.base64, mediaId: result.mediaId };
    } catch (err: any) {
      // Nếu gặp lỗi quá tải/concurrency hoặc network, tự động retry 1 lần sau 3s delay
      if (retryCount > 0) {
        addLog(`Cảnh ${id} gặp nghẽn mạng (${err?.message || 'Lỗi server'}). Tự động thử lại lần cuối sau 3s...`, 'error');
        await new Promise(r => setTimeout(r, 3000));
        return renderSingleScene(id, retryCount - 1);
      }
      throw err;
    }
  };
  // Render lẻ 1 cảnh
  const handleRenderScene = async (id: 1 | 2 | 3) => {
    setIsRendering(prev => ({ ...prev, [id]: true }));
    setError(null);
    try {
      const result = await renderSingleScene(id);
      handleUpdateScene(id, { videoBase64: result.base64, videoMediaId: result.mediaId });
    } catch (err: any) {
      setError(err.message);
      addLog(`Lỗi Render Cảnh ${id}: ` + err.message, 'error');
    } finally {
      setIsRendering(prev => ({ ...prev, [id]: false }));
    }
  };
  // Render hàng loạt tuần tự có giãn cách hàng đợi (Queue Sequential Worker)
  // Lý do video 2 & 3 hay bị lỗi: Backend AI giới hạn quota đồng thời (concurrency limit)
  // Khi gửi 3 request song song cùng 1 giây qua Promise.all, request 2 & 3 bị server từ chối (Rate Limit / High Load).
  // Chạy tuần tự với delay 1.5s giữa các cảnh giúp cả 3 cảnh đều render thành công 100%.
  const handleRenderSelectedScenes = async () => {
    const targetIds = ([1, 2, 3] as (1 | 2 | 3)[]).filter(id => selectedVideoScenes[id]);
    if (targetIds.length === 0) {
      setError("Vui lòng tích chọn ít nhất 1 cảnh video để render.");
      return;
    }
    const missingAnchors = targetIds.filter(id => {
      const sc = id === 1 ? script.scene1 : id === 2 ? script.scene2 : script.scene3;
      return !sc.sceneImageMediaId;
    });
    if (missingAnchors.length > 0) {
      setError(`Cảnh ${missingAnchors.join(', ')} chưa có Khung hình mẫu Bước 4. Vui lòng quay lại Bước 4 để tạo trước.`);
      return;
    }
    setIsRenderingBatch(true);
    setError(null);
    addLog(`Bắt đầu tiến trình render ${targetIds.length} cảnh video theo hàng đợi an toàn (chống lỗi rate-limit backend)...`, 'system');
    const completedResults: { id: 1 | 2 | 3; base64: string; mediaId: string }[] = [];
    const failedIds: { id: number; error: string }[] = [];
    try {
      for (let i = 0; i < targetIds.length; i++) {
        const id = targetIds[i];
        setBatchProgressText(`Đang xử lý Cảnh ${id} (${i + 1}/${targetIds.length})...`);
        setIsRendering(prev => ({ ...prev, [id]: true }));
        addLog(`>> [${i + 1}/${targetIds.length}] Đang xử lý Video Cảnh ${id}...`, 'info');
        try {
          const res = await renderSingleScene(id);
          completedResults.push(res);
          // Cập nhật ngay kết quả của cảnh này vào state để người dùng xem được ngay
          handleUpdateScene(id, { videoBase64: res.base64, videoMediaId: res.mediaId });
        } catch (err: any) {
          console.error(`Lỗi render video Cảnh ${id}:`, err);
          failedIds.push({ id, error: err?.message || 'Lỗi xử lý' });
          addLog(`✗ Lỗi render Cảnh ${id}: ${err?.message || 'Không thành công'}`, 'error');
        } finally {
          setIsRendering(prev => ({ ...prev, [id]: false }));
        }
        // Nếu còn cảnh tiếp theo, tạo một khoảng nghỉ giãn cách 1.5s để server reset tải
        if (i < targetIds.length - 1) {
          addLog(`Nghỉ giãn cách 1.5s trước khi render cảnh kế tiếp...`, 'info');
          await new Promise(r => setTimeout(r, 1500));
        }
      }
      if (failedIds.length > 0) {
        setError(`Hoàn thành ${completedResults.length}/${targetIds.length} video. Cảnh ${failedIds.map(f => f.id).join(', ')} lỗi: ${failedIds[0].error}`);
      } else {
        addLog(`🎉 Tuyệt vời! Cả ${completedResults.length} cảnh video đã được render thành công!`, 'system');
      }
    } catch (err: any) {
      setError("Lỗi render: " + err.message);
      addLog("Lỗi: " + err.message, 'error');
    } finally {
      setIsRenderingBatch(false);
      setBatchProgressText('');
      setIsRendering({ 1: false, 2: false, 3: false });
    }
  };
  const handleCombineFinal = async () => {
    if (!script.scene1.videoBase64 || !script.scene2.videoBase64 || !script.scene3.videoBase64) {
      setError("Vui lòng render đủ 3 cảnh video trước khi ghép nối.");
      return;
    }
    
    setIsCombining(true);
    setStatus('Chuẩn bị tài nguyên video...');
    setError(null);
    setProgress(10);
    addLog('Bắt đầu ghép nối 3 cảnh video...', 'system');
    try {
      if (!isFFmpegReady) {
        addLog('Đang nạp bộ xử lý FFmpeg Core...', 'info');
        await ffmpegService.load();
        setIsFFmpegReady(true);
      }
      addLog('Dọn dẹp bộ nhớ tạm...', 'info');
      for (const f of ['c1.mp4', 'c2.mp4', 'c3.mp4', 'concat.txt', 'merged_silent.mp4', 'final.mp4', 'bgm.mp3']) {
        await ffmpegService.deleteFile(f);
      }
      addLog('Nạp 3 cảnh video...', 'info');
      const sceneB64s = [script.scene1.videoBase64, script.scene2.videoBase64, script.scene3.videoBase64];
      for (let i = 0; i < 3; i++) {
        const bytes = Uint8Array.from(atob(sceneB64s[i]!), c => c.charCodeAt(0));
        await ffmpegService.writeFile(`c${i+1}.mp4`, bytes);
      }
      setProgress(40);
      addLog('Ghép nối 3 đoạn video liền mạch...', 'info');
      const listContent = "file 'c1.mp4'\nfile 'c2.mp4'\nfile 'c3.mp4'";
      await ffmpegService.writeFile('concat.txt', new TextEncoder().encode(listContent));
      await ffmpegService.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat.txt',
        '-c', 'copy',
        '-movflags', 'faststart',
        '-y', 'merged_silent.mp4'
      ]);
      setProgress(70);
      let outputFileName = 'merged_silent.mp4';
      const selectedBgm = FREE_BGM_URLS.find(b => b.id === userConfig.bgmId);
      
      if (selectedBgm) {
        addLog(`Đang trộn nhạc nền nhẹ (volume 12%): ${selectedBgm.name}...`, 'info');
        try {
          const bgmBytes = await audioService.fetchAudio(selectedBgm.url);
          await ffmpegService.writeFile('bgm.mp3', bgmBytes);
          
          await ffmpegService.exec([
            '-i', 'merged_silent.mp4',
            '-stream_loop', '-1',
            '-i', 'bgm.mp3',
            '-filter_complex', '[1:a]volume=0.12[bgm];[0:a][bgm]amix=inputs=2:duration=first[a]',
            '-map', '0:v',
            '-map', '[a]',
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-shortest',
            '-y', 'final.mp4'
          ]);
          outputFileName = 'final.mp4';
        } catch (bgmErr) {
          addLog('Lỗi nạp nhạc nền (tiếp tục xuất video gốc): ' + bgmErr, 'error');
        }
      }
      setProgress(90);
      const out = await ffmpegService.readFile(outputFileName);
      const blob = new Blob([out.buffer], { type: 'video/mp4' });
      const b64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });
      setFinalBase64(b64);
      setFinalVideoUrl(URL.createObjectURL(blob));
      
      addLog('Đang lưu video vào Thư viện...', 'info');
      await Flow.save({ 
        base64: b64, 
        mimeType: 'video/mp4', 
        name: `Affiliate_Viral_${productData.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)}` 
      });
      addLog('Video quảng cáo đã hoàn thành thành công!', 'system');
      setProgress(100);
      setStatus('Hoàn tất!');
    } catch (err: any) {
      console.error(err);
      setError("Lỗi ghép video: " + err.message);
      addLog("Lỗi: " + err.message, 'error');
    } finally {
      setIsCombining(false);
    }
  };
  const isAllRendered = !!(script.scene1.videoBase64 && script.scene2.videoBase64 && script.scene3.videoBase64);
  const isAnyRendering = isRendering[1] || isRendering[2] || isRendering[3] || isRenderingBatch;
  const selectedVideoCount = ([1, 2, 3] as (1 | 2 | 3)[]).filter(id => selectedVideoScenes[id]).length;
  return (
    <div className="w-full flex flex-col gap-8 pb-20 animate-in fade-in duration-500">
      {/* Khối cấu hình Model Render AI */}
      <div className="p-6 rounded-3xl bg-[#1d1b2e] border border-purple-500/30 flex flex-col gap-5 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400">videocam</span>
              <h2 className="text-sm font-black uppercase text-purple-300 tracking-wider">
                Mô Hình AI Render Video (Tùy Chọn)
              </h2>
            </div>
            <p className="text-[11px] text-slate-300">
              Chọn model tạo video I2V từ khung hình neo sản phẩm. Mặc định là <b>Veo 3.1 - Lite</b> (tối ưu tính nhất quán và chi tiết sản phẩm).
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-black uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">settings_suggest</span>
            ĐANG CHỌN: {userConfig.selectedModel || 'Veo 3.1 - Lite'}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {availableVideoModels.map((model) => {
            const isSelected = (userConfig.selectedModel || 'Veo 3.1 - Lite') === model.id;
            return (
              <button
                key={model.id}
                onClick={() => onUpdateConfig({ ...userConfig, selectedModel: model.id })}
                disabled={isAnyRendering || isCombining}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all relative ${
                  isSelected 
                    ? 'bg-purple-600/25 border-purple-400 shadow-lg shadow-purple-900/30 ring-1 ring-purple-400' 
                    : 'bg-black/40 border-slate-800 hover:border-slate-700 hover:bg-black/60'
                } disabled:opacity-50`}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`material-symbols-outlined text-lg ${isSelected ? 'text-purple-300' : 'text-slate-400'}`}>
                      {model.icon}
                    </span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-purple-400/20 text-purple-200 border border-purple-400/40' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {model.tag}
                    </span>
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-tight text-white mt-1">
                    {model.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    {model.desc}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 pt-2 border-t border-white/5 text-[9px] font-bold">
                  {isSelected ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">check</span>
                      Đang kích hoạt
                    </span>
                  ) : (
                    <span className="text-slate-500 uppercase">Nhấn để chọn</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-6 rounded-3xl bg-[#181524] border border-purple-800/30 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-400">record_voice_over</span>
            <h3 className="text-sm font-black uppercase text-purple-400 tracking-wider">
              Bước 5: Tạo Video Từ Khung Hình Neo (Says: Voiceover Tiếng Việt)
            </h3>
          </div>
          <p className="text-[11px] text-slate-300 max-w-xl leading-relaxed">
            Hệ thống sử dụng cơ chế <b>hàng đợi tuần tự an toàn</b> chống nghẽn backend, tự động tạo từng video liên tiếp kèm cơ chế thử lại nếu server bận.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-xl border border-slate-800 text-[10px] text-slate-400">
            <span>Chọn:</span>
            <button 
              onClick={() => handleSelectAllVideos(true)} 
              className="text-purple-400 hover:text-purple-300 font-bold uppercase underline"
            >
              Tất cả (3)
            </button>
            <span className="text-slate-600">|</span>
            <button 
              onClick={() => handleSelectAllVideos(false)} 
              className="text-slate-400 hover:text-white font-bold uppercase"
            >
              Bỏ chọn
            </button>
          </div>
          <button
            onClick={handleRenderSelectedScenes}
            disabled={isAnyRendering || isCombining || selectedVideoCount === 0}
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 active:scale-95 transition-all disabled:opacity-40 disabled:grayscale"
          >
            {isRenderingBatch ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-sm">movie_filter</span>
            )}
            {isRenderingBatch ? (batchProgressText || 'Đang render theo hàng đợi...') : `Render ${selectedVideoCount} video đã chọn`}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((num) => {
          const id = num as 1 | 2 | 3;
          const sc = id === 1 ? script.scene1 : id === 2 ? script.scene2 : script.scene3;
          const isSelected = !!selectedVideoScenes[id];
          const isCurrentRendering = !!isRendering[id];
          return (
            <div 
              key={id} 
              className={`p-4 rounded-2xl bg-[#181524] border transition-all ${
                isSelected 
                  ? 'border-purple-500/60 ring-1 ring-purple-500/30 bg-[#1b172a]' 
                  : sc.videoBase64 
                  ? 'border-emerald-500/30 shadow-lg shadow-emerald-950/20' 
                  : 'border-purple-800/30'
              }`}
            >
              {/* Header card: Checkbox multi-select + tên cảnh */}
              <div className="flex justify-between items-center mb-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={() => toggleSelectVideo(id)}
                    className="w-4 h-4 rounded border-purple-500/40 text-purple-600 focus:ring-0 focus:ring-offset-0 bg-black/60 cursor-pointer accent-purple-600"
                  />
                  <span className={`text-[11px] font-black uppercase tracking-wider ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                    Video Cảnh {id}
                  </span>
                </label>
                {sc.videoBase64 && !isCurrentRendering ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-bold text-emerald-400 uppercase">Đã Tạo Thành Công</span>
                    <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
                  </div>
                ) : (
                  <span className="text-[8px] font-bold text-purple-400 uppercase">
                    {(userConfig.selectedModel || 'Veo 3.1 - Lite').startsWith('Veo') ? '8s (Veo)' : `${sc.duration} giây`}
                  </span>
                )}
              </div>
              
              <div className="aspect-[9/16] rounded-xl bg-black overflow-hidden relative border border-slate-800 group shadow-inner">
                {isCurrentRendering ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10 p-4 text-center">
                    <div className="w-10 h-10 border-3 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                    <span className="text-[9px] font-black text-purple-300 mt-3 uppercase tracking-wider animate-pulse">
                      Đang render bằng {userConfig.selectedModel || 'Veo 3.1 - Lite'}...
                    </span>
                    <span className="text-[8px] text-slate-500 mt-1">Says: "{sc.hook.slice(0, 30)}..."</span>
                  </div>
                ) : sc.videoBase64 ? (
                  <video src={`data:video/mp4;base64,${sc.videoBase64}`} className="w-full h-full object-cover" controls playsInline />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center relative">
                    {sc.sceneImageBase64 ? (
                      <>
                        <img src={`data:image/png;base64,${sc.sceneImageBase64}`} className="w-full h-full object-cover opacity-40 grayscale-[0.3]" alt="Khung hình mẫu" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30 backdrop-blur-[1px]">
                          <span className="material-symbols-outlined text-3xl text-purple-400">play_circle_outline</span>
                          <span className="text-[9px] font-black text-white uppercase tracking-wider">Đã có khung hình neo</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-600">
                        <span className="material-symbols-outlined text-4xl">warning</span>
                        <span className="text-[8px] font-bold uppercase">Thiếu khung hình mẫu Bước 4</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Lời thoại tiếng Việt truyền thẳng vào video qua Says: */}
              <div className="mt-3 p-2.5 rounded-xl bg-black/40 border border-purple-800/40 flex flex-col gap-1">
                <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Voiceover Lồng Tiếng (Says:):
                </span>
                <p className="text-[11px] text-purple-100 font-medium italic line-clamp-2 leading-relaxed">"{sc.hook}"</p>
              </div>
              {/* Chỉ dẫn chuyển động của cảnh */}
              <div className="mt-2 p-2 rounded-xl bg-black/30 border border-slate-800/60 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Chỉ dẫn chuyển động cảnh:</span>
                  <button 
                    onClick={() => setEditingPromptId(editingPromptId === id ? null : id)}
                    className="text-[8px] font-bold text-purple-400 hover:text-purple-300 uppercase flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-[10px]">{editingPromptId === id ? 'close' : 'edit'}</span>
                    {editingPromptId === id ? 'Đóng' : 'Sửa'}
                  </button>
                </div>
                {editingPromptId === id ? (
                  <textarea
                    rows={2}
                    value={sc.visual}
                    onChange={(e) => handleUpdateScene(id, { visual: e.target.value })}
                    className="w-full bg-slate-900 border border-purple-500/40 rounded-lg p-1.5 text-[10px] text-purple-100 outline-none resize-none"
                    placeholder="Mô tả hành động của camera và người cầm sản phẩm..."
                  />
                ) : (
                  <p className="text-[9px] text-slate-400 truncate italic">{sc.visual}</p>
                )}
              </div>
              <button 
                onClick={() => handleRenderScene(id)} 
                disabled={isAnyRendering || isCombining || !sc.sceneImageBase64} 
                className={`w-full mt-3 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${
                  sc.videoBase64 
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                  : 'bg-purple-600 text-white shadow-lg shadow-purple-900/20 active:scale-95'
                } disabled:opacity-30`}
              >
                {sc.videoBase64 ? `Tạo lại video cảnh ${id} này` : `Tạo riêng Video Cảnh ${id}`}
              </button>
            </div>
          );
        })}
      </div>
      <div className={`p-1 rounded-3xl transition-all duration-700 ${isAllRendered ? 'bg-gradient-to-tr from-purple-500/40 via-emerald-500/40 to-rose-500/40 shadow-[0_0_50px_rgba(168,85,247,0.15)]' : 'bg-slate-800/50'}`}>
        <div className={`p-8 rounded-[22px] bg-[#1d1b2e] flex flex-col md:flex-row gap-10 items-start ${!isAllRendered ? 'opacity-60 grayscale-[0.5]' : ''}`}>
          <div className="w-full md:w-80 shrink-0 flex flex-col gap-4">
             <div className="aspect-[9/16] rounded-2xl bg-black border-2 border-slate-800 overflow-hidden relative shadow-2xl">
                {isCombining ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md">
                     <div className="relative w-16 h-16 flex items-center justify-center">
                        <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
                        <div className="absolute inset-0 border-4 border-t-emerald-500 rounded-full animate-spin" />
                        <span className="text-[10px] font-black text-emerald-400">{progress}%</span>
                     </div>
                     <span className="text-[10px] font-black text-white uppercase mt-4 tracking-widest animate-pulse">{status}</span>
                  </div>
                ) : finalVideoUrl ? (
                  <video src={finalVideoUrl} controls autoPlay loop playsInline className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-700">
                    <span className="material-symbols-outlined text-6xl">movie</span>
                    <span className="text-[10px] font-black uppercase tracking-tighter">Video Hoàn Chỉnh</span>
                  </div>
                )}
             </div>
             
             {finalVideoUrl && (
               <button 
                onClick={() => Flow.download({ base64: finalBase64!, mimeType: 'video/mp4', filename: `affiliate_viral_${productData.name.replace(/[^a-zA-Z0-9]/g, '_')}.mp4` })}
                className="w-full py-4 rounded-xl bg-white text-black font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-slate-100 transition-all shadow-xl active:scale-95"
               >
                 <span className="material-symbols-outlined text-lg">download</span>
                 Tải Video Xuống Máy
               </button>
             )}
          </div>
          <div className="flex-1 flex flex-col gap-6 w-full">
            <div className="flex flex-col gap-2">
              <h3 className="text-2xl font-black uppercase text-white tracking-tighter italic flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-400">auto_awesome</span>
                Xuất Bản Video Hoàn Chỉnh Chuẩn Mẫu
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Video được hợp nhất từ 3 cảnh theo chuẩn tỉ lệ dọc 9:16, ghép nhạc nền kích thích chuyển đổi 
                và khóa chặt ngoại hình sản phẩm thực tế từ giây đầu tiên đến giây cuối cùng.
              </p>
            </div>
            <div className="bg-black/40 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 shadow-inner">
               <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nhật ký xử lý (Tiến trình)</span>
                  <div className="flex gap-1.5 items-center">
                    <div className={`w-2 h-2 rounded-full ${isFFmpegReady ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Bộ ghép video sẵn sàng</span>
                  </div>
               </div>
               <div className="h-32 overflow-y-auto font-mono text-[10px] flex flex-col gap-1.5 no-scrollbar scroll-smooth">
                  {logs.map((log, i) => (
                    <div key={i} className={`flex gap-2 animate-in slide-in-from-left-2 ${log.type === 'error' ? 'text-rose-400' : log.type === 'system' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                      <span className="opacity-30 select-none">{i+1}</span>
                      <span className="opacity-50 select-none">[{new Date().toLocaleTimeString([], {hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                      <span>{log.msg}</span>
                    </div>
                  ))}
                  {logs.length === 0 && <span className="text-slate-700 italic">Hệ thống đang chờ lệnh ghép...</span>}
               </div>
            </div>
            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">error</span>
                {error}
              </div>
            )}
            <div className="flex flex-col gap-3 pt-2">
              <button 
                onClick={handleCombineFinal} 
                disabled={!isAllRendered || isCombining || isAnyRendering} 
                className={`w-full py-5 rounded-2xl font-black uppercase text-sm tracking-widest transition-all flex items-center justify-center gap-3 ${isAllRendered && !isCombining && !isAnyRendering ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-2xl shadow-emerald-900/40 hover:from-emerald-500 active:scale-[0.98]' : 'bg-slate-800 text-slate-600 border border-slate-700'}`}
              >
                {isCombining ? (
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined">auto_fix_high</span>
                )}
                {isCombining ? 'Đang ghép video và nhạc...' : 'Hợp Nhất & Xuất Video Hoàn Chỉnh'}
              </button>
              
              <button onClick={onBack} disabled={isCombining || isAnyRendering} className="w-full py-3 rounded-xl border border-slate-800 text-slate-500 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all">Quay lại Khóa Ảnh Mẫu</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};