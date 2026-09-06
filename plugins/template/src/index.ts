import { findByProps } from "@vendetta/metro";
import { registerCommand } from "@vendetta/commands";

const MessageActions = findByProps("sendMessage", "receiveMessage");

let unregister: () => void;

export default {
  onLoad: () => {
    unregister = registerCommand({
      name: "mee6",
      displayName: "mee6",
      description: "Sprawdź swoje statystyki MEE6 nya!",
      displayDescription: "Sprawdź swoje statystyki MEE6 nya!",
      options: [],
      execute: async (args, ctx) => {
        try {
          const guildId = ctx.channel.guild_id;
          const userId = ctx.channel.author?.id || ctx.user?.id;

          if (!guildId) {
            MessageActions.receiveMessage(ctx.channel.id, {
              content: "Użyj tej komendy na kanale serwera z botem MEE6 nya! (⁄ ⁄•⁄ω⁄•⁄ ⁄)"
            });
            return;
          }

          const res = await fetch(`https://mee6.xyz/api/plugins/levels/leaderboard/${guildId}`);
          const data = await res.json();
          const player = data.players?.find((p: any) => p.id === userId);

          if (!player) {
            MessageActions.receiveMessage(ctx.channel.id, {
              content: "Nie znaleziono Cię w TOP 100 tablicy serwera nya! (⊙_⊙)"
            });
            return;
          }

          const currentLvlXp = player.detailed_xp?.[0] || 0;
          const neededLvlXp = player.detailed_xp?.[1] || 0;
          const remainingXp = neededLvlXp - currentLvlXp;
          const percent = Math.round((currentLvlXp / neededLvlXp) * 100);

          const reply = `LVL: ${player.level} (${percent}%)\nPostęp: ${currentLvlXp} / ${neededLvlXp} XP\nBrakujący exp: ${remainingXp} XP\nWiadomości w bazie: ${player.message_count || 0}`;

          MessageActions.receiveMessage(ctx.channel.id, {
            content: reply
          });
        } catch (err: any) {
          MessageActions.receiveMessage(ctx.channel.id, {
            content: `Błąd pobierania MEE6 nya: ${err?.message || err}`
          });
        }
      }
    });
  },
  onUnload: () => {
    unregister?.();
  }
};
