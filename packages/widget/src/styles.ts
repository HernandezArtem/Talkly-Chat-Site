import { baseStyles } from "./styles/base";
import { inputStyles } from "./styles/input";
import { messageStyles } from "./styles/messages";
import { nudgeStyles } from "./styles/nudge";
import { windowStyles } from "./styles/window";

export const styles = [
  baseStyles,
  windowStyles,
  messageStyles,
  inputStyles,
  nudgeStyles,
].join("\n");
