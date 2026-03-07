import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

interface Props {
  data: unknown;
  title?: string;
}

function colorizeJson(json: string): string {
  return json
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g, (match) => {
      if (/:$/.test(match)) return `<span class="text-blue-300">${match}</span>`;
      return `<span class="text-green-300">${match}</span>`;
    })
    .replace(/\b(true|false)\b/g, '<span class="text-amber-300">$1</span>')
    .replace(/\bnull\b/g, '<span class="text-red-400">null</span>')
    .replace(/\b(-?\d+(\.\d+)?)\b/g, '<span class="text-purple-300">$1</span>');
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
    <div className="rounded-lg border border-slate-700 overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-2 bg-slate-800/80 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
          <span className="text-sm font-mono text-slate-300">{title}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); handleCopy(); }}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-teal-400 transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {!collapsed && (
        <pre
          className="p-4 text-xs font-mono overflow-auto max-h-96 bg-slate-900/50 text-slate-300 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: colorizeJson(jsonStr) }}
        />
      )}
    </div>
  );
}
