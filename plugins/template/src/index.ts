import { findByProps } from "@vendetta/metro";
import { before } from "@vendetta/patcher";
import { showToast } from "@vendetta/ui/toasts";
import { storage } from "@vendetta/plugin";
import { React } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";

const MessageActions = findByProps("sendMessage", "receiveMessage");
const ChannelStore = findByProps("getChannel", "getDMFromUserId");

let unpatch: () => void;
let cooldownTimer: any = null;
let isOnCooldown = false;

function Settings() {
  const [serverId, setServerId] = React.useState(storage.serverId || "");

  return React.createElement(
    Forms.FormSection,
    { title: "Ustawienia MEE6 nya!" },
    React.createElement(Forms.FormInput, {
      title: "ID Serwera",
      placeholder: "Wklej ID serwera (puste = działa wszędzie)",
      value: serverId,
      onChange: (val: string) => {
        setServerId(val);
        storage.serverId = val.trim();
      }
    })
  );
}

export default {
  onLoad: () => {
    showToast("Wtyczka MEE6 aktywna nya! ( ͡° ͜ʖ ͡°)");

    try {
      unpatch = before("sendMessage", MessageActions, (args) => {
        showToast("Wykryto wysłanie wiadomości nya!");

        const channelId = args[0];
        const channel = ChannelStore?.getChannel(channelId);

        if (storage.serverId && channel?.guild_id !== storage.serverId) {
          return;
        }

        if (!isOnCooldown) {
          isOnCooldown = true;
          showToast("MEE6: 60s wystartowało nya!");

          if (cooldownTimer) clearTimeout(cooldownTimer);

          cooldownTimer = setTimeout(() => {
            isOnCooldown = false;
            showToast("MEE6: Minuta minęła! Pisz po exp nya! (⁄ ⁄•⁄ω⁄•⁄ ⁄)");
          }, 60000);
        }
      });
    } catch (err: any) {
      showToast(`Błąd przechwytywania: ${err?.message || err}`);
    }
  },
  onUnload: () => {
    unpatch?.();
    if (cooldownTimer) clearTimeout(cooldownTimer);
    isOnCooldown = false;
  },
  settings: Settings
};
