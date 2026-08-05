import { Stack, Card, Group, Text, ActionIcon } from "@mantine/core";

export default function SavedList({ items, onDelete }) {
  if (!items.length) {
    return <Text className="empty">no attractions saved yet — search above to add one</Text>;
  }

  return (
    <Stack gap="xs">
      {items.map((item) => {
        const link = item.official_url || item.wikipedia_url;
        return (
          <Card key={item.id} className="savedItem" padding={0} withBorder>
            <Group gap={0} wrap="nowrap" align="stretch">
              <a
                className="savedItemLink"
                href={link || undefined}
                target={link ? "_blank" : undefined}
                rel={link ? "noopener" : undefined}
                onClick={(e) => {
                  if (!link) e.preventDefault();
                }}
              >
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="thumb" />
                ) : (
                  <span className="thumb thumbPlaceholder" aria-hidden="true" />
                )}
                <span className="savedItemInfo">
                  <span className="savedItemTitle">{item.title}</span>
                  {item.extract && <span className="savedItemExtract">{item.extract.slice(0, 140)}&hellip;</span>}
                </span>
              </a>
              <ActionIcon
                variant="subtle"
                color="red"
                className="deleteBtn"
                title="remove"
                onClick={() => onDelete(item.id)}
              >
                ×
              </ActionIcon>
            </Group>
          </Card>
        );
      })}
    </Stack>
  );
}
