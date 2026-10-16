import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ProductTabInstance, TabStatus } from '../types';
interface TabBarProps {
  tabs: ProductTabInstance[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onAddTab: () => void;
  onCloseTab: (id: string) => void;
  onRenameTab: (id: string, newTitle: string) => void;
  onJumpToStep?: (tabId: string, step: number) => void;
}
export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onAddTab,
  onCloseTab,
  onRenameTab,
  onJumpToStep,
}) => {
  const [tabToDelete, setTabToDelete] = useState<ProductTabInstance | null>(null);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  // Tham chiếu tới container danh sách tab để xử lý cuộn ngang & lăn chuột
  const tabListScrollRef = useRef<HTMLDivElement>(null);
  const activeTabItemRef = useRef<HTMLDivElement | null>(null);
  // Tự động trượt tab đang chọn vào tầm nhìn (Scroll Active Tab into View)
  const scrollActiveTabIntoView = useCallback(() => {
    if (activeTabItemRef.current) {
      activeTabItemRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'nearest',
        block: 'nearest'
      });
    }
  }, []);
  // Cuộn vào tầm nhìn khi activeTabId thay đổi hoặc khi số lượng tab thay đổi
  useEffect(() => {
    // Đợi 1 frame để DOM render đúng kích thước
    const timer = setTimeout(() => {
      scrollActiveTabIntoView();
    }, 60);
    return () => clearTimeout(timer);
  }, [activeTabId, tabs.length, scrollActiveTabIntoView]);
  // Hỗ trợ cuộn chuột ngang (Wheel Scroll): chuyển đổi lăn dọc thành cuộn ngang
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = tabListScrollRef.current;
    if (!container) return;
    // Nếu người dùng lăn chuột (deltaY), tự động chuyển thành cuộn ngang
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  };
  const handleStartRename = (e: React.MouseEvent, tab: ProductTabInstance) => {
    e.stopPropagation();
    setEditingTabId(tab.id);
    setEditTitle(tab.title);
  };
  const handleFinishRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameTab(id, editTitle.trim());
    }
    setEditingTabId(null);
  };
  const handleBadgeClick = (e: React.MouseEvent, tab: ProductTabInstance) => {
    e.stopPropagation();
    if (tab.id !== activeTabId) {
      onSelectTab(tab.id);
    }
    if (onJumpToStep) {
      onJumpToStep(tab.id, tab.step);
    }
  };
  const renderStatusBadge = (status: TabStatus) => {
    switch (status) {
      case 'generating':
        return (
          <span className="flex items-center gap-1 text-amber-400 font-bold" title="Đang xử lý ngầm...">
            <span className="w-2.5 h-2.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </span>
        );
      case 'done':
        return (
          <span className="flex items-center gap-1" title="Đã hoàn thành!">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1" title="Có lỗi xử lý">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]" />
          </span>
        );
      case 'idle':
      default:
        return (
          <span className="w-2 h-2 rounded-full bg-slate-600" title="Đang sẵn sàng" />
        );
    }
  };
  return (
    <>
      {/* Sticky Tab Header chống tràn: Phân tách Flex 2 vùng (Trái: cuộn ngang, Phải: nút cố định) */}
      <div className="sticky top-0 z-50 -mx-4 px-4 pt-2.5 pb-2 bg-[#0d0b14]/95 backdrop-blur-md border-b border-purple-900/40 shadow-lg shadow-black/50 transition-all">
        <div className="w-full flex items-center justify-between gap-3">
          
          {/* BÊN TRÁI: Vùng danh sách tab chiếm toàn bộ chiều rộng còn lại, bật cuộn ngang mượt mà */}
          <div
            ref={tabListScrollRef}
            onWheel={handleWheel}
            className="flex-1 min-w-0 overflow-x-auto whitespace-nowrap flex items-center gap-1.5 scroll-smooth no-scrollbar"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              const isEditing = editingTabId === tab.id;
              return (
                <div
                  key={tab.id}
                  ref={isActive ? (el) => { activeTabItemRef.current = el; } : null}
                  onClick={() => onSelectTab(tab.id)}
                  className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-t-xl border-t border-x cursor-pointer transition-all shrink-0 select-none ${
                    isActive
                      ? 'bg-[#181524] border-purple-500/80 text-white shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/30'
                      : 'bg-[#0f0c19]/90 border-slate-800/80 text-slate-400 hover:bg-[#151222] hover:text-slate-200'
                  }`}
                >
                  {/* Chỉ báo trạng thái tiến trình (Status Indicator) */}
                  <div className="flex items-center shrink-0">
                    {renderStatusBadge(tab.status)}
                  </div>
                  {/* Tiêu đề Tab với giới hạn độ rộng tối đa max-w-[160px] & truncate */}
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleFinishRename(tab.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFinishRename(tab.id);
                        if (e.key === 'Escape') setEditingTabId(null);
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      className="bg-black/80 border border-purple-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-28 font-medium"
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => handleStartRename(e, tab)}
                      className="text-xs font-bold truncate max-w-[140px] md:max-w-[160px] tracking-wide inline-block"
                      title={`${tab.title} (Nháy đúp để đổi tên)`}
                    >
                      {tab.title}
                    </span>
                  )}
                  {/* Nút bấm nhanh trên Badge Bước (Clickable Step Badge) */}
                  <button
                    type="button"
                    onClick={(e) => handleBadgeClick(e, tab)}
                    title={`Nhấn để cuộn nhanh tới Bước ${tab.step}`}
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-0.5 transition-all cursor-pointer active:scale-95 shrink-0 ${
                      isActive
                        ? 'bg-purple-500/30 text-purple-200 border border-purple-400/50 hover:bg-purple-500 hover:text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-purple-900/60 hover:text-purple-300 hover:border-purple-500/40'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[10px] leading-none">expand_circle_down</span>
                    <span>B{tab.step}</span>
                  </button>
                  {/* Nút đóng Tab */}
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTabToDelete(tab);
                      }}
                      title="Đóng tab sản phẩm"
                      className="w-4 h-4 rounded-full flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 opacity-60 group-hover:opacity-100 transition-all shrink-0 ml-0.5"
                    >
                      <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {/* BÊN PHẢI: Vùng nút cố định mép phải, không bị che khuất hay đẩy trôi */}
          <div className="shrink-0 flex items-center pl-1 border-l border-purple-900/30">
            <button
              onClick={onAddTab}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-black text-[11px] uppercase tracking-wider transition-all shadow-md shadow-purple-900/30 active:scale-95 shrink-0 whitespace-nowrap"
              title="Thêm luồng xử lý sản phẩm mới (+ THÊM TAB)"
            >
              <span className="material-symbols-outlined text-sm leading-none font-bold">add</span>
              <span>+ THÊM TAB</span>
            </button>
          </div>
        </div>
      </div>
      {/* Modal xác nhận xóa tab */}
      {tabToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#181524] border border-rose-500/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-rose-400">
              <span className="material-symbols-outlined text-2xl">warning</span>
              <h3 className="text-base font-black uppercase tracking-tight">Xác nhận đóng Tab</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn đóng tab <b>"{tabToDelete.title}"</b>? Toàn bộ dữ liệu sản phẩm và video đang xử lý của riêng tab này sẽ bị hủy bỏ.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setTabToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold uppercase hover:bg-slate-700 transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  onCloseTab(tabToDelete.id);
                  setTabToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase transition-all shadow-lg shadow-rose-950/50"
              >
                Xác nhận đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};