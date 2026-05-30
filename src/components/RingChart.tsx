import React from 'react';
import * as Icons from 'lucide-react';
import { CategoryInfo, CategoryType } from '../types';

interface RingChartProps {
  totalAmount: number;
  categoryTotals: Record<CategoryType, number>;
  selectedCategory: CategoryType | null;
  onSelectCategory: (category: CategoryType | null) => void;
  categories: Record<string, CategoryInfo>;
  currency: string;
  title?: string;
}

export const RingChart: React.FC<RingChartProps> = ({
  totalAmount,
  categoryTotals,
  selectedCategory,
  onSelectCategory,
  categories,
  currency,
  title,
}) => {
  const cx = 150;
  const cy = 150;
  const r = 105; // radius for the ring

  // Helper to convert degree to radians
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  // Helper to construct SVG arc path
  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(' ');
  };

  // Calculate segments dynamically based on the current available categories list!
  const categoryKeys = Object.keys(categories);
  const N = categoryKeys.length || 1;
  const segmentSize = 360 / N;
  const gap = Math.min(14, segmentSize * 0.22); // Elegant adaptive margins between slices

  const segmentAngles = categoryKeys.map((catKey, i) => {
    return {
      category: catKey,
      start: i * segmentSize + gap / 2,
      end: (i + 1) * segmentSize - gap / 2,
    };
  });

  return (
    <div className="relative w-[300px] h-[300px] mx-auto select-none mt-4 animate-fade-in" id="ring-chart-container">
      {/* SVG Arc Segments */}
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 300 300">
        {segmentAngles.map(({ category, start, end }) => {
          const catInfo = categories[category] || { name: category, color: '#CCCCCC', bgColor: 'bg-neutral-250/35', iconName: 'Tag' };
          const isSelected = selectedCategory === category;
          const isAnySelected = selectedCategory !== null;
          const spending = categoryTotals[category] || 0;
          
          // Determine opacity based on selection state and raw spending
          const baseOpacity = spending > 0 ? 1 : 0.45;
          const opacity = isSelected ? 1 : isAnySelected ? 0.25 : baseOpacity;
          
          const strokeWidth = isSelected ? 24 : 18;

          return (
            <path
              key={category}
              id={`segment-path-${category}`}
              d={describeArc(cx, cy, r, start, end)}
              fill="none"
              stroke={catInfo.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className="transition-all duration-300 cursor-pointer hover:stroke-[22px]"
              style={{ opacity }}
              onClick={() => onSelectCategory(isSelected ? null : category)}
            />
          );
        })}
      </svg>

      {/* Center Text Panel */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto">
        <div 
          onClick={() => onSelectCategory(null)}
          className="cursor-pointer text-center flex flex-col items-center justify-center transition-transform active:scale-95"
        >
          <span className="text-xs text-neutral-500 font-medium tracking-wide">{title || '本月总支出'}</span>
          <span className="text-3xl font-extrabold text-neutral-900 tracking-tight mt-1 flex items-baseline justify-center">
            <span className="text-sm font-black mr-0.5 self-center">{currency}</span>
            <span>{totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </span>
          {selectedCategory && (
            <div className="mt-2 px-2.5 py-0.5 bg-black text-white text-[10px] rounded-full scale-95 animate-scale-up">
              筛选: {selectedCategory} ({currency}{(categoryTotals[selectedCategory] || 0).toFixed(1)}) ✕
            </div>
          )}
        </div>
      </div>

      {/* Interactive Category Icons positioned Over the Segments */}
      {segmentAngles.map(({ category, start, end }) => {
        const catInfo = categories[category] || { name: category, color: '#CCCCCC', bgColor: 'bg-neutral-250/35', iconName: 'Tag' };
        const isSelected = selectedCategory === category;
        const isAnySelected = selectedCategory !== null;
        const spending = categoryTotals[category] || 0;
        
        // Midpoint of arc for bubble placement
        const midAngle = (start + end) / 2;
        const pos = polarToCartesian(cx, cy, r + 2, midAngle);
        
        // CSS positions in percentages
        const leftPercent = (pos.x / 300) * 100;
        const topPercent = (pos.y / 300) * 100;

        // Custom dynamic icon component resolution
        const IconComponent = (Icons as any)[catInfo.iconName] || Icons.Tag;

        const baseOpacity = spending > 0 ? 1 : 0.7;
        const opacity = isSelected ? 1 : isAnySelected ? 0.3 : baseOpacity;

        return (
          <button
            key={category}
            id={`icon-btn-${category}`}
            onClick={() => onSelectCategory(isSelected ? null : category)}
            style={{
              left: `${leftPercent}%`,
              top: `${topPercent}%`,
              opacity,
            }}
            className={`absolute flex items-center justify-center w-8 h-8 rounded-full -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 z-10 shadow-sm
              ${isSelected 
                ? 'bg-black text-white ring-4 ring-white scale-125' 
                : 'bg-white text-neutral-850 hover:scale-110 border border-neutral-200'
              }
            `}
            title={`${category}: ${currency}${spending}`}
          >
            <IconComponent size={14} strokeWidth={2.5} />
            {spending > 0 && !isSelected && (
              <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-white" style={{ backgroundColor: catInfo.color }} />
            )}
          </button>
        );
      })}
    </div>
  );
};
