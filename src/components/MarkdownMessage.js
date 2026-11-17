// src/components/MarkdownMessage.js
"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Copy, Check } from "@/components/KineticIcons";

function CodeBlock({ inline, className, children, darkMode }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const codeText = String(children).replace(/\n$/, "");

  if (inline || (!className && !codeText.includes("\n"))) {
    return (
      <code
        className={`rounded-md px-1.5 py-0.5 font-mono text-[12.5px] ${
          darkMode ? "bg-zinc-800 text-emerald-300" : "bg-zinc-200/80 text-zinc-900"
        }`}
      >
        {children}
      </code>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className={`my-3 overflow-hidden rounded-xl border ${
        darkMode ? "border-zinc-800 bg-zinc-950" : "border-zinc-300 bg-zinc-900 text-zinc-100"
      }`}
    >
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-3.5 py-2 text-[11px] text-zinc-400">
        <span className="font-mono uppercase tracking-wide">{language || "kod"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span>Kopyalandı</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Kopyala</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 text-[13px] leading-relaxed text-zinc-100">
        <code className="font-mono">{codeText}</code>
      </pre>
    </div>
  );
}

export default function MarkdownMessage({ content, darkMode }) {
  return (
    <div
      className={`min-w-0 max-w-full space-y-3 break-words text-sm leading-relaxed [overflow-wrap:anywhere] ${
        darkMode ? "katex-dark" : ""
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code: (props) => <CodeBlock {...props} darkMode={darkMode} />,
          h1: ({ children }) => (
            <h1 className="mt-4 border-b border-zinc-800/40 pb-1.5 text-lg font-bold">
              {children}
            </h1>
          ),
          h2: ({ children }) => <h2 className="mt-3.5 text-base font-semibold">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-3 text-sm font-semibold">{children}</h3>,
          h4: ({ children }) => <h4 className="mt-2.5 text-sm font-semibold opacity-90">{children}</h4>,
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-inherit">{children}</strong>
          ),
          em: ({ children }) => <em className="italic opacity-90">{children}</em>,
          del: ({ children }) => (
            <del className="opacity-55 decoration-2">{children}</del>
          ),
          ul: ({ children }) => (
            <ul className="my-2 list-disc space-y-1.5 pl-5 marker:text-emerald-400">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-emerald-400">
              {children}
            </ol>
          ),
          li: ({ children, className }) => {
            const isTaskItem = className?.includes("task-list-item");
            return (
              <li
                className={`pl-1 leading-relaxed [&>p]:my-0 [&>p]:inline ${
                  isTaskItem ? "list-none pl-0" : ""
                }`}
              >
                {children}
              </li>
            );
          },
          input: ({ type, checked, disabled }) => {
            if (type !== "checkbox") return null;
            return (
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                readOnly
                className="mr-2 h-3.5 w-3.5 accent-emerald-500 align-middle"
              />
            );
          },
          hr: () => (
            <hr className={`my-4 ${darkMode ? "border-zinc-800" : "border-zinc-200"}`} />
          ),
          blockquote: ({ children }) => (
            <blockquote
              className={`my-2 rounded-r-xl border-l-2 py-1 pl-3.5 italic opacity-85 ${
                darkMode
                  ? "border-emerald-500/60 bg-zinc-900/50"
                  : "border-emerald-600 bg-zinc-100"
              }`}
            >
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 underline decoration-emerald-500/40 underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          ),
          // Markdown can contain arbitrary remote image hosts; Next Image would require trusting each domain.
          /* eslint-disable @next/next/no-img-element */
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || ""}
              loading="lazy"
              className={`my-2 max-w-full rounded-xl border ${
                darkMode ? "border-zinc-800" : "border-zinc-200"
              }`}
            />
          ),
          /* eslint-enable @next/next/no-img-element */
          table: ({ children }) => (
            <div
              className={`my-3 overflow-x-auto rounded-xl border ${
                darkMode ? "border-zinc-800" : "border-zinc-300"
              }`}
            >
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th
              className={`border-b px-3.5 py-2 text-left font-semibold ${
                darkMode
                  ? "border-zinc-800 bg-zinc-900 text-zinc-200"
                  : "border-zinc-300 bg-zinc-100 text-zinc-900"
              }`}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              className={`border-b px-3.5 py-2 ${
                darkMode ? "border-zinc-800/60" : "border-zinc-200"
              }`}
            >
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
