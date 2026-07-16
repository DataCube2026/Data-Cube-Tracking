import { prisma } from "@/lib/prisma";

export type NotificationEvent =
  | "ASSIGNMENT"
  | "STATUS_CHANGE"
  | "COMMENT"
  | "MENTION"
  | "DUE_SOON"
  | "OVERDUE"
  | "ESCALATION";

export async function notificationSettings() {
  return prisma.notificationSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}

function isEnabled(
  settings: Awaited<ReturnType<typeof notificationSettings>>,
  type: NotificationEvent
) {
  return {
    ASSIGNMENT: settings.notifyAssignment,
    STATUS_CHANGE: settings.notifyStatusChange,
    COMMENT: settings.notifyComment,
    MENTION: settings.notifyMention,
    DUE_SOON: settings.notifyDueSoon,
    OVERDUE: settings.notifyOverdue,
    ESCALATION: true,
  }[type];
}

export async function sendTicketNotification(input: {
  ticketId: string;
  actorId?: string;
  type: NotificationEvent;
  message: string;
  url?: string;
  recipientIds: string[];
  dedupeKey?: string;
}) {
  const settings = await notificationSettings();
  if (!isEnabled(settings, input.type)) return;

  const recipientIds = Array.from(new Set(input.recipientIds)).filter(
    (id) => id && id !== input.actorId
  );
  if (!recipientIds.length) return;

  await prisma.notification.createMany({
    data: recipientIds.map((userId) => ({
      userId,
      ticketId: input.ticketId,
      type: input.type,
      message: input.message,
      url: input.url ?? `/tickets/${input.ticketId}`,
      dedupeKey: input.dedupeKey,
    })),
    skipDuplicates: true,
  });
}

export async function relatedTicketUserIds(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { createdById: true, assignees: { select: { id: true } } },
  });
  if (!ticket) return [];
  return [ticket.createdById, ...ticket.assignees.map((user) => user.id)];
}
