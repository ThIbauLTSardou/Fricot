import { Alert, Platform } from "react-native";

// Confirmation cross-platform : Alert sur mobile, window.confirm sur web
// (Alert.alert n'affiche pas de boutons sur le web).
export function confirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === "web") {
    const ok = window.confirm(`${title}\n\n${message}`);
    return Promise.resolve(ok);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Annuler", style: "cancel", onPress: () => resolve(false) },
      { text: "Confirmer", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}
