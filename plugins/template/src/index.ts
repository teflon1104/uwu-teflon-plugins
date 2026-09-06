import { findByProps } from "@vendetta/metro";
import { before } from "@vendetta/patcher";
import { showToast } from "@vendetta/ui/toasts";
import { storage } from "@vendetta/plugin";
import { React, ReactNative } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";

const MessageActions = findByProps("sendMessage", "receiveMessage");
const ChannelStore = findByProps("getChannel", "getDMFromUserId");
const { DCDNotificationManager } = ReactNative.NativeModules;

let unpatch: () => void;
let cooldownTimer: any = null;
let isOnCooldown = false;

function Settings() {
  const [serverId, setServerId] = React.useState(storage.serverId || "");
  const [vibrate, setVibrate] = React.useState(storage.vibrate ?? true);

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
    }),
    React.createElement((Forms as any).FormSwitchRow || (Forms as any).FormRow, {
      label: "Wibracje przy powiadomieniu",
      subLabel: "Wstrząs telefonu po 60 sekundach nya",
      value: vibrate,
      onValueChange: (val: boolean) => {
        setVibrate(val);
        storage.vibrate = val;
      }
    })
  );
}

export default {
  onLoad: () => {
    showToast("Wtyczka MEE6 aktywna nya! ( ͡° ͜ʖ ͡°)");

    try {
      unpatch = before("sendMessage", MessageActions, (args) => {
        const channelId = args[0];
        const channel = ChannelStore?.getChannel(channelId);

        if (storage.serverId && channel?.guild_id !== storage.serverId) {
          return;
        }

        if (!isOnCooldown) {
          isOnCooldown = true;
          showToast("MEE6: 60s wystartowało nya! (⊙_⊙)");

          if (cooldownTimer) clearTimeout(cooldownTimer);

          cooldownTimer = setTimeout(() => {
            isOnCooldown = false;

            try {
              if (DCDNotificationManager?.showNotification) {
                DCDNotificationManager.showNotification(
                  "https://cdn.discordapp.com/embed/avatars/0.png",
                  "MEE6 Cooldown",
                  "Minuta minęła! Pisz po exp nya! ( ͡° ͜ʖ ͡°)"
                );
              }
            } catch (err) {}

            if (storage.vibrate ?? true) {
              try {
                ReactNative.Vibration?.vibrate(400);
              } catch (err) {}
            }

            showToast("MEE6: Minuta minęła! Pisz po exp nya! (⁄ ⁄•⁄ω⁄•⁄ ⁄)");
          }, 60000);
        }
      });
    } catch (err) {}
  },
  onUnload: () => {
    unpatch?.();
    if (cooldownTimer) clearTimeout(cooldownTimer);
    isOnCooldown = false;
  },
  settings: Settings
};
