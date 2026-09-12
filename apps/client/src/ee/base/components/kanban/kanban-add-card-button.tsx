import { useTranslation } from "react-i18next";
import { IconPlus } from "@tabler/icons-react";
import classes from "@/ee/base/styles/kanban.module.css";

type KanbanAddCardButtonProps = {
  onAddCard: () => void;
  /** Override default i18n "New row" (e.g. Tasks → "New task"). */
  label?: string;
};

export function KanbanAddCardButton({ onAddCard, label }: KanbanAddCardButtonProps) {
  const { t } = useTranslation();
  return (
    <div
      className={classes.addCard}
      role="button"
      tabIndex={0}
      onClick={onAddCard}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAddCard();
        }
      }}
    >
      <IconPlus size={16} />
      {label ?? t("New row")}
    </div>
  );
}
