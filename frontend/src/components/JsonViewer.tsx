import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

interface Props {
  data: unknown;
  title?: string;
}

function colorizeJson(json: string): string {
  return json
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g, (match) => {
      if (/:$/.test(match)) return `<span style="color:#FC5D36">${match}</span>`;
      return `<span style="color:#4ade80">${match}</span>`;
    })
    .replace(/\b(true|false)\b/g, '<span style="color:#FDB352">$1</span>')
    .replace(/\bnull\b/g, '<span style="color:#f87171">null</span>')
    .replace(/\b(-?\d+(\.\d+)?)\b/g, '<span style="color:#818cf8">$1</span>');
}

export function JsonViewer({ data, title = 'JSON' }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  const jsonStr = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.11)' }}>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        style={{ background: 'rgba(255,255,255,0.06)', borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.08)' }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          {collapsed ? (
            <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
          ) : (
            <ChevronDown className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
          )}
          <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>
            {title}
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); handleCopy(); }}
          className="flex items-center gap-1 transition-colors"
          style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: copied ? '#FC5D36' : 'rgba(255,255,255,0.4)' }}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {!collapsed && (
        <pre
          className="p-4 text-xs overflow-auto max-h-96 leading-relaxed"
          style={{ fontFamily: 'Inter, monospace', background: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.7)' }}
          dangerouslySetInnerHTML={{ __html: colorizeJson(jsonStr) }}
        />
      )}
    </div>
  );
}
