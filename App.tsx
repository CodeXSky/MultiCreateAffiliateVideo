import React, { useState } from 'react';
import { TabBar } from './components/TabBar';
import { ProductTabWorkspace } from './components/ProductTabWorkspace';
import { ProductTabInstance, UserConfig } from './types';
export default function App() {
  const createDefaultConfig = (): UserConfig => ({
    selectedStyle: 'tiktok_reviewer',
    scriptTone: 'fast',
    bgmId: 'energetic',
    enableTTS: true,
    selectedModel: 'Veo 3.1 - Lite',
    useReviewerInVideo: true,
    speakerId: 'MC_VIETNAMESE_PRO_01',
    voiceLockEnabled: true,
    vnVoicePreset: 'vi-VN-Standard-A (Nữ miền Bắc)'
  });
  const createNewTab = (customIndex?: number): ProductTabInstance => {
    const id = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const index = customIndex !== undefined ? customIndex : 1;
    return {
      id,
      title: `Sản phẩm ${index}`,
      step: 1,
      productData: null,
      userConfig: createDefaultConfig(),
      script: null,
      status: 'idle',
      statusMessage: 'Khởi tạo',
      error: null
    };
  };
  const [tabs, setTabs] = useState<ProductTabInstance[]>([createNewTab(1)]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const [tabCounter, setTabCounter] = useState<number>(2);
  const handleAddTab = () => {
    const newTab = createNewTab(tabCounter);
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setTabCounter(prev => prev + 1);
  };
  const handleCloseTab = (idToClose: string) => {
    if (tabs.length <= 1) return;
    setTabs(prev => {
      const filtered = prev.filter(t => t.id !== idToClose);
      if (activeTabId === idToClose) {
        // Chuyển sang tab lân cận
        const closedIndex = prev.findIndex(t => t.id === idToClose);
        const newActiveIndex = Math.max(0, closedIndex - 1);
        setActiveTabId(filtered[newActiveIndex].id);
      }
      return filtered;
    });
  };
  const handleRenameTab = (id: string, newTitle: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, title: newTitle } : t));
  };
  const handleUpdateTab = (tabId: string, updates: Partial<ProductTabInstance>) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, ...updates } : t));
  };
  // Cuộn tức thì tới container bước được chọn từ Badge trên thanh Tab
  const handleJumpToStep = (tabId: string, targetStep: number) => {
    if (activeTabId !== tabId) {
      setActiveTabId(tabId);
    }
    setTimeout(() => {
      const el = document.getElementById(`step-container-${tabId}-${targetStep}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  };
  return (
    <div className="min-h-full bg-[#0d0b14] text-white font-sans selection:bg-purple-500/30">
      {/* Hiệu ứng nền neon */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-900 bg-opacity-20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-rose-900 bg-opacity-10 rounded-full blur-[120px]" />
      </div>
      <div className="relative max-w-5xl mx-auto px-4 py-6 md:py-10 flex flex-col gap-6">
        {/* Header ứng dụng */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-rose-500 flex items-center justify-center shadow-lg shadow-purple-900 shadow-opacity-20">
                <span className="material-symbols-outlined text-white">bolt</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight italic">
                Affiliate <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-rose-400">Viral Pro</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs">tabs</span>
                Multi-Instance ({tabs.length} Tabs)
              </span>
            </div>
          </div>
          <p className="text-slate-400 text-xs md:text-sm max-w-2xl leading-relaxed font-medium">
            Tối ưu khóa nhận diện sản phẩm & Lồng tiếng Voice Việt. Hỗ trợ chạy đa luồng sản phẩm song song độc lập.
          </p>
        </header>
        {/* Thanh quản lý TabBar cố định khi cuộn (Sticky Tab Header) với Badge bước click được */}
        <TabBar 
          tabs={tabs} 
          activeTabId={activeTabId} 
          onSelectTab={setActiveTabId} 
          onAddTab={handleAddTab} 
          onCloseTab={handleCloseTab} 
          onRenameTab={handleRenameTab} 
          onJumpToStep={handleJumpToStep}
        />
        {/* Khối Workspace chứa các Tab con được đóng gói độc lập */}
        <div className="w-full">
          {tabs.map((tab) => (
            <ProductTabWorkspace 
              key={tab.id}
              tab={tab}
              onUpdateTab={handleUpdateTab}
              isActive={tab.id === activeTabId}
            />
          ))}
        </div>
      </div>
      {/* Floating Action Button (FAB) tạo Tab mới nhanh chóng ở góc dưới bên phải */}
      <div className="fixed bottom-6 right-6 z-[99] flex items-center gap-2 group">
        <button
          onClick={handleAddTab}
          className="flex items-center gap-2.5 px-4 py-3.5 rounded-full bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-2xl shadow-purple-900/60 ring-2 ring-purple-400/40 active:scale-95 transition-all duration-200 hover:shadow-purple-600/40"
          title="Tạo tab sản phẩm mới"
        >
          <span className="material-symbols-outlined text-lg leading-none font-bold">add</span>
          <span className="inline-block drop-shadow-sm font-black">Thêm Tab Mới</span>
        </button>
      </div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}