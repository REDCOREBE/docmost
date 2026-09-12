import { memo } from "react";
import { IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import classes from "@/ee/base/styles/grid.module.css";

type AddRowButtonProps = {
  onClick?: () => void;
  /** Override default i18n "New row" (e.g. Tasks → "New task"). */
  label?: string;
};

export const AddRowButton = memo(function AddRowButton({
  onClick,
  label,
}: AddRowButtonProps) {
  const { t } = useTranslation();

  return (
    <div
      className={classes.addRowButton}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <IconPlus size={14} />
      <span>{label ?? t("New row")}</span>
    </div>
  );
});
