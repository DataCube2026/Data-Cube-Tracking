"use client";

// กล่องเขียนอัปเดต: พิมพ์ @ แท็กทีม + แนบไฟล์ (ลากมาวางหรือกดเลือก)
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addComment } from "@/lib/actions";
import { IconPaperclip } from "@/components/Icons";
import { toast, toastLoading } from "@/components/Toaster";

type U = { id: string; username: string; name: string };

export function CommentBox({
  ticketId,
  users,
}: {
  ticketId: string;
  users: U[];
}) {
  const [text, setText] = useState("");
  const [mention, setMention] = useState<string | null>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setText(v);
    const caret = e.target.selectionStart ?? v.length;
    const before = v.slice(0, caret);
    const m = before.match(/@([\w.ก-๙]*)$/);
    setMention(m ? m[1] : null);
  }

  const matches =
    mention !== null
      ? users
          .filter(
            (u) =>
              u.username.toLowerCase().startsWith(mention.toLowerCase()) ||
              u.name.toLowerCase().includes(mention.toLowerCase())
          )
          .slice(0, 5)
      : [];

  function pick(u: U) {
    const ta = taRef.current;
    if (!ta) return;
    const caret = ta.selectionStart ?? text.length;
    const before = text
      .slice(0, caret)
      .replace(/@([\w.ก-๙]*)$/, `@${u.username} `);
    setText(before + text.slice(caret));
    setMention(null);
    ta.focus();
  }

  function syncNames() {
    setFileNames(Array.from(fileRef.current?.files ?? []).map((f) => f.name));
  }

  function addFiles(list: FileList) {
    const input = fileRef.current;
    if (!input) return;
    const dt = new DataTransfer();
    Array.from(input.files ?? []).forEach((f) => dt.items.add(f));
    let rejected = false;
    Array.from(list).forEach((f) => {
      // ไฟล์ใหญ่เกิน 4MB — แนะนำใช้ลิงก์ Google Drive แทน
      if (f.size > 4 * 1024 * 1024) {
        rejected = true;
        return;
      }
      dt.items.add(f);
    });
    if (rejected) {
      toast(
        "ไฟล์ใหญ่เกิน 4MB — แนะนำอัปโหลดขึ้น Google Drive แล้วใช้ \"เพิ่มลิงก์\" ในการ์ดไฟล์แนบแทน"
      );
    }
    input.files = dt.files;
    syncNames();
  }

  function removeFile(idx: number) {
    const input = fileRef.current;
    if (!input) return;
    const dt = new DataTransfer();
    Array.from(input.files ?? []).forEach((f, i) => {
      if (i !== idx) dt.items.add(f);
    });
    input.files = dt.files;
    syncNames();
  }

  return (
    <form
      action={async (fd) => {
        if (busy) return; // กันกดโพสต์ซ้ำ
        setBusy(true);
        const nFiles = fileRef.current?.files?.length ?? 0;
        toastLoading(
          nFiles > 0
            ? `กำลังอัปโหลดไฟล์ ${nFiles} ไฟล์ขึ้น Google Drive...`
            : "กำลังโพสต์อัปเดต..."
        );
        try {
          const res = await addComment(fd);
          setText("");
          if (fileRef.current) fileRef.current.value = "";
          setFileNames([]);
          router.refresh();
          if (res && res.failed > 0) {
            toast(
              `โพสต์แล้ว แต่แนบไฟล์ไม่สำเร็จ ${res.failed} ไฟล์ — แจ้งแอดมินตรวจการตั้งค่า Google Drive`
            );
          } else {
            toast("โพสต์อัปเดตเรียบร้อยแล้ว");
          }
        } finally {
          setBusy(false);
        }
      }}
      className="relative mb-4 space-y-2"
    >
      <input type="hidden" name="ticketId" value={ticketId} />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        className={`rounded-lg transition ${
          dragging ? "ring-2 ring-brand-400 ring-offset-1" : ""
        }`}
      >
        <textarea
          ref={taRef}
          name="body"
          rows={3}
          value={text}
          onChange={onChange}
          placeholder="เขียนอัปเดต... พิมพ์ @ แท็กทีม หรือลากไฟล์มาวางที่นี่"
          className="input"
        />
      </div>

      {matches.length > 0 && (
        <div className="absolute z-20 w-60 rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
          {matches.map((u) => (
            <button
              type="button"
              key={u.id}
              onClick={() => pick(u)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                {u.name.charAt(0)}
              </span>
              <span>{u.name}</span>
              <span className="ml-auto text-xs text-slate-400">@{u.username}</span>
            </button>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        name="files"
        multiple
        className="hidden"
        onChange={(e) => {
          const input = e.currentTarget;
          const ok = Array.from(input.files ?? []).filter(
            (f) => f.size <= 4 * 1024 * 1024
          );
          if (ok.length !== (input.files?.length ?? 0)) {
            const dt = new DataTransfer();
            ok.forEach((f) => dt.items.add(f));
            input.files = dt.files;
            toast(
              "ไฟล์ใหญ่เกิน 4MB — แนะนำอัปโหลดขึ้น Google Drive แล้วใช้ \"เพิ่มลิงก์\" แทน"
            );
          }
          syncNames();
        }}
      />

      {fileNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {fileNames.map((n, i) => (
            <span
              key={`${n}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
            >
              <IconPaperclip size={11} />
              <span className="max-w-40 truncate">{n}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-slate-400 hover:text-brand-600"
                title="เอาออก"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="btn-secondary px-3"
          title="แนบไฟล์ (ไม่เกิน 4MB ต่อไฟล์ — ไฟล์ใหญ่ใช้ลิงก์ Google Drive)"
        >
          <IconPaperclip size={15} />
          แนบไฟล์
        </button>
        <button disabled={busy} className="btn-primary flex-1">
          {busy ? "กำลังโพสต์..." : "โพสต์อัปเดต"}
        </button>
      </div>
    </form>
  );
}
