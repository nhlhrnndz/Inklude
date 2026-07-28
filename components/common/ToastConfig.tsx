import React from "react";
import {
  BaseToast,
  ErrorToast,
  ToastConfig,
} from "react-native-toast-message";

import { ColorPalette } from "../../theme/colors";

export const createToastConfig = (
  colors: ColorPalette
): ToastConfig => ({
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: colors.primary,
        borderLeftWidth: 6,
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: "700",
      }}
      text2Style={{
        fontSize: 14,
      }}
    />
  ),

  error: (props) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: colors.error,
        borderLeftWidth: 6,
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: "700",
      }}
      text2Style={{
        fontSize: 14,
      }}
    />
  ),
});