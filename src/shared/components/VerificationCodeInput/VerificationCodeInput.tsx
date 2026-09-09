import { useState, useRef } from "react";
import styles from "./VerificationCodeInput.module.css";

interface VerificationCodeInputProps {
  onCodeComplete: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export function VerificationCodeInput({
  onCodeComplete,
  disabled = false,
  error = false,
}: VerificationCodeInputProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if all digits are filled
    if (newDigits.every((d) => d !== "") && newDigits.length === 6) {
      onCodeComplete(newDigits.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const newDigits = pastedData
      .split("")
      .concat(Array(6 - pastedData.length).fill(""));
    setDigits(newDigits);
    if (pastedData.length === 6) {
      onCodeComplete(pastedData);
    } else if (pastedData.length > 0) {
      // Focus the next empty input or the last one
      const nextIndex = Math.min(pastedData.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };


  return (
    <div className={styles["verification-code-input"]}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`${styles["verification-code-input__digit"]} typography-headline-medium ${
            error ? styles["verification-code-input__digit--error"] : ""
          }`}
          aria-label={`Digit ${index + 1} of verification code`}
        />
      ))}
    </div>
  );
}

