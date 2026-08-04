"use client";

import { KeyboardEvent, useId, useState } from "react";
import { ChevronUp, Plus, Tag, X } from "lucide-react";
import {
  collectContentTagHistory,
  normalizeContentTags,
  suggestedContentTags,
} from "@/lib/content-tags";
import { cn } from "@/lib/utils";

export function ContentTagPicker({
  value,
  onChange,
  className,
  collapsedLabel = "+ 添加标签",
  defaultExpanded,
  disabled = false,
  historyTags = [],
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  className?: string;
  collapsedLabel?: string;
  defaultExpanded?: boolean;
  disabled?: boolean;
  historyTags?: string[];
}) {
  const inputId = useId();
  const panelId = `${inputId}-panel`;
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(defaultExpanded ?? value.length > 0);

  function addTags(raw: string) {
    const additions = raw.split(/[,，]/);
    onChange(normalizeContentTags([...value, ...additions]));
    setDraft("");
  }

  function removeTag(tag: string) {
    onChange(value.filter((item) => item !== tag));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== "," && event.key !== "，") return;
    event.preventDefault();
    if (draft.trim()) addTags(draft);
  }

  const selectedKeys = new Set(value.map((tag) => tag.toLocaleLowerCase()));
  const availableHistory = collectContentTagHistory(historyTags).filter(
    (tag) => !selectedKeys.has(tag.toLocaleLowerCase()),
  );
  const historyKeys = new Set(availableHistory.map((tag) => tag.toLocaleLowerCase()));
  const availableSuggestions = suggestedContentTags.filter((tag) => {
    const key = tag.toLocaleLowerCase();
    return !selectedKeys.has(key) && !historyKeys.has(key);
  });

  function suggestionChip(tag: string) {
    return (
      <button
        key={tag}
        type="button"
        className="content-tag-suggestion rounded-full border border-[#ddd2c5] bg-white px-2.5 py-1 text-[#6f665c] transition hover:border-[#bd8a75] hover:text-[#934b35]"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onChange(normalizeContentTags([...value, tag]))}
      >
        + {tag}
      </button>
    );
  }

  if (!expanded) {
    return (
      <div className={className}>
        <button
          type="button"
          className="content-tag-trigger inline-flex min-h-8 items-center gap-1.5 rounded-md border border-[#d8cfc3] bg-[#fffefa] px-2.5 py-1.5 text-[#736b61] transition hover:border-[#bd8a75] hover:text-[#934b35]"
          aria-expanded={false}
          aria-controls={panelId}
          disabled={disabled}
          onClick={() => setExpanded(true)}
        >
          <Tag className="size-3.5" strokeWidth={1.8} />
          <span>{collapsedLabel}</span>
          {value.length ? (
            <span className="rounded-full bg-[#eadfd5] px-1.5 text-[10px] text-[#7f4938]">
              {value.length}
            </span>
          ) : null}
        </button>
      </div>
    );
  }

  return (
    <div
      id={panelId}
      className={cn("rounded-lg border border-[#ded5c9] bg-[#faf7f1] p-3", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="text-xs font-semibold text-[#5f584f]">
          标签 <span className="font-normal text-[#91887d]">（可选）</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#9a9186]">{value.length}/12</span>
          <button
            type="button"
            className="content-tag-collapse inline-flex items-center gap-0.5 text-[#81796e] hover:text-[#934b35]"
            disabled={disabled}
            onClick={() => setExpanded(false)}
          >
            收起 <ChevronUp className="size-3" />
          </button>
        </div>
      </div>

      {value.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-[#eadfd5] py-1 pl-2.5 pr-1.5 text-[11px] font-medium text-[#7f4938]"
            >
              #{tag}
              <button
                type="button"
                className="grid size-4 place-items-center rounded-full hover:bg-[#d9c8ba]"
                aria-label={`删除标签 ${tag}`}
                disabled={disabled}
                onClick={() => removeTag(tag)}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-2 flex gap-2">
        <input
          id={inputId}
          className="content-tag-input min-h-9 min-w-0 flex-1 rounded-md border border-[#ded5c9] bg-[#fffefa] px-3 py-2 text-[#4f4942] outline-none transition focus:border-[#bd7058] focus:shadow-[0_0_0_2px_rgb(185_87_58/8%)]"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (draft.trim()) addTags(draft);
          }}
          placeholder="输入自定义标签，按回车添加"
          maxLength={120}
          disabled={disabled || value.length >= 12}
        />
        <button
          type="button"
          className="content-tag-action inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-md border border-[#ded5c9] bg-white px-3 py-2 text-[#5f584f] transition hover:border-[#bfb5a7] hover:bg-[#f8f4ed] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || !draft.trim() || value.length >= 12}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => addTags(draft)}
        >
          <Plus className="size-3.5" /> 添加
        </button>
      </div>

      {availableHistory.length && value.length < 12 ? (
        <div className="mt-2.5">
          <p className="text-[10px] text-[#91887d]">你用过的</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {availableHistory.map(suggestionChip)}
          </div>
        </div>
      ) : null}

      {availableSuggestions.length && value.length < 12 ? (
        <div className="mt-2.5">
          <p className="text-[10px] text-[#91887d]">你可以试试</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {availableSuggestions.map(suggestionChip)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
