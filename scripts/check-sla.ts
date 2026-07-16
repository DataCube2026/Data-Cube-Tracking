import { prisma } from "../src/lib/prisma";
import { notificationSettings, sendTicketNotification } from "../src/lib/notifications";

async function main() {
  const settings = await notificationSettings();
  const now = new Date();
  const soonAt = new Date(now.getTime() + settings.dueSoonHours * 60 * 60 * 1000);
  const tickets = await prisma.ticket.findMany({
    where: { status: { not: "DONE" }, dueDate: { not: null, lte: soonAt } },
    select: { id: true, number: true, title: true, dueDate: true, createdById: true, assignees: { select: { id: true } } },
  });
  const day = now.toISOString().slice(0, 10);
  for (const ticket of tickets) {
    if (!ticket.dueDate) continue;
    const assignees = ticket.assignees.map((user) => user.id);
    const overdue = ticket.dueDate.getTime() < now.getTime();
    const hoursOverdue = overdue ? (now.getTime() - ticket.dueDate.getTime()) / 3_600_000 : 0;
    const type: "OVERDUE" | "DUE_SOON" = overdue ? "OVERDUE" : "DUE_SOON";
    const recipients = overdue ? [...assignees, ticket.createdById] : assignees;
    await sendTicketNotification({
      ticketId: ticket.id,
      type,
      message: overdue
        ? `TCUBE-${String(ticket.number).padStart(3, "0")} เกินกำหนด: ${ticket.title}`
        : `TCUBE-${String(ticket.number).padStart(3, "0")} ใกล้ครบกำหนด: ${ticket.title}`,
      recipientIds: recipients,
      dedupeKey: `${type}:${ticket.id}:${day}`,
    });
    if (overdue && hoursOverdue >= settings.overdueEscalationHours) {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      await sendTicketNotification({
        ticketId: ticket.id,
        type: "ESCALATION",
        message: `Escalation: TCUBE-${String(ticket.number).padStart(3, "0")} เกินกำหนดแล้ว`,
        recipientIds: admins.map((admin) => admin.id),
        dedupeKey: `ESCALATION:${ticket.id}:${day}`,
      });
    }
  }
}

main().finally(() => prisma.$disconnect());
