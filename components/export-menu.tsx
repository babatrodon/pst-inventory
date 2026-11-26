"use client";
import { useState } from "react";
import { Modal } from "./modal";

const OPTIONS = [
  { f: "xlsx", label: "Excel file (.xlsx)", hint: "Opens in Excel or Google Sheets." },
  { f: "pdf", label: "PDF file", hint: "Best for WhatsApp, email or keeping a copy." },
  { f: "doc", label: "Word file (.doc)", hint: "Opens in Microsoft Word." },
  { f: "print", label: "Print", hint: "Opens the print screen in a new tab.", blank: true },
] as const;

export function ExportMenu({ base, scopeLabel, note, triggerClass = "btn btn-o btn-sm", triggerLabel = "Export" }: {
  base: string; scopeLabel?: string; note?: string; triggerClass?: string; triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const join = base.includes("?") ? "&" : "?";
  return (<>
    <button type="button" className={triggerClass} onClick={() => setOpen(true)}>{triggerLabel}</button>
    <Modal open={open} onClose={() => setOpen(false)} title="Export">
      <div className="grid gap-2.5">
        {scopeLabel && <div className="hint">{scopeLabel}</div>}
        {OPTIONS.map(o => (
          <a key={o.f} href={`${base}${join}format=${o.f}`}
            {...("blank" in o && o.blank ? { target: "_blank", rel: "noopener" } : {})}
            className="btn btn-o w-full !justify-start !py-3 !h-auto"
            onClick={() => setOpen(false)}>
            <span className="text-left">
              <b className="block text-[14.5px]">{o.label}</b>
              <span className="hint font-normal">{o.hint}</span>
            </span>
          </a>
        ))}
        {note && <div className="hint">{note}</div>}
      </div>
    </Modal>
  </>);
}
