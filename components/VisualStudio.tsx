import React, { useState } from 'react';
import { Flow } from 'flow-sdk';
import { VideoScript, ProductData, ScriptScene, UserConfig } from '../types';
interface VisualStudioProps {
  script: VideoScript;
  onUpdateScript: React.Dispatch<React.SetStateAction<VideoScript | null>> | ((script: VideoScript) => void);
  productData: ProductData;
  config: UserConfig;
  onNext: () => void;
  onBack: () => void;
  isActive: boolean;
}
export const VisualStudio: React.FC<VisualStudioProps> = ({ script, onUpdateScript, productData, config, onNext, onBack, isActive }) => {
  const [isGenerating, setIsGenerating] = useState<Record<number, boolean>>({});
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingScenePrompt, setEditingScenePrompt] = useState<number | null>(null);
  const [fidelityLevel, setFidelityLevel] = useState<'ultra' | 'balanced'>('ultra');
  const [selectedScenes, setSelectedScenes] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true });
  // Cập nhật cảnh an toàn bằng functional update để tránh lỗi stale state khi chạy đồng thời
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
  const toggleSelectScene = (id: 1 | 2 | 3) => {
    setSelectedScenes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  const buildStrictPrompt = (id: 1 | 2 | 3) => {
    const sceneData = id === 1 ? script.scene1 : id === 2 ? script.scene2 : script.scene3;
    const lengthAndShape = productData.dimensionsAndShape 
      ? `EXACT 1:1 PHYSICAL DIMENSIONS & GEOMETRIC FORM: ${productData.dimensionsAndShape}.`
      : 'Maintain the exact physical length, width, thickness, curvature, and proportions seen in the reference pictures without any alterations.';
      
    const microDetails = productData.microDetails 
      ? `AUTHENTIC HARDWARE & COMPONENT DETAILS: ${productData.microDetails}.`
      : 'Preserve all buttons, indicator lights, switches, seam lines, textures, and printed brand markings identical to the reference pictures.';
    const reviewerText = config.useReviewerInVideo && config.reviewerMediaId
      ? `A real Asian / Vietnamese creator holding and presenting the real product directly to the camera lens. The hands and person MUST NOT obstruct, bend, shrink, or hide the product.`
      : `High-end commercial advertisement showcase. Clean hands interacting naturally with the product, displaying its true scale and surface build.`;
    const strictFidelityClauses = fidelityLevel === 'ultra' ? `
CRITICAL ZERO-TOLERANCE RULES (STRICT FIDELITY):
- 100% VISUAL REPLICATION: The item in the frame MUST BE AN EXACT 1:1 CLONE of the physical object in the reference images.
- DO NOT invent new buttons, ports, antennas, or handles that do not exist on the reference product.
- DO NOT alter the object's length, proportions, cylindrical/rectangular silhouette, or aspect ratio.
- DO NOT change the primary color scheme, metallic finishes, glossiness, or matte textures.
- DO NOT replace this product with generic stock gadgets, toys, or lookalike items.
- SHARP MACRO FOCUS: The product must be sharply in-focus, centered, and unobstructed in the frame.` : `
IMPORTANT PRODUCT RULES:
- The item must closely match the reference photos in silhouette, key colors, and dimensions.
- Center the product clearly in the vertical 9:16 frame.`;
    return `COMMERCIAL HERO SHOT FOR VERTICAL 9:16 VIDEO.
TARGET SUBJECT: EXACT PRODUCT FROM REFERENCE IMAGES "${productData.name}".
PHYSICAL TRAIT ANCHORING:
- ${lengthAndShape}
- ${microDetails}
${strictFidelityClauses}
SCENE CONTEXT & CAMERA STAGING:
${sceneData.visual}
${reviewerText}
LIGHTING & PHOTOGRAPHY STANDARDS:
Shot on 35mm cinema lens, f/2.8 macro depth of field, authentic commercial studio lighting highlighting authentic materials (anodized metal, premium matte polymer, glass), zero AI artifacts, crisp 8k resolution, true-to-life reflections, exact color balance matching the reference photos.`;
  };
  const generateSingleFrame = async (id: 1 | 2 | 3) => {
    const validProductRefs = productData.imageMediaIds.filter(Boolean);
    const referenceIds: string[] = [...validProductRefs.slice(0, 8)];
    
    if (config.reviewerMediaId && config.useReviewerInVideo) {
      referenceIds.push(config.reviewerMediaId);
    }
    const prompt = buildStrictPrompt(id);
    const result = await Flow.generate.image({
      prompt,
      modelDisplayName: '🍌 Nano Banana 2.1', 
      aspectRatio: '9:16',
      referenceImageMediaIds: referenceIds.length > 0 ? referenceIds : undefined
    });
    return {
      id,
      base64: result.base64,
      mediaId: result.mediaId
    };
  };
  // Render lẻ 1 cảnh
  const handleGenerateFrame = async (id: 1 | 2 | 3) => {
    setError(null);
    setIsGenerating(prev => ({ ...prev, [id]: true }));
    try {
      const result = await generateSingleFrame(id);
      handleUpdateScene(id, {
        sceneImageBase64: result.base64,
        sceneImageMediaId: result.mediaId
      });
    } catch (err: any) {
      console.error(`Lỗi tạo ảnh cảnh ${id}:`, err);
      setError(`Lỗi tạo ảnh cảnh ${id}: ${err?.message || 'Không thể tạo ảnh'}`);
    } finally {
      setIsGenerating(prev => ({ ...prev, [id]: false }));
    }
  };
  // Render cùng lúc 1 hoặc nhiều cảnh theo danh sách chọn
  const handleGenerateSelected = async () => {
    const targetIds = ([1, 2, 3] as (1 | 2 | 3)[]).filter(id => selectedScenes[id]);
    if (targetIds.length === 0) {
      setError("Vui lòng tích chọn ít nhất 1 cảnh để render.");
      return;
    }
    setError(null);
    setIsGeneratingBatch(true);
    
    // Đánh dấu các cảnh được chọn đang render
    const initialLoading: Record<number, boolean> = {};
    targetIds.forEach(id => { initialLoading[id] = true; });
    setIsGenerating(prev => ({ ...prev, ...initialLoading }));
    try {
      const promises = targetIds.map(id => 
        generateSingleFrame(id)
          .then(res => {
            // Cập nhật ngay từng cảnh khi xong qua functional state update (không ghi đè cảnh khác)
            handleUpdateScene(id, {
              sceneImageBase64: res.base64,
              sceneImageMediaId: res.mediaId
            });
            setIsGenerating(prev => ({ ...prev, [id]: false }));
            return { ok: true, id, res };
          })
          .catch(err => {
            console.error(`Lỗi tạo ảnh cảnh ${id}:`, err);
            setIsGenerating(prev => ({ ...prev, [id]: false }));
            return { ok: false, id, error: err?.message || 'Thất bại' };
          })
      );
      const results = await Promise.all(promises);
      
      // Đồng bộ toàn bộ các cảnh đã hoàn thành vào script state
      const successfulResults = results.filter((r): r is { ok: true; id: 1 | 2 | 3; res: { id: 1 | 2 | 3; base64: string; mediaId: string } } => r.ok);
      if (successfulResults.length > 0) {
        (onUpdateScript as any)((prev: VideoScript | null) => {
          const base = prev || script;
          const updated = { ...base };
          for (const item of successfulResults) {
            const key = `scene${item.id}` as keyof VideoScript;
            (updated[key] as ScriptScene) = {
              ...(updated[key] as ScriptScene),
              sceneImageBase64: item.res.base64,
              sceneImageMediaId: item.res.mediaId
            };
          }
          return updated;
        });
      }
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        setError(`Đã render xong một phần. Lỗi ở cảnh: ${failed.map(f => f.id).join(', ')}`);
      }
    } catch (err: any) {
      setError(`Lỗi quá trình render song song: ${err?.message || 'Vui lòng thử lại'}`);
    } finally {
      setIsGeneratingBatch(false);
      setIsGenerating(prev => {
        const next = { ...prev };
        targetIds.forEach(id => { next[id] = false; });
        return next;
      });
    }
  };
  const handleSelectAll = (select: boolean) => {
    setSelectedScenes({ 1: select, 2: select, 3: select });
  };
  const scenes: { id: 1 | 2 | 3; title: string; data: ScriptScene }[] = [
    { id: 1, title: 'Cảnh 1: Mở đầu ấn tượng', data: script.scene1 },
    { id: 2, title: 'Cảnh 2: Trải nghiệm thực tế', data: script.scene2 },
    { id: 3, title: 'Cảnh 3: Chốt đơn cao cấp', data: script.scene3 },
  ];
  const selectedCount = ([1, 2, 3] as (1 | 2 | 3)[]).filter(id => selectedScenes[id]).length;
  const isAllGenerated = script.scene1.sceneImageBase64 && script.scene2.sceneImageBase64 && script.scene3.sceneImageBase64;
  const isAnyGenerating = isGenerating[1] || isGenerating[2] || isGenerating[3] || isGeneratingBatch;
  return (
    <div className={`w-full flex flex-col gap-6 animate-in slide-in-from-right-4 duration-500 ${!isActive ? 'opacity-40 pointer-events-none scale-95' : ''}`}>
      <div className="p-6 rounded-3xl bg-[#1d1b2e] border border-purple-500/30 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-400">center_focus_strong</span>
            <h2 className="text-sm font-black uppercase text-purple-400 tracking-wider">
              Bước 4: Siết Chặt Khóa Ảnh Mẫu Sản Phẩm (Strict 1:1 SKU Lock)
            </h2>
          </div>
          <p className="text-[11px] text-slate-300 max-w-xl leading-relaxed">
            Hỗ trợ render lại cùng lúc <b>1 hoặc nhiều ảnh tùy chọn</b> song song, giữ nguyên 100% hình thể sản phẩm thực tế từ {productData.imageMediaIds.length} ảnh gốc.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-xl border border-slate-800 text-[10px] text-slate-400">
            <span>Chọn:</span>
            <button 
              onClick={() => handleSelectAll(true)} 
              className="text-purple-400 hover:text-purple-300 font-bold uppercase underline"
            >
              Tất cả (3)
            </button>
            <span className="text-slate-600">|</span>
            <button 
              onClick={() => handleSelectAll(false)} 
              className="text-slate-400 hover:text-white font-bold uppercase"
            >
              Bỏ chọn
            </button>
          </div>
          <button
            onClick={handleGenerateSelected}
            disabled={isAnyGenerating || selectedCount === 0}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 active:scale-95 transition-all disabled:opacity-40 disabled:grayscale"
          >
            {isGeneratingBatch ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-sm">filter_none</span>
            )}
            {isGeneratingBatch ? `Đang render ${selectedCount} ảnh...` : `Render ${selectedCount} ảnh đã chọn`}
          </button>
        </div>
      </div>
      {/* Tùy chỉnh chế độ siết chặt ảnh & thông số SKU */}
      <div className="p-4 rounded-2xl bg-black/50 border border-purple-500/20 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-purple-400 text-sm">tune</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">Độ siết bám ảnh mẫu gốc</span>
            <span className="text-[9px] text-slate-400">Tăng cường điều kiện cấm biến dạng kích thước, màu sắc & phụ kiện</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setFidelityLevel('ultra')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              fidelityLevel === 'ultra' 
                ? 'bg-purple-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-xs">lock</span>
            Siết Tối Đa (Ultra 1:1)
          </button>
          <button
            onClick={() => setFidelityLevel('balanced')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              fidelityLevel === 'balanced' 
                ? 'bg-purple-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-xs">balance</span>
            Cân Bằng Bối Cảnh
          </button>
        </div>
      </div>
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-in slide-in-from-top-1">
          <span className="material-symbols-outlined text-base">error</span>
          <span>{error}</span>
        </div>
      )}
      {/* Chi tiết dữ liệu SKU đang được khóa vào Prompt */}
      <div className="px-5 py-4 rounded-2xl bg-black/40 border border-slate-800 flex flex-col gap-2.5 text-xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="material-symbols-outlined text-purple-400 text-sm">straighten</span>
            <span className="font-bold text-white uppercase text-[10px]">Hình thể & Tỷ lệ nạp vào Prompt:</span>
            <span className="text-purple-300 text-[11px] font-medium">{productData.dimensionsAndShape || 'Tỷ lệ hình học theo các ảnh chụp thực tế'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-[10px] font-bold uppercase tracking-wider shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {productData.imageMediaIds.length} Ảnh Gốc Tham Chiếu
          </div>
        </div>
        {productData.microDetails && (
          <div className="flex items-start gap-2 text-slate-400 text-[11px] pt-1 border-t border-slate-800/60">
            <span className="font-bold text-slate-300 uppercase text-[9px] shrink-0 mt-0.5">Chi tiết cấu thành:</span>
            <span className="text-slate-300 leading-relaxed">{productData.microDetails}</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {scenes.map((scene) => {
          const isSelected = !!selectedScenes[scene.id];
          const isCurrentLoading = !!isGenerating[scene.id];
          return (
            <div 
              key={scene.id} 
              className={`p-4 rounded-2xl bg-[#181524] border transition-all flex flex-col gap-4 group relative overflow-hidden shadow-lg ${
                isSelected ? 'border-purple-500/60 ring-1 ring-purple-500/30 bg-[#1b172a]' : 'border-purple-800/20'
              }`}
            >
              {/* Header card: checkbox chọn nhiều + tên cảnh */}
              <div className="flex justify-between items-center px-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={() => toggleSelectScene(scene.id)}
                    className="w-4 h-4 rounded border-purple-500/40 text-purple-600 focus:ring-0 focus:ring-offset-0 bg-black/60 cursor-pointer accent-purple-600"
                  />
                  <span className={`text-[11px] font-black uppercase tracking-wider ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                    {scene.title}
                  </span>
                </label>
                {scene.data.sceneImageBase64 && !isCurrentLoading && (
                  <div className="flex items-center gap-1">
                     <span className="text-[8px] font-bold text-emerald-400 uppercase">Đã Khóa SKU</span>
                     <span className="material-symbols-outlined text-emerald-400 text-sm">verified</span>
                  </div>
                )}
              </div>
              
              <div className="aspect-[9/16] rounded-xl bg-black/70 border-2 border-slate-800 overflow-hidden relative flex items-center justify-center group-hover:border-purple-500/40 transition-all shadow-inner">
                {isCurrentLoading ? (
                  <div className="flex flex-col items-center gap-3 z-10 px-4 text-center">
                     <div className="w-10 h-10 border-3 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                     <div className="flex flex-col items-center gap-1">
                       <span className="text-[9px] font-black text-purple-300 uppercase tracking-wider animate-pulse">Đang Tạo Cùng Lúc...</span>
                       <span className="text-[8px] text-slate-400">Khóa 1:1 tỉ lệ và góc cạnh</span>
                     </div>
                  </div>
                ) : scene.data.sceneImageBase64 ? (
                  <img 
                    src={`data:image/png;base64,${scene.data.sceneImageBase64}`} 
                    className="w-full h-full object-cover animate-in fade-in duration-500" 
                    alt={`Khung hình cảnh ${scene.id}`} 
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-600 p-4 text-center">
                     <span className="material-symbols-outlined text-4xl text-purple-400/60">center_focus_strong</span>
                     <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Chưa tạo ảnh neo</span>
                     <span className="text-[8px] text-slate-600">Chọn và render cùng lúc hoặc render riêng</span>
                  </div>
                )}
              </div>
              {/* Khung xem và tinh chỉnh prompt kịch bản visual riêng cho từng cảnh */}
              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-black/40 border border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Visual Bối Cảnh:</span>
                  <button 
                    onClick={() => setEditingScenePrompt(editingScenePrompt === scene.id ? null : scene.id)}
                    className="text-[8px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 uppercase"
                  >
                    <span className="material-symbols-outlined text-[10px]">edit</span>
                    {editingScenePrompt === scene.id ? 'Thu gọn' : 'Chỉnh prompt'}
                  </button>
                </div>
                {editingScenePrompt === scene.id ? (
                  <textarea 
                    rows={3}
                    value={scene.data.visual}
                    onChange={(e) => handleUpdateScene(scene.id, { visual: e.target.value })}
                    className="w-full bg-slate-900 border border-purple-500/30 rounded-lg p-2 text-[10px] text-purple-100 outline-none focus:border-purple-400 resize-none"
                    placeholder="Ghi chú chi tiết tư thế cầm hoặc bối cảnh đặt sản phẩm..."
                  />
                ) : (
                  <p className="text-[10px] text-slate-300 line-clamp-2 italic leading-relaxed">
                    "{scene.data.visual}"
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleGenerateFrame(scene.id)}
                  disabled={isAnyGenerating}
                  className={`w-full py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                    scene.data.sceneImageBase64 
                    ? 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-purple-500/50 hover:text-purple-200' 
                    : 'bg-purple-600/30 border border-purple-500/50 text-purple-200 hover:bg-purple-600/40 shadow-lg'
                  } disabled:opacity-30`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {scene.data.sceneImageBase64 ? 'refresh' : 'center_focus_strong'}
                  </span>
                  {scene.data.sceneImageBase64 ? `Render Lại Cảnh ${scene.id} Này` : `Render Riêng Cảnh ${scene.id}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 pt-2">
        <button onClick={onBack} className="px-6 py-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all">Quay lại Kịch bản</button>
        <button 
          onClick={onNext} 
          disabled={!isAllGenerated || isAnyGenerating}
          className={`flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all ${
            isAllGenerated && !isAnyGenerating 
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-900/20 hover:from-emerald-500 active:scale-[0.98]' 
              : 'bg-slate-800 text-slate-500 border border-slate-700'
          }`}
        >
          <span className="material-symbols-outlined">movie_filter</span>
          Đã Khóa Sản Phẩm 1:1 - Sang Bước 5 Render Video
        </button>
      </div>
    </div>
  );
};