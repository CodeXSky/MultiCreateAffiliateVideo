import React, { useEffect, useRef, useState } from 'react';
import { Flow, MediaItem } from 'flow-sdk';
interface SourceInputProps {
  onProcess: (name: string, images: MediaItem[]) => void;
  isLoading: boolean;
  logs: string[];
}
export const SourceInput: React.FC<SourceInputProps> = ({ onProcess, isLoading, logs }) => {
  const [name, setName] = useState('');
  const [images, setImages] = useState<MediaItem[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const handleSelectImages = async () => {
    try {
      const selected = await Flow.media.selectMultiple({ maxCount: 5, filter: 'image' });
      setImages(selected);
    } catch (err) {
      console.error("Lỗi chọn ảnh:", err);
    }
  };
  const handleSubmit = () => {
    if (name.trim() && images.length > 0) {
      onProcess(name, images);
    }
  };
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);
  return (
    <div className="w-full p-6 md:p-8 rounded-3xl bg-[#181524] border border-purple-800/30 shadow-2xl animate-in zoom-in-95 duration-300">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">
            Bước 1: Thông tin Sản Phẩm
          </label>
          <p className="text-slate-500 text-[11px]">Nhập tên và chọn tối đa 5 hình ảnh để AI hiểu rõ sản phẩm của bạn.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-bold uppercase text-slate-400 px-1">Tên Sản Phẩm</label>
            <textarea
              placeholder="Ví dụ: Máy pha cà phê Espresso mini cao cấp..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              rows={5}
              className="w-full bg-[#0d0b14] border-2 border-slate-800 rounded-2xl px-4 py-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-purple-500 transition-all resize-none text-sm leading-relaxed"
            />
          </div>
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-bold uppercase text-slate-400 px-1">Hình Ảnh Sản Phẩm ({images.length}/5)</label>
            <button
              onClick={handleSelectImages}
              disabled={isLoading}
              className={`relative w-full min-h-[140px] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 overflow-hidden ${
                images.length > 0 
                  ? 'border-purple-500 border-opacity-50 bg-purple-500 bg-opacity-5' 
                  : 'border-slate-800 bg-[#0d0b14] hover:border-slate-700'
              }`}
            >
              {images.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 p-4 w-full h-full content-center">
                  {images.map((img, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden border border-white/10 relative group">
                      <img 
                        src={`data:${img.mimeType};base64,${img.base64}`} 
                        className="w-full h-full object-cover" 
                        alt={`Preview ${i}`}
                      />
                    </div>
                  ))}
                  <div className="aspect-square rounded-lg border border-dashed border-slate-700 flex items-center justify-center bg-black/40">
                    <span className="material-symbols-outlined text-slate-500 text-sm">add</span>
                  </div>
                </div>
              ) : (
                <>
                  <span className="material-symbols-outlined text-slate-600 text-[32px]">add_photo_alternate</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Chọn tối đa 5 ảnh</span>
                </>
              )}
            </button>
            {images.length > 0 && !isLoading && (
               <button onClick={handleSelectImages} className="text-[9px] uppercase font-black text-purple-400 text-center tracking-widest hover:text-purple-300">Thay đổi danh sách ảnh</button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <button
            onClick={handleSubmit}
            disabled={isLoading || !name.trim() || images.length === 0}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl shadow-purple-900/20 active:scale-[0.98]"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-opacity-30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined">magic_button</span>
            )}
            {isLoading ? 'Đang phân tích dữ liệu...' : 'Phân tích & Tiếp tục'}
          </button>
          {isLoading && (
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-500 mt-2">
              <div className="flex items-center gap-2">
                <span className="flex h-1.5 w-1.5 rounded-full bg-purple-500 animate-ping"></span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Luồng Xử Lý AI</span>
              </div>
              <div className="bg-black bg-opacity-40 border border-slate-800 border-opacity-50 rounded-xl p-4 font-mono text-[11px] h-32 overflow-y-auto no-scrollbar flex flex-col gap-1.5">
                {logs.map((log, index) => {
                  const isLatest = index === logs.length - 1;
                  return (
                    <div key={index} className="flex gap-2 animate-in fade-in slide-in-from-left-1 duration-300">
                      <span className="text-purple-500 select-none">{">"}</span>
                      <span className={isLatest ? "text-purple-200" : "text-slate-500"}>
                        {log}
                      </span>
                    </div>
                  );
                })}
                <div ref={logEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};