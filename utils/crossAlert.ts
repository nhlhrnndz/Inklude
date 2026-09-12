import { Alert, Platform } from "react-native";

interface CrossAlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

export function crossAlert(
  title: string,
  message?: string,
  buttons?: CrossAlertButton[],
) {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons);
    return;
  }

  // web fallback — Alert.alert is a silent no-op on web
  const fullMessage = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length <= 1) {
    window.alert(fullMessage);
    buttons?.[0]?.onPress?.();
    return;
  }

  // Two-button case (e.g. Cancel / End, Cancel / Done): use confirm()
  const cancelBtn = buttons.find((b) => b.style === "cancel");
  const actionBtn = buttons.find((b) => b.style !== "cancel") ?? buttons[0];

  const confirmed = window.confirm(fullMessage);
  if (confirmed) {
    actionBtn?.onPress?.();
  } else {
    cancelBtn?.onPress?.();
  }
}
