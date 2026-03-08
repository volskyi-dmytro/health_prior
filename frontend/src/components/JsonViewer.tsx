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
      return `<span style="color:#059669">${match}</span>`;
    })
    .replace(/\b(true|false)\b/g, '<span style="color:#FDB352">$1</span>')
    .replace(/\bnull\b/g, '<span style="color:#ef4444">null</span>')
    .replace(/\b(-?\d+(\.\d+)?)\b/g, '<span style="color:#6366f1">$1</span>');
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
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        style={{ background: '#FAF9F5', borderBottom: collapsed ? 'none' : '1px solid #e5e7eb' }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          {collapsed ? (
            <ChevronRight className="w-4 h-4" style={{ color: '#9ca3af' }} />
          ) : (
            <ChevronDown className="w-4 h-4" style={{ color: '#9ca3af' }} />
          )}
          <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', fontWeight: 500, color: '#363636' }}>
            {title}
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); handleCopy(); }}
          className="flex items-center gap-1 transition-colors"
          style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: copied ? '#FC5D36' : '#9ca3af' }}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {!collapsed && (
        <pre
          className="p-4 text-xs overflow-auto max-h-96 leading-relaxed"
          style={{ fontFamily: 'Inter, monospace', background: '#FFFFFF', color: '#363636' }}
          dangerouslySetInnerHTML={{ __html: colorizeJson(jsonStr) }}
        />
      )}
    </div>
  );
}
