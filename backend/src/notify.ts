const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID ?? "";

const TG_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

interface ReplyButton { text: string }

const notificationMessages = new Map<string, number>();

export function notifyTelegram(
  message: string,
  buttons?: ReplyButton[][],
  proposalId?: string,
  chatId?: string
): void {
  if (!TELEGRAM_BOT_TOKEN) return;

  const body: Record<string, unknown> = {
    chat_id: chatId || TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: "Markdown",
  };

  if (buttons) {
    body.reply_markup = { keyboard: buttons, one_time_keyboard: true, resize_keyboard: true };
  }

  fetch(`${TG_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then(async (res) => {
      if (!res.ok) {
        console.error("Telegram sendMessage failed:", res.status, await res.text());
        return;
      }
      if (proposalId) {
        const data = await res.json() as { result?: { message_id?: number } };
        const messageId = data.result?.message_id;
        if (messageId) notificationMessages.set(proposalId, messageId);
      }
    })
    .catch((err) => console.error("Telegram notification error:", err));
}

export function editNotification(proposalId: string, newMessage: string, chatId?: string): void {
  const messageId = notificationMessages.get(proposalId);
  if (messageId == null) {
    console.warn(`No notification message found for ${proposalId}`);
    return;
  }

  fetch(`${TG_API}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId || TELEGRAM_CHAT_ID,
      message_id: messageId,
      text: newMessage,
      parse_mode: "Markdown",
    }),
  })
    .then(async (res) => {
      if (!res.ok) console.error("Telegram editMessageText failed:", res.status, await res.text());
      else notificationMessages.delete(proposalId);
    })
    .catch((err) => console.error("Telegram edit error:", err));
}
