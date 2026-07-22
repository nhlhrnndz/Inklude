import React from "react";
import Toast, {
  BaseToast,
  ErrorToast,
} from "react-native-toast-message";

import Colors from "../../theme/colors";

export const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: Colors.primary,
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

  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: Colors.error,
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
};

export default Toast;