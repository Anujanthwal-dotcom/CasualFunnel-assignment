import { useState } from 'react';
import { Button, Card } from './ui';

const SCRIPT_TAG = `<script
  src="http://localhost:3000/tracker.js"
  data-endpoint="http://localhost:3000/api"
  data-debug="true"
  defer
></script>`;

export function ScriptTagView() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(SCRIPT_TAG);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = SCRIPT_TAG;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-ink">Script Tag</h2>
        <p className="mt-1 text-xs text-mute">
          Paste this script tag into the <code className="rounded bg-surface-soft px-1.5 py-0.5 font-mono text-ink">&lt;head&gt;</code> or before the closing <code className="rounded bg-surface-soft px-1.5 py-0.5 font-mono text-ink">&lt;/body&gt;</code> tag of your website.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-hairline bg-surface-doc px-4 py-2.5 text-xs text-mute">
          <span className="font-mono font-medium">HTML snippet</span>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded border border-hairline bg-surface-card px-2.5 py-1 text-xs font-bold text-ink transition-colors hover:bg-surface-soft"
          >
            {copied ? <span className="text-accent-green">Copied! ✓</span> : 'Copy'}
          </button>
        </div>

        <div className="bg-[#1e2019] p-5">
          <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-[#eeefe9]">
            <code>{SCRIPT_TAG}</code>
          </pre>
        </div>

        <div className="border-t border-hairline bg-surface-card p-4">
          <Button
            variant="primary"
            size="md"
            onClick={handleCopy}
            className="w-full sm:w-auto font-bold"
          >
            {copied ? 'Copied to clipboard! ✓' : 'Copy script tag'}
          </Button>
        </div>
      </Card>
    </section>
  );
}
