import React from "react";
import { Search, X } from "lucide-react";
import styles from "./desktop-UnifiedSearchbar.module.css";

type Props = {
  value: string;
  placeholder: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
};

const UnifiedSearchbar: React.FC<Props> = ({
  value,
  placeholder,
  onChange,
  onClear,
}) => {
  return (
    <div className={styles["search"]}>
      <div className={styles["search__container"]}>
        <Search size={18} className={styles["search__icon"]} />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`${styles["search__input"]} typography-desktop-body-small`}
        />
        {value && (
          <button
            onClick={onClear}
            className={styles["search__clear"]}
            type="button"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default React.memo(UnifiedSearchbar);
