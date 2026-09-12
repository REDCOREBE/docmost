import { Avatar, Tooltip } from "@mantine/core";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { AvatarIconType } from "@/features/attachments/types/attachment.types";
import { TaskAssignee } from "../types/task.types";

export function TasksAssigneeAvatars({
  assignees = [],
}: {
  assignees?: TaskAssignee[];
}) {
  if (!assignees.length) {
    return (
      <Avatar.Group>
        <Avatar radius="xl" size={24} color="gray">
          —
        </Avatar>
      </Avatar.Group>
    );
  }
  return (
    <Avatar.Group spacing="sm">
      {assignees.slice(0, 4).map((a) => (
        <Tooltip key={a.id} label={a.name} withArrow>
          <CustomAvatar
            size={24}
            avatarUrl={a.avatarUrl}
            name={a.name}
            type={AvatarIconType.AVATAR}
          />
        </Tooltip>
      ))}
      {assignees.length > 4 && (
        <Avatar radius="xl" size={24}>
          +{assignees.length - 4}
        </Avatar>
      )}
    </Avatar.Group>
  );
}
