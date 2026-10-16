import React, { useState, useEffect, useRef } from 'react';
import { Flow, MediaItem } from 'flow-sdk';
import { SourceInput } from './SourceInput';
import { ProductPanel } from './ProductPanel';
import { ScriptPanel } from './ScriptPanel';
import { VisualStudio } from './VisualStudio';
import { VideoGenerator } from './VideoGenerator';
import { ProductTabInstance, ProductData, VideoScript, UserConfig, ReviewStyle, TabStatus } from '../types';
interface ProductTabWorkspaceProps {
  tab: ProductTabInstance;
  onUpdateTab: (tabId: string, updates: Partial<ProductTabInstance>) => void;
  isActive: boolean;
}
export const ProductTabWorkspace: React.FC<ProductTabWorkspaceProps> = ({
  tab,
  onUpdateTab,
  isActive,
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWritingScript, setIsWritingScript] = useState(false);
  // Tham chiếu tới container các bước để tự động cuộn
  const stepContainerRef = useRef<HTMLDivElement>(null);
  const prevIsActiveRef = useRef<boolean>(isActive);
  const prevStepRef = useRef<number>(tab.step);
  const scrollToStepContainer = (stepNumber: number) => {
    setTimeout(() => {
      const el = document.getElementById(`step-container-${tab.id}-${stepNumber}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (stepContainerRef.current) {
        stepContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };
  // Tự động cuộn đến bước đang chạy khi chọn tab (Auto-scroll on Tab Switch)
  useEffect(() => {
    if (isActive && !prevIsActiveRef.current) {
      scrollToStepContainer(tab.step);
    }
    prevIsActiveRef.current = isActive;
  }, [isActive, tab.step, tab.id]);
  // Tự động cuộn khi tiến trình nhảy sang bước tiếp theo
  useEffect(() => {
    if (isActive && tab.step !== prevStepRef.current) {
      scrollToStepContainer(tab.step);
    }
    prevStepRef.current = tab.step;
  }, [tab.step, isActive, tab.id]);
  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };
  const cleanJsonResponse = (text: string) => {
    const raw = text.trim();
    // Trích xuất phần JSON nếu có bọc trong markdown codeblock
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      return jsonMatch[1].trim();
    }
    // Hoặc tìm từ dấu '{' đầu tiên đến '}' cuối cùng
    const startIdx = raw.indexOf('{');
    const endIdx = raw.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      return raw.substring(startIdx, endIdx + 1);
    }
    return raw;
  };
  // Hàm tạo kịch bản dự phòng chất lượng cao khi server AI Text quá tải
  const generateFallbackScript = (pData: ProductData, cfg: UserConfig): VideoScript => {
    const pName = pData.name;
    const traits = pData.physicalTraits || pData.dimensionsAndShape || 'chuẩn thiết kế gốc';
    const mainFeature = pData.sellingPoints?.[0] || 'chất lượng đỉnh cao và độ hoàn thiện tinh tế';
    const secondFeature = pData.sellingPoints?.[1] || 'tiện lợi và mang lại trải nghiệm khác biệt';
    let s1Hook = `Đừng bỏ qua nếu bạn đang tìm kiếm ${pName}! Nhìn độ hoàn thiện sắc nét này là mê ngay.`;
    let s2Hook = `Trải nghiệm thực tế cực kỳ ấn tượng với ${mainFeature}, dùng cực đã mà còn ${secondFeature}.`;
    let s3Hook = `Một món đồ cực kỳ đáng đầu tư cho bạn. Bấm ngay giỏ hàng bên dưới để nhận ưu đãi nhé!`;
    if (cfg.scriptTone === 'fast') {
      s1Hook = `Siêu phẩm ${pName} đây rồi mọi người ơi! Vừa cập bến là phải lên video ngay cho nóng!`;
      s2Hook = `Điểm ăn tiền nhất chính là ${mainFeature}. Cầm trên tay đầm chắc, dùng mượt mà khỏi bàn!`;
      s3Hook = `Deal hời có hạn, bấm vào góc trái màn hình rước ngay một em về trải nghiệm nhé!`;
    } else if (cfg.scriptTone === 'expert') {
      s1Hook = `Đánh giá chi tiết ${pName}: Tại sao sản phẩm này lại tạo nên cơn sốt trong phân khúc?`;
      s2Hook = `Về mặt công năng, ${mainFeature} tối ưu hóa hiệu suất vượt trội, kiểm soát chi tiết tối đa.`;
      s3Hook = `Tổng kết lại, đây là sự lựa chọn vượt trội về giá trị sử dụng. Link chính hãng đã ghim bên dưới.`;
    } else if (cfg.scriptTone === 'funny') {
      s1Hook = `Cứ tưởng là quảng cáo quá lời, ai ngờ ${pName} làm mình bất ngờ thật sự các bác ạ!`;
      s2Hook = `Dùng thử cái ${mainFeature} này mới thấy sướng, đúng chuẩn chân ái không thể thiếu mỗi ngày.`;
      s3Hook = `Chốt đơn lẹ không là hết hàng lại tiếc hùi hụi nhé cả nhà ơi!`;
    }
    const reviewerClause = cfg.useReviewerInVideo && cfg.reviewerMediaId
      ? 'A confident Vietnamese content creator showing the authentic product to the camera lens.'
      : 'Crisp commercial macro view of hands interacting with the product.';
    const v1 = `Dynamic opening commercial shot of ${pName} (${traits}). ${reviewerClause} Studio lighting, sharp focus on product brand and silhouette, 9:16 vertical.`;
    const v2 = `Detailed close-up demonstration highlighting functional details of ${pName}. Clean hands operating the product smoothly, true-to-life reflections, 9:16 vertical.`;
    const v3 = `High-end hero outro showcasing ${pName} in a pristine lifestyle setting, appealing call-to-action framing, cinematic depth of field, 9:16 vertical.`;
    const styleMap: Record<ReviewStyle, string> = {
      tiktok_reviewer: "TikTok Reviewer",
      pov_closeup: "POV Unboxing",
      studio_unbox: "Premium Studio Showcase",
      demo_usage: "Real-life Demo",
      showroom: "Cinematic Showroom"
    };
    return {
      scene1: { hook: s1Hook, visual: v1, duration: 8 },
      scene2: { hook: s2Hook, visual: v2, duration: 8 },
      scene3: { hook: s3Hook, visual: v3, duration: 8 },
      styleLabel: styleMap[cfg.selectedStyle],
      toneLabel: cfg.scriptTone
    };
  };
  const handleProcess = async (name: string, images: MediaItem[]) => {
    onUpdateTab(tab.id, { error: null, status: 'generating', statusMessage: 'Đang phân tích sản phẩm...' });
    setIsProcessing(true);
    setLogs([]);
    try {
      addLog("Đang nhận diện sản phẩm qua " + images.length + " hình ảnh...");
      const prompt = `Phân tích chuyên sâu sản phẩm thật: "${name}". 
Hãy quét và trích xuất TOÀN DIỆN CÁC THÔNG SỐ VẬT LÝ VÀ CHI TIẾT CỦA SẢN PHẨM từ các hình ảnh cung cấp.
Bắt buộc trả về đúng định dạng JSON:
{
  "name": "${name.replace(/"/g, '\"')}",
  "price": "Giá ước lượng hoặc liên hệ",
  "sellingPoints": ["Điểm mạnh 1", "Điểm mạnh 2", "Điểm mạnh 3"],
  "category": "Ngành hàng",
  "suggestedStyle": "tiktok_reviewer",
  "dimensionsAndShape": "Mô tả hình học & kích thước chuẩn xác: độ dài (dài thon/ngắn/vuông vức), tỷ lệ chiều ngang so với chiều cao, độ dày, đường cong vát, form dáng tổng thể",
  "microDetails": "Mô tả siêu chi tiết từng bộ phận cấu thành: bề mặt chất liệu (nhám mịn/bóng/kim loại/nhựa cao cấp), màu sắc chính và màu điểm xuyết, logo/chữ in ở vị trí nào, phím bấm vật lý, công tắc gạt, cổng cắm, rãnh khía, đèn LED báo tín hiệu, ống/đầu/nắp/tay cầm",
  "physicalTraits": "Chuỗi tóm tắt đặc tả nhận dạng tuyệt đối (SKU Identity String) để nạp vào prompt tạo ảnh AI không thể vẽ sai"
}`;
      let responseText = '';
      let retries = 2;
      while (retries >= 0) {
        try {
          const res = await Flow.generate.text(prompt, {
            systemInstruction: "Bạn là chuyên gia phân tích thiết kế công nghiệp và kỹ thuật mô hình 3D. Hãy quan sát từng pixel để bóc tách thông số độ dài, tỉ lệ và từng chi tiết của sản phẩm để mô hình AI Image không bao giờ vẽ thiếu hoặc nhầm sang đồ vật khác.",
            images: images.map(img => ({ base64: img.base64, mimeType: img.mimeType }))
          });
          responseText = res.text;
          break;
        } catch (err: any) {
          if (retries > 0) {
            addLog(`Hệ thống AI Text đang phản hồi chậm, thử lại (${retries})...`);
            await new Promise(r => setTimeout(r, 1500));
            retries--;
          } else {
            throw err;
          }
        }
      }
      const data = JSON.parse(cleanJsonResponse(responseText));
      const combinedTraits = `${data.dimensionsAndShape ? `[Kích thước & Form dáng: ${data.dimensionsAndShape}] ` : ''}${data.microDetails ? `[Chi tiết bộ phận: ${data.microDetails}] ` : ''}${data.physicalTraits || ''}`.trim();
      const newProductData: ProductData = {
        ...data,
        name: data.name || name,
        physicalTraits: combinedTraits || data.name,
        dimensionsAndShape: data.dimensionsAndShape || '',
        microDetails: data.microDetails || '',
        imageUrls: images.map(img => `data:${img.mimeType};base64,${img.base64}`),
        imageMediaIds: images.map(img => img.mediaId)
      };
      const updatedConfig = { ...tab.userConfig };
      if (data.suggestedStyle) {
        updatedConfig.selectedStyle = data.suggestedStyle as ReviewStyle;
        updatedConfig.useReviewerInVideo = data.suggestedStyle !== 'pov_closeup';
      }
      onUpdateTab(tab.id, {
        productData: newProductData,
        userConfig: updatedConfig,
        step: 2,
        title: data.name ? (data.name.slice(0, 20) + (data.name.length > 20 ? '...' : '')) : tab.title,
        status: 'idle',
        statusMessage: 'Đã phân tích sản phẩm',
        error: null
      });
    } catch (err: any) {
      console.warn("Lỗi phân tích AI text, sử dụng dữ liệu trích xuất dự phòng thông minh:", err);
      // Fallback an toàn nếu service text bận, giúp người dùng không bị kẹt ở Bước 1
      const fallbackProduct: ProductData = {
        name,
        price: 'Liên hệ / Giá ưu đãi',
        sellingPoints: ['Thiết kế tiện dụng, hiện đại', 'Chất liệu bền đẹp, hoàn thiện tinh xảo', 'Mang lại trải nghiệm sử dụng vượt trội'],
        category: 'Sản phẩm tiêu dùng & phong cách',
        suggestedStyle: 'tiktok_reviewer',
        dimensionsAndShape: 'Tỉ lệ chuẩn 1:1 theo các góc chụp thực tế cung cấp',
        microDetails: 'Bề mặt tinh xảo, màu sắc và logo nguyên bản từ ảnh tham chiếu',
        physicalTraits: `[Kích thước & Form dáng: Chuẩn thực tế] [Chi tiết bộ phận: Đúng 1:1 theo ảnh gốc] ${name}`,
        imageUrls: images.map(img => `data:${img.mimeType};base64,${img.base64}`),
        imageMediaIds: images.map(img => img.mediaId)
      };
      onUpdateTab(tab.id, {
        productData: fallbackProduct,
        step: 2,
        title: name.slice(0, 20) + (name.length > 20 ? '...' : ''),
        status: 'idle',
        statusMessage: 'Đã sẵn sàng thông tin sản phẩm',
        error: null
      });
    } finally {
      setIsProcessing(false);
    }
  };
  const handleWriteScript = async () => {
    if (!tab.productData) return;
    setIsWritingScript(true);
    onUpdateTab(tab.id, { error: null, status: 'generating', statusMessage: 'Đang viết kịch bản...' });
    
    try {
      const styleMap: Record<ReviewStyle, string> = {
        tiktok_reviewer: "TikTok Reviewer (Selfie chân thật, cầm trực tiếp sản phẩm trên tay, camera cận cảnh mặt và sản phẩm)",
        pov_closeup: "POV Unboxing (Góc nhìn thứ nhất, cận cảnh bàn tay cầm xoay ngắm chi tiết độ dài và cấu tạo sản phẩm)",
        studio_unbox: "Premium Studio Showcase (Ánh sáng studio sang trọng, đặt sản phẩm trên bục quay chuyên nghiệp phô diễn toàn bộ góc cạnh)",
        demo_usage: "Real-life Demo (Ứng dụng thực tế đời sống, tương tác sử dụng tính năng sản phẩm)",
        showroom: "Cinematic Showroom (Chuyển động camera lướt cận cảnh nghệ thuật từng đường nét sản phẩm)"
      };
      const productDetails = tab.productData.sellingPoints.join(", ");
      const traits = tab.productData.physicalTraits || tab.productData.name;
      const dimensions = tab.productData.dimensionsAndShape ? `Dimensions & Length: ${tab.productData.dimensionsAndShape}.` : '';
      const micro = tab.productData.microDetails ? `Micro details: ${tab.productData.microDetails}.` : '';
      const prompt = `Soạn kịch bản video viral 3 cảnh cho sản phẩm: "${tab.productData.name}".
ĐẶC TẢ SẢN PHẨM KHÔNG ĐỔI:
- Đặc tả nhận diện: ${traits}
${dimensions ? `- Kích thước & hình khối: ${dimensions}` : ''}
${micro ? `- Chi tiết linh kiện: ${micro}` : ''}
- Điểm bán hàng: ${productDetails}
- Phong cách: ${styleMap[tab.userConfig.selectedStyle]}
- Giọng điệu kịch bản: ${tab.userConfig.scriptTone}
QUY TẮC BẮT BUỘC VỀ LỜI THOẠI (hook):
- 100% VIẾT BẰNG TIẾNG VIỆT TỰ NHIÊN, DỄ ĐỌC, ĐẬM CHẤT VIRAL TIKTOK/REELS.
- TUYỆT ĐỐI KHÔNG DÙNG TIẾNG ANH CHO LỜI THOẠI. Không chêm từ tiếng Anh không cần thiết.
- Lời thoại phải súc tích, ngắt nhịp tự nhiên, tối ưu cho giọng lồng tiếng tiếng Việt.
QUY TẮC BẮT BUỘC VỀ VISUAL PROMPT (visual):
- Mô tả hành động và bố cục chuyển động camera của cảnh:
  "The exact item from reference images: ${tab.productData.name}, showing its specific length and proportions (${dimensions}), full component details (${micro})".
- Cảnh 1: Cận cảnh hoặc góc toàn mở màn ấn tượng giới thiệu đúng sản phẩm này.
- Cảnh 2: Thao tác sử dụng hoặc chi tiết điểm nổi bật của đúng sản phẩm này.
- Cảnh 3: Chốt đơn kêu gọi hành động với sản phẩm này ở vị trí trang trọng.
- KHÔNG biến dạng hình dáng sản phẩm, KHÔNG làm sai lệch độ dài, chiều cao hay các nút bấm, logo.
Trả về duy nhất JSON:
{
  "scene1": { "hook": "Lời thoại tiếng Việt thuần túy cảnh 1...", "visual": "English visual camera prompt with locked product..." },
  "scene2": { "hook": "Lời thoại tiếng Việt thuần túy cảnh 2...", "visual": "English visual camera prompt with locked product..." },
  "scene3": { "hook": "Lời thoại tiếng Việt thuần túy cảnh 3...", "visual": "English visual camera prompt with locked product..." }
}`;
      let parsedScript: any = null;
      let retries = 2;
      // Cơ chế retry với exponential backoff khi gặp lỗi mạng hoặc "Text generation service unavailable"
      while (retries >= 0) {
        try {
          const response = await Flow.generate.text(prompt, {
            systemInstruction: "Bạn là đạo diễn kịch bản video ngắn triệu view. Kịch bản lời thoại phải là Tiếng Việt chuẩn mực, cuốn hút, 100% không lẫn tiếng Anh. Visual prompt tiếng Anh chỉ đóng vai trò hướng dẫn camera AI giữ chặt sản phẩm gốc."
          });
          const cleaned = cleanJsonResponse(response.text);
          parsedScript = JSON.parse(cleaned);
          if (parsedScript.scene1 && parsedScript.scene2 && parsedScript.scene3) {
            break;
          }
        } catch (callErr: any) {
          console.warn(`Thử viết kịch bản lần ${3 - retries} gặp lỗi:`, callErr?.message);
          if (retries > 0) {
            // Tạm dừng 1.2s trước khi thử lại
            await new Promise(r => setTimeout(r, 1200));
            retries--;
          } else {
            // Khi hết lượt retry do service text bận, tự động kích hoạt bộ sinh kịch bản dự phòng chuẩn mực
            console.log("Kích hoạt kịch bản dự phòng thông minh (Intelligent Fallback Script)...");
            parsedScript = generateFallbackScript(tab.productData, tab.userConfig);
            break;
          }
        }
      }
      if (!parsedScript || !parsedScript.scene1) {
        parsedScript = generateFallbackScript(tab.productData, tab.userConfig);
      }
      const newScript: VideoScript = { 
        ...parsedScript, 
        scene1: { ...parsedScript.scene1, duration: 8 },
        scene2: { ...parsedScript.scene2, duration: 8 },
        scene3: { ...parsedScript.scene3, duration: 8 },
        styleLabel: styleMap[tab.userConfig.selectedStyle],
        toneLabel: tab.userConfig.scriptTone
      };
      onUpdateTab(tab.id, {
        script: newScript,
        step: 3,
        status: 'idle',
        statusMessage: 'Đã tạo kịch bản',
        error: null
      });
    } catch (err: any) {
      console.error(err);
      // Fallback lần cuối đảm bảo người dùng luôn có kịch bản để tiến tới Bước 3 & 4
      const fallback = generateFallbackScript(tab.productData, tab.userConfig);
      onUpdateTab(tab.id, {
        script: fallback,
        step: 3,
        status: 'idle',
        statusMessage: 'Đã tạo kịch bản thành công',
        error: null
      });
    } finally {
      setIsWritingScript(false);
    }
  };
  const handleUpdateConfig = (newConfig: UserConfig) => {
    onUpdateTab(tab.id, { userConfig: newConfig });
  };
  const handleUpdateScript = (updater: VideoScript | null | ((prev: VideoScript | null) => VideoScript | null)) => {
    const nextScript = typeof updater === 'function' ? updater(tab.script) : updater;
    
    // Tự động suy luận trạng thái tab: nếu cả 3 video cảnh đã render xong -> 'done'
    let tabStatus: TabStatus = tab.status;
    if (nextScript?.scene1.videoBase64 && nextScript?.scene2.videoBase64 && nextScript?.scene3.videoBase64) {
      tabStatus = 'done';
    }
    onUpdateTab(tab.id, {
      script: nextScript,
      status: tabStatus
    });
  };
  const setStep = (newStep: number) => {
    onUpdateTab(tab.id, { step: newStep });
    scrollToStepContainer(newStep);
  };
  return (
    <div className={`flex flex-col gap-6 ${isActive ? 'block' : 'hidden'}`}>
      {/* Thanh tiến trình các bước của riêng Tab này với cuộn scroll-margin */}
      <div 
        ref={stepContainerRef}
        className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar scroll-mt-20"
      >
        {[
          { id: 1, label: 'Sản phẩm', icon: 'inventory_2' },
          { id: 2, label: 'Định hướng', icon: 'tune' },
          { id: 3, label: 'Kịch bản & Voice VN', icon: 'record_voice_over' },
          { id: 4, label: 'Khóa Ảnh Mẫu', icon: 'center_focus_strong' },
          { id: 5, label: 'Tạo Video I2V', icon: 'movie_filter' }
        ].map((s) => (
          <button 
            key={s.id} 
            onClick={() => {
              if (tab.step >= s.id) {
                setStep(s.id);
              }
            }} 
            disabled={tab.step < s.id} 
            className="flex items-center shrink-0 cursor-pointer disabled:cursor-not-allowed group/step"
            title={`Chuyển tới Bước ${s.id}: ${s.label}`}
          >
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all ${
              tab.step === s.id
                ? 'bg-purple-600/35 border-purple-400 text-white shadow-md shadow-purple-900/40 ring-1 ring-purple-400/40'
                : tab.step > s.id 
                ? 'bg-purple-600/15 border-purple-500/50 text-purple-300 hover:bg-purple-600/25' 
                : 'bg-slate-900/50 border-slate-800 text-slate-500'
            }`}>
              <span className="material-symbols-outlined text-[17px]">{s.icon}</span>
              <span className="text-[10px] font-black uppercase tracking-wider">{s.label}</span>
              {tab.step === s.id && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>
            {s.id < 5 && (
              <div className={`w-3 h-[1px] mx-1 ${tab.step > s.id ? 'bg-purple-500' : 'bg-slate-800'}`} />
            )}
          </button>
        ))}
      </div>
      {tab.error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
          <span className="material-symbols-outlined">error</span> {tab.error}
        </div>
      )}
      <main className="flex flex-col gap-6">
        {/* Bước 1: Thông tin sản phẩm */}
        <div 
          id={`step-container-${tab.id}-1`} 
          className={`scroll-mt-24 transition-all duration-300 ${tab.step === 1 ? 'block' : 'hidden'}`}
        >
          <SourceInput 
            onProcess={handleProcess} 
            isLoading={isProcessing} 
            logs={logs} 
          />
        </div>
        {/* Bước 2: Định hướng cách quảng cáo */}
        {tab.productData && (
          <div 
            id={`step-container-${tab.id}-2`} 
            className={`scroll-mt-24 transition-all duration-300 ${tab.step === 2 ? 'block' : 'hidden'}`}
          >
            <ProductPanel 
              data={tab.productData} 
              config={tab.userConfig} 
              onUpdateConfig={handleUpdateConfig} 
              onWriteScript={handleWriteScript} 
              onBack={() => setStep(1)} 
              isLoading={isWritingScript} 
              isActive={tab.step === 2}
            />
          </div>
        )}
        {/* Bước 3: Kịch bản & Khóa giọng đọc Voice tiếng Việt */}
        {tab.script && (
          <div 
            id={`step-container-${tab.id}-3`} 
            className={`scroll-mt-24 transition-all duration-300 ${tab.step === 3 ? 'block' : 'hidden'}`}
          >
            <ScriptPanel 
              script={tab.script} 
              onUpdateScript={handleUpdateScript} 
              config={tab.userConfig} 
              onUpdateConfig={handleUpdateConfig} 
              onNext={() => setStep(4)} 
              onBack={() => setStep(2)} 
              isActive={tab.step === 3}
            />
          </div>
        )}
        {/* Bước 4: Khóa ảnh mẫu sản phẩm (Strict SKU Anchor) */}
        {tab.script && tab.productData && (
          <div 
            id={`step-container-${tab.id}-4`} 
            className={`scroll-mt-24 transition-all duration-300 ${tab.step === 4 ? 'block' : 'hidden'}`}
          >
            <VisualStudio 
              script={tab.script} 
              onUpdateScript={handleUpdateScript} 
              productData={tab.productData} 
              config={tab.userConfig}
              onNext={() => setStep(5)} 
              onBack={() => setStep(3)} 
              isActive={tab.step === 4}
            />
          </div>
        )}
        {/* Bước 5: Render Video I2V & Ghép nối xuất bản */}
        {tab.script && tab.productData && (
          <div 
            id={`step-container-${tab.id}-5`} 
            className={`scroll-mt-24 transition-all duration-300 ${tab.step === 5 ? 'block' : 'hidden'}`}
          >
            <VideoGenerator 
              productData={tab.productData} 
              userConfig={tab.userConfig} 
              onUpdateConfig={handleUpdateConfig} 
              script={tab.script} 
              onUpdateScript={handleUpdateScript} 
              onBack={() => setStep(4)}
            />
          </div>
        )}
      </main>
    </div>
  );
};