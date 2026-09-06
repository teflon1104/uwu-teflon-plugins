import { findByProps } from "@vendetta/metro";
import { before, instead } from "@vendetta/patcher";
import { showToast } from "@vendetta/ui/toasts";
import { storage } from "@vendetta/plugin";
import { React, ReactNative } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";

const MessageActions = findByProps("sendMessage", "receiveMessage");
const ChannelStore = findByProps("getChannel", "getDMFromUserId");
const SelectedChannelStore = findByProps("getChannelId", "getVoiceChannelId");
const ChatInputModule = findByProps("ChatInput") as any;
const { DCDNotificationManager } = (ReactNative as any)?.NativeModules || {};

let unpatches: (() => void)[] = [];
let cooldownInterval: any = null;
let cooldownSeconds = 0;
let isOnCooldown = false;

function ChatInputWrapper(props: any) {
  const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      if (cooldownSeconds > 0) {
        forceUpdate();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeProps = { ...props.originalProps };

  if (cooldownSeconds > 0) {
    const currentChannelId = SelectedChannelStore?.getChannelId?.();
    const currentChannel = currentChannelId ? ChannelStore?.getChannel?.(currentChannelId) : null;

    if (!storage.serverId || currentChannel?.guild_id === storage.serverId) {
      activeProps.placeholder = `MEE6 Cooldown: ${cooldownSeconds}s nya~ (⊙_⊙)`;
    }
  }

  return React.createElement(props.orig, activeProps);
}

function startCooldown() {
  if (isOnCooldown) return;
  isOnCooldown = true;
  cooldownSeconds = 60;

  showToast("MEE6: 60s wystartowało nya! (⊙_⊙)");

  if (cooldownInterval) clearInterval(cooldownInterval);

  cooldownInterval = setInterval(() => {
    cooldownSeconds--;

    if (cooldownSeconds <= 0) {
      clearInterval(cooldownInterval);
      cooldownInterval = null;
      isOnCooldown = false;

      if (storage.vibrate ?? true) {
        try {
          (ReactNative as any)?.Vibration?.vibrate([0, 250, 100, 250]);
        } catch (err) {}
      }

      try {
        if (DCDNotificationManager?.showNotification) {
          try {
            DCDNotificationManager.showNotification(
              "https://cdn.discordapp.com/embed/avatars/0.png",
              "MEE6 Cooldown",
              "Minuta minęła! Pisz po exp nya! ( ͡° ͜ʖ ͡°)"
            );
          } catch (e) {
            DCDNotificationManager.showNotification(
              1337,
              "mee6",
              "MEE6 Cooldown",
              "Minuta minęła! Pisz po exp nya! ( ͡° ͜ʖ ͡°)",
              "https://cdn.discordapp.com/embed/avatars/0.png"
            );
          }
        } else if (DCDNotificationManager?.displayNotification) {
          DCDNotificationManager.displayNotification({
            id: 1337,
            title: "MEE6 Cooldown",
            body: "Minuta minęła! Pisz po exp nya! ( ͡° ͜ʖ ͡°)"
          });
        }
      } catch (err) {}

      showToast("MEE6: Minuta minęła! Pisz po exp nya! (⁄ ⁄•⁄ω⁄•⁄ ⁄)");
    }
  }, 1000);
}

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
      unpatches.push(
        before("sendMessage", MessageActions, (args) => {
          const channelId = args[0];
          const channel = ChannelStore?.getChannel(channelId);

          if (storage.serverId && channel?.guild_id !== storage.serverId) {
            return;
          }

          startCooldown();
        })
      );

      if (ChatInputModule?.ChatInput) {
        unpatches.push(
          instead("ChatInput", ChatInputModule, (args, orig) => {
            return React.createElement(ChatInputWrapper, {
              orig,
              originalProps: args[0] || {}
            });
          })
        );
      }
    } catch (err: any) {
      showToast(`Błąd wtyczki: ${err?.message || err}`);
    }
  },
  onUnload: () => {
    unpatches.forEach((u) => u?.());
    unpatches = [];
    if (cooldownInterval) clearInterval(cooldownInterval);
    isOnCooldown = false;
    cooldownSeconds = 0;
  },
  settings: Settings
};
