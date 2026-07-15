"use client";

// รายการอัปเดตงาน: ตอบกลับได้ / แก้ไข-ลบได้เฉพาะเจ้าของ
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtDateTime } from "@/lib/constants";
import { addComment, editComment, deleteComment } from "@/lib/actions";
import { toast } from "@/components/Toaster";
import { IconPaperclip } from "@/components/Icons";
import { ConfirmButton } from "@/components/Confirm";

type U = { id: string; username: string; name: string };

export type CItem = {
  id: string;
  body: string;
  createdAt: Date | string;
  author: { id: string; name: string };
  attachments: { id: string; name: string; url: string }[];
  replies?: CItem[];
};

function Body({ body, users }: { body: string; users: U[] }) {
  const parts = body.split(/(@[\w.]+)/g);
  return (
    <p className="whitespace-pre-wrap text-sm text-slate-700">
      {parts.map((p, i) => {
        if (p.startsWith("@")) {
          const u = users.find((x) => x.username === p.slice(1));
          if (u)
            return (
              <span
                key={i}
                className="rounded bg-brand-50 px-1 font-medium text-brand-700"
              >
                @{u.name}
              </span>
            );
        }
        return <span key={i}>{p}</span>;
      })}
    </p>
  );
}

function CommentItem({
  c,
  users,
  me,
  ticketId,
  isReply = false,
}: {
  c: CItem;
  users: U[];
  me: string;
  ticketId: string;
  isReply?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);
  const router = useRouter();
  const mine = c.author.id === me;

  return (
    <div
      className={`rounded-lg border border-slate-100 p-3 ${
        isReply ? "bg-white" : "bg-slate-50"
      }`}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold text-white">
          {c.author.name.charAt(0)}
        </span>
        <span className="text-xs font-medium text-slate-700">{c.author.name}</span>
        <span className="ml-auto text-xs text-slate-400">
          {fmtDateTime(c.createdAt)}
        </span>
      </div>

      {editing ? (
        <form
          action={async (fd) => {
            await editComment(fd);
            setEditing(false);
            router.refresh();
            toast("บันทึกการแก้ไขเรียบร้อยแล้ว");
          }}
          className="space-y-2"
        >
          <input type="hidden" name="commentId" value={c.id} />
          <textarea name="body" defaultValue={c.body} rows={3} className="input" required />
          <div className="flex gap-2">
            <button className="btn-primary px-3 py-1 text-xs">บันทึก</button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="btn-secondary px-3 py-1 text-xs"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      ) : (
        <Body body={c.body} users={users} />
      )}

      {c.attachments.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
          {c.attachments.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-brand-600 hover:underline"
            >
              <IconPaperclip size={12} />
              {a.name}
            </a>
          ))}
        </div>
      )}

      {/* ปุ่มจัดการ */}
      {!editing && (
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
          {!isReply && (
            <button
              onClick={() => setReplying(!replying)}
              className="hover:text-brand-600"
            >
              ตอบกลับ
            </button>
          )}
          {mine && (
            <button onClick={() => setEditing(true)} className="hover:text-brand-600">
              แก้ไข
            </button>
          )}
          {mine && (
            <ConfirmButton
              message={
                isReply
                  ? "ต้องการลบการตอบกลับนี้ใช่ไหม?"
                  : "ต้องการลบอัปเดตนี้ใช่ไหม? การตอบกลับด้านล่างจะถูกลบไปด้วย"
              }
              action={deleteComment}
              hidden={{ commentId: c.id }}
              className="hover:text-brand-600"
            >
              ลบ
            </ConfirmButton>
          )}
        </div>
      )}

      {/* ช่องตอบกลับ */}
      {replying && (
        <form
          action={async (fd) => {
            await addComment(fd);
            setReplying(false);
            router.refresh();
            toast("ตอบกลับเรียบร้อยแล้ว");
          }}
          className="mt-2 flex gap-2"
        >
          <input type="hidden" name="ticketId" value={ticketId} />
          <input type="hidden" name="parentId" value={c.id} />
          <input
            name="body"
            placeholder="เขียนตอบกลับ..."
            required
            autoFocus
            className="input flex-1 px-2 py-1.5 text-sm"
          />
          <button className="btn-secondary shrink-0 px-3 py-1.5 text-xs">ส่ง</button>
        </form>
      )}

      {/* รายการตอบกลับ */}
      {c.replies && c.replies.length > 0 && (
        <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-3">
          {c.replies.map((r) => (
            <CommentItem
              key={r.id}
              c={r}
              users={users}
              me={me}
              ticketId={ticketId}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentThread({
  ticketId,
  users,
  comments,
  me,
}: {
  ticketId: string;
  users: U[];
  comments: CItem[];
  me: string;
}) {
  return (
    <div className="space-y-3 overflow-y-auto">
      {comments.length === 0 && (
        <p className="text-sm text-slate-400">
          ยังไม่มีอัปเดต — ทุกคนในทีมเข้ามาอัปเดตความคืบหน้าได้
        </p>
      )}
      {comments.map((c) => (
        <CommentItem key={c.id} c={c} users={users} me={me} ticketId={ticketId} />
      ))}
    </div>
  );
}
