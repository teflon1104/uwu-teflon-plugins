import { findByProps } from "@vendetta/metro";
import { before, instead } from "@vendetta/patcher";
import { showToast } from "@vendetta/ui/toasts";
import { storage } from "@vendetta/plugin";
import { React, ReactNative } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";

const MessageActions = findByProps("sendMessage", "receiveMessage");
const ChannelStore = findByProps("getChannel", "getDMFromUserId");
const SelectedChannelStore = findByProps("getChannelId", "getVoiceChannelId");
const FluxDispatcher = findByProps("dispatch", "subscribe");
const UserStore = findByProps("getCurrentUser");
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
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const currentChannelId = SelectedChannelStore?.getChannelId?.();
  const currentChannel = currentChannelId ? ChannelStore?.getChannel?.(currentChannelId) : null;
  const isCorrectServer = !storage.serverId || currentChannel?.guild_id === storage.serverId;

  return React.createElement(
    (ReactNative as any).View,
    { style: { width: "100%" } },
    cooldownSeconds > 0 && isCorrectServer
      ? React.createElement(
          (ReactNative as any).View,
          {
            style: {
              backgroundColor: "#1e1f22",
              paddingVertical: 8,
              paddingHorizontal: 12,
              marginHorizontal: 12,
              marginBottom: 6,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#5865f2",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between"
            }
          },
          React.createElement(
            (ReactNative as any).Text,
            { style: { color: "#ffffff", fontWeight: "bold", fontSize: 13 } },
            `⏳ MEE6: ${cooldownSeconds}s nya~ (⊙_⊙)`
          ),
          React.createElement(
            (ReactNative as any).Text,
            { style: { color: "#b5bac1", fontSize: 12 } },
            "Czekaj na exp..."
          )
        )
      : null,
    React.createElement(props.orig, props.originalProps)
  );
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
        }
      } catch (err) {}

      showToast("MEE6: Minuta minęła! Pisz po exp nya! (⁄ ⁄•⁄ω⁄•⁄ ⁄)");
    }
  }, 1000);
}

function onMessageCreate(event: any) {
  try {
    const message = event?.message;
    if (!message) return;

    const currentUserId = UserStore?.getCurrentUser?.()?.id;
    if (!currentUserId || message.author?.id !== currentUserId) return;

    const channel = ChannelStore?.getChannel?.(message.channel_id);
    if (storage.serverId && channel?.guild_id !== storage.serverId) {
      return;
    }

    startCooldown();
  } catch (err) {}
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
      const sendMethods = ["sendMessage", "sendStickers", "sendGreetMessage"];
      for (const method of sendMethods) {
        if (MessageActions?.[method]) {
          unpatches.push(
            before(method, MessageActions, (args) => {
              const channelId = args[0];
              const channel = ChannelStore?.getChannel?.(channelId);

              if (storage.serverId && channel?.guild_id !== storage.serverId) {
                return;
              }

              startCooldown();
            })
          );
        }
      }

      FluxDispatcher?.subscribe?.("MESSAGE_CREATE", onMessageCreate);

      const targets = [
        [findByProps("ChannelChatInput"), "default"],
        [findByProps("ChannelChatInput"), "ChannelChatInput"],
        [findByProps("ChatInput"), "ChatInput"],
        [findByProps("ChatInput"), "default"]
      ];

      for (const [mod, prop] of targets) {
        if (mod && (mod as any)[prop]) {
          unpatches.push(
            instead(prop, mod, (args, orig) => {
              return React.createElement(ChatInputWrapper, {
                orig,
                originalProps: args[0] || {}
              });
            })
          );
          break;
        }
      }
    } catch (err: any) {
      showToast(`Błąd wtyczki: ${err?.message || err}`);
    }
  },
  onUnload: () => {
    unpatches.forEach((u) => u?.());
    unpatches = [];
    FluxDispatcher?.unsubscribe?.("MESSAGE_CREATE", onMessageCreate);
    if (cooldownInterval) clearInterval(cooldownInterval);
    isOnCooldown = false;
    cooldownSeconds = 0;
  },
  settings: Settings
};
