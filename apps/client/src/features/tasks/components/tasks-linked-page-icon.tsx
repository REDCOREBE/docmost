import { Tooltip, ThemeIcon, UnstyledButton } from "@mantine/core";
import { IconFileDescription } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { buildPageUrl } from "@/features/page/page.utils";
import { TaskLinkedPage } from "../types/task.types";

export function TasksLinkedPageIcon({
  linkedPage,
}: {
  linkedPage?: TaskLinkedPage | null;
}) {
  if (!linkedPage?.spaceSlug) return null;
  return (
    <Tooltip label={linkedPage.title || linkedPage.slugId} withArrow>
      <UnstyledButton
        component={Link}
        to={buildPageUrl(
          linkedPage.spaceSlug,
          linkedPage.slugId,
          linkedPage.title,
        )}
        onClick={(e) => e.stopPropagation()}
        style={{ display: "inline-flex" }}
      >
        <ThemeIcon variant="transparent" color="gray" size={18}>
          <IconFileDescription size={16} />
        </ThemeIcon>
      </UnstyledButton>
    </Tooltip>
  );
}
