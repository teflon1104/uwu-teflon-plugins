import { findByProps } from "@vendetta/metro";
import { before } from "@vendetta/patcher";
import { showToast } from "@vendetta/ui/toasts";
import { storage } from "@vendetta/plugin";
import { React, ReactNative } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";

const MessageActions = findByProps("sendMessage", "receiveMessage");
const ChannelStore = findByProps("getChannel", "getDMFromUserId");
const NotificationModule = (findByProps("displayNotification") || findByProps("showNotification")) as any;

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
      subLabel: "Włącz lub wyłącz wstrząs telefonu po 60 sekundach nya",
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
    try {
      unpatch = before("sendMessage", MessageActions, (args) => {
        const channelId = args[0];
        const channel = ChannelStore?.getChannel(channelId);

        if (storage.serverId && channel?.guild_id !== storage.serverId) {
          return;
        }

        if (!isOnCooldown) {
          isOnCooldown = true;
          showToast("MEE6: 60 sekund wystartowało nya! (⊙_⊙)");

          if (cooldownTimer) clearTimeout(cooldownTimer);

          cooldownTimer = setTimeout(() => {
            isOnCooldown = false;

            try {
              NotificationModule?.displayNotification?.({
                title: "MEE6 Cooldown",
                body: "Minuta minęła! Pisz po exp nya! ( ͡° ͜ʖ ͡°)"
              });
            } catch (err) {}

            if (storage.vibrate ?? true) {
              try {
                (ReactNative as any)?.Vibration?.vibrate(400);
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
