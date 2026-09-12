import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useGetSpaceBySlugQuery } from "@/features/space/queries/space-query";
import { TasksPageContent } from "./tasks-page";
import PageListSkeleton from "@/components/ui/page-list-skeleton";
import { Container, Text, Title } from "@mantine/core";

export default function SpaceTasksPage() {
  const { t } = useTranslation();
  const { spaceSlug } = useParams();
  const { data: space, isLoading, isError } = useGetSpaceBySlugQuery(spaceSlug);

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <Title order={2} mb="lg">
          {t("Tasks")}
        </Title>
        <PageListSkeleton />
      </Container>
    );
  }

  if (isError || !space) {
    return (
      <Container size="xl" py="xl">
        <Text>{t("Space not found")}</Text>
      </Container>
    );
  }

  return (
    <TasksPageContent
      spaceId={space.id}
      spaceSlug={space.slug}
      title={t("Tasks")}
      spacePermissions={space?.membership?.permissions}
    />
  );
}
