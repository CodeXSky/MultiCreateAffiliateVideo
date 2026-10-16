import React, { useState } from 'react';
import { Flow } from 'flow-sdk';
import { ProductData, UserConfig, ReviewStyle, ScriptTone } from '../types';
interface ProductPanelProps {
  data: ProductData;
  config: UserConfig;
  onUpdateConfig: (config: UserConfig) => void;
  onWriteScript: () => void;
  onBack: () => void;
  isLoading: boolean;
  isActive: boolean;
}
export const ProductPanel: React.FC<ProductPanelProps> = ({ data, config, onUpdateConfig, onWriteScript, onBack, isLoading, isActive }) => {
  const [isEditingTraits, setIsEditingTraits] = useState(false);
  const [customDimensions, setCustomDimensions] = useState(data.dimensionsAndShape || '');
  const [customMicro, setCustomMicro] = useState(data.microDetails || '');
  const styles: { id: ReviewStyle; label: string; desc: string; icon: string }[] = [
    { id: 'tiktok_reviewer', label: 'TikTok Reviewer', desc: 'Mẫu cầm sản phẩm selfie', icon: 'person_pin_circle' },
    { id: 'pov_closeup', label: 'Cận Cảnh POV', desc: 'Tay unbox, cận cảnh', icon: 'visibility' },
    { id: 'studio_unbox', label: 'Đập Hộp Studio', desc: 'Bối cảnh chuyên nghiệp', icon: 'light_mode' },
    { id: 'demo_usage', label: 'Demo công dụng', desc: 'Thực tế sử dụng', icon: 'play_circle' },
    { id: 'showroom', label: 'Showroom', desc: 'Không gian sang trọng', icon: 'storefront' },
  ];
  const tones: { id: ScriptTone; label: string; icon: string }[] = [
    { id: 'fast', label: 'Sôi động', icon: 'bolt' },
    { id: 'funny', label: 'Hài hước', icon: 'sentiment_very_satisfied' },
    { id: 'expert', label: 'Chuyên gia', icon: 'verified' },
    { id: 'emotional', label: 'Cảm xúc', icon: 'favorite' },
    { id: 'friendly', label: 'Gần gũi', icon: 'chat_bubble' },
  ];
  const handleSelectStyle = (styleId: ReviewStyle) => {
    const shouldShowReviewer = styleId !== 'pov_closeup';
    onUpdateConfig({ 
      ...config, 
      selectedStyle: styleId,
      useReviewerInVideo: shouldShowReviewer 
    });
  };
  const handleSelectReviewer = async () => {
    try {
      const media = await Flow.media.select({ filter: 'image' });
      onUpdateConfig({
        ...config,
        reviewerImageUrl: `data:${media.mimeType};base64,${media.base64}`,
        reviewerMediaId: media.mediaId,
        useReviewerInVideo: true
      });
    } catch (err) {
      console.error(err);
    }
  };
  const handleSaveTraits = () => {
    data.dimensionsAndShape = customDimensions;
    data.microDetails = customMicro;
    data.physicalTraits = `[Kích thước & Form dáng: ${customDimensions}] [Chi tiết bộ phận: ${customMicro}]`;
    setIsEditingTraits(false);
  };
  return (
    <div className={`w-full flex flex-col gap-6 transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-40 pointer-events-none scale-[0.98]'}`}>
      <div className="p-6 rounded-2xl bg-[#181524] border border-purple-800/30 shadow-xl">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/3 flex flex-col gap-2">
            <div className="aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-800 relative">
              <img src={data.imageUrls[0]} className="w-full h-full object-cover" alt={data.name} />
              <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-[10px] font-bold text-white border border-white/10 uppercase tracking-tighter">Sản phẩm chính</div>
            </div>
            {data.imageUrls.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {data.imageUrls.slice(1, 5).map((url, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden border border-slate-800">
                    <img src={url} className="w-full h-full object-cover" alt={`Angle ${i}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">{data.category}</span>
                <h2 className="text-xl font-bold text-white leading-tight">{data.name}</h2>
              </div>
              <span className="text-2xl font-black text-white">{data.price}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.sellingPoints.map((point, i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.5)]" />
                  {point}
                </span>
              ))}
            </div>
            {/* Chi tiết thông số vật lý & độ dài sản phẩm */}
            <div className="p-3.5 rounded-xl bg-black/50 border border-purple-500/20 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs">straighten</span>
                  Độ dài, Tỷ lệ & Chi tiết sản phẩm nhận diện
                </span>
                <button 
                  onClick={() => setIsEditingTraits(!isEditingTraits)}
                  className="text-[9px] font-bold uppercase text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[12px]">{isEditingTraits ? 'close' : 'edit'}</span>
                  {isEditingTraits ? 'Đóng' : 'Tùy chỉnh chi tiết'}
                </button>
              </div>
              {isEditingTraits ? (
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-800 animate-in fade-in">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Độ dài & Form khối:</label>
                    <input 
                      type="text" 
                      value={customDimensions} 
                      onChange={(e) => setCustomDimensions(e.target.value)}
                      placeholder="VD: Dáng thon dài khoảng 18cm, thân tròn đường kính 3cm..."
                      className="w-full bg-slate-900 border border-purple-800/40 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Chi tiết bộ phận (nút, logo, cổng cắm):</label>
                    <textarea 
                      rows={2}
                      value={customMicro} 
                      onChange={(e) => setCustomMicro(e.target.value)}
                      placeholder="VD: Có 2 nút tròn kim loại ở thân trên, logo in chìm mặt lưng..."
                      className="w-full bg-slate-900 border border-purple-800/40 rounded-lg p-2 text-xs text-white outline-none focus:border-purple-500 resize-none"
                    />
                  </div>
                  <button 
                    onClick={handleSaveTraits}
                    className="self-end px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold uppercase"
                  >
                    Lưu đặc tả sản phẩm
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-1 text-[11px] text-slate-300">
                  <div className="flex gap-1.5 items-baseline">
                    <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Độ dài / Dáng:</span>
                    <span className="text-purple-200">{data.dimensionsAndShape || 'Đã phân tích từ ảnh gốc'}</span>
                  </div>
                  <div className="flex gap-1.5 items-baseline">
                    <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Chi tiết:</span>
                    <span className="text-slate-300 line-clamp-2">{data.microDetails || 'Đã phân tích từ ảnh gốc'}</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-auto flex items-center gap-4 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
               <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-purple-400">lock</span>
                  <span className="text-[9px] font-black uppercase text-purple-200">Voice Lock Active</span>
               </div>
               <div className="w-1 h-1 rounded-full bg-slate-700" />
               <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-rose-400">photo_filter</span>
                  <span className="text-[9px] font-black uppercase text-rose-200">SKU Geometry Lock</span>
               </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <label className="text-xs font-black uppercase tracking-[0.2em] text-purple-400 px-1">
            Bước 2: Chọn Cách Quảng Cáo
          </label>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {styles.map((style) => (
              <button
                key={style.id}
                onClick={() => handleSelectStyle(style.id)}
                className={`group p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                  config.selectedStyle === style.id 
                    ? 'bg-purple-600/20 border-purple-500 shadow-lg shadow-purple-900/20 ring-1 ring-purple-500' 
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className={`material-symbols-outlined text-2xl transition-transform group-hover:scale-110 ${config.selectedStyle === style.id ? 'text-purple-400' : 'text-slate-500'}`}>
                  {style.icon}
                </span>
                <div className="flex flex-col">
                  <span className={`text-[10px] font-black uppercase ${config.selectedStyle === style.id ? 'text-white' : 'text-slate-400'}`}>
                    {style.label}
                  </span>
                  {data.suggestedStyle === style.id && (
                    <span className="text-[8px] font-bold text-emerald-400 uppercase mt-0.5">AI Gợi Ý</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <label className="text-xs font-black uppercase tracking-[0.2em] text-rose-400 px-1">
            Bước 3: Giọng Điệu Viral
          </label>
          <div className="flex flex-wrap gap-2">
            {tones.map((tone) => (
              <button
                key={tone.id}
                onClick={() => onUpdateConfig({ ...config, scriptTone: tone.id })}
                className={`px-4 py-2 rounded-full border text-[11px] font-bold uppercase transition-all flex items-center gap-2 ${
                  config.scriptTone === tone.id 
                    ? 'bg-rose-600/20 border-rose-500 text-rose-200 shadow-lg shadow-rose-900/20' 
                    : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tone.icon}</span>
                {tone.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 p-5 rounded-2xl bg-black/40 border border-slate-800">
           <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex flex-col">
                <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-purple-400">face</span>
                  Nhân vật Reviewer (AI Character)
                </h3>
                <p className="text-[10px] text-slate-500">Tải ảnh mẫu để AI tạo video có nhân vật đồng nhất cho <b>tất cả phong cách</b>.</p>
              </div>
              <button 
                onClick={handleSelectReviewer}
                className="w-full md:w-auto px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">upload_file</span>
                {config.reviewerImageUrl ? 'Thay đổi ảnh mẫu' : 'Upload Ảnh Nhân Vật'}
              </button>
           </div>
           
           {config.reviewerImageUrl && (
             <div className="flex flex-col md:flex-row items-center gap-4 pt-3 border-t border-slate-800/50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-purple-500 ring-2 ring-purple-500/20 shadow-lg">
                    <img src={config.reviewerImageUrl} className="w-full h-full object-cover" alt="Reviewer" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-purple-400 uppercase">Đã khóa Nhân Vật</span>
                    <button 
                      onClick={() => onUpdateConfig({ ...config, reviewerImageUrl: undefined, reviewerMediaId: undefined, useReviewerInVideo: false })}
                      className="text-[9px] text-rose-500 font-bold uppercase text-left hover:text-rose-400"
                    >
                      Hủy đồng nhất mặt
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-purple-600/10 px-4 py-2 rounded-xl border border-purple-500/20 w-full md:w-auto">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-white uppercase tracking-wider leading-none">Character Lock</span>
                      <span className="text-[8px] text-slate-500 uppercase mt-1">Duy trì khuôn mặt</span>
                   </div>
                   <button 
                    onClick={() => onUpdateConfig({ ...config, useReviewerInVideo: !config.useReviewerInVideo })}
                    className={`w-10 h-5 rounded-full transition-all relative ${config.useReviewerInVideo ? 'bg-purple-500' : 'bg-slate-700'}`}
                   >
                     <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.useReviewerInVideo ? 'left-6' : 'left-1'}`} />
                   </button>
                </div>
             </div>
           )}
        </div>
      </div>
      {isActive && (
        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="px-6 py-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-bold uppercase tracking-[0.1em] text-xs hover:bg-slate-800 transition-all"
          >
            Quay lại
          </button>
          <button
            onClick={onWriteScript}
            disabled={isLoading}
            className="flex-1 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-black uppercase tracking-[0.1em] text-sm flex items-center justify-center gap-3 shadow-lg shadow-purple-900/40 active:scale-95 transition-all"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined">auto_fix</span>
            )}
            {isLoading ? 'Đang phân tích phong cách...' : 'Viết Kịch Bản Đa Dạng'}
          </button>
        </div>
      )}
    </div>
  );
};