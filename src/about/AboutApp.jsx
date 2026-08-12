import { Stack, Group, Title, Text, Avatar, Timeline, Anchor, Divider, Container } from "@mantine/core";
import { CONTACT, SUMMARY, EXPERIENCE, EDUCATION, ARMY } from "./resumeData.js";
import "./about.css";

function ExperienceBullets({ bullets }) {
  return (
    <Stack gap={4} mt={4}>
      {bullets.map(([label, text], i) => (
        <Text key={i} size="sm" className="bullet">
          {label && <strong>{label}: </strong>}
          {text}
        </Text>
      ))}
    </Stack>
  );
}

export default function AboutApp() {
  return (
    <Container id="about" size="md">
      <Stack align="center" gap={4} className="aboutHeader">
        <Avatar size={96} radius="50%" className="avatar">
          EA
        </Avatar>
        <Title order={1} className="glow">
          EILON AGMON
        </Title>
        <Text className="roleTagline">R&amp;D Director | Head of Engineering | Gaming &amp; SaaS Platforms</Text>
        <Group gap="xs" className="contactRow">
          <Text size="sm">{CONTACT.phone}</Text>
          <Text size="sm">&middot;</Text>
          <Anchor size="sm" href={`mailto:${CONTACT.email}`}>
            {CONTACT.email}
          </Anchor>
          <Text size="sm">&middot;</Text>
          <Text size="sm">{CONTACT.location}</Text>
          <Text size="sm">&middot;</Text>
          <Text size="sm" c="dimmed">
            {CONTACT.linkedin}
          </Text>
        </Group>
      </Stack>

      <Divider my="xl" label="professional summary" labelPosition="center" />
      <Text className="summary">{SUMMARY}</Text>

      <Divider my="xl" label="work experience" labelPosition="center" />
      <Timeline bulletSize={14} lineWidth={2} active={EXPERIENCE.length}>
        {EXPERIENCE.map((job) => (
          <Timeline.Item
            key={`${job.company}-${job.role}`}
            title={
              <Group gap={6} wrap="wrap" justify="space-between">
                <Text fw={700} span>
                  {job.role} &middot; {job.company}
                </Text>
                <Text size="xs" c="dimmed" span>
                  {job.dates}
                </Text>
              </Group>
            }
          >
            <ExperienceBullets bullets={job.bullets} />
          </Timeline.Item>
        ))}
      </Timeline>

      <Divider my="xl" label="education" labelPosition="center" />
      <Stack gap="sm">
        {EDUCATION.map((e) => (
          <Group key={e.degree} justify="space-between" wrap="wrap">
            <Text size="sm">
              <strong>{e.degree}</strong> &middot; {e.school} &mdash; {e.detail}
            </Text>
            <Text size="xs" c="dimmed">
              {e.dates}
            </Text>
          </Group>
        ))}
      </Stack>

      <Divider my="xl" label="army service" labelPosition="center" />
      <Stack gap="sm" mb="xl">
        {ARMY.map((a) => (
          <Group key={a.role} justify="space-between" wrap="wrap">
            <Text size="sm">
              <strong>{a.role}</strong> &mdash; {a.detail}
            </Text>
            <Text size="xs" c="dimmed">
              {a.dates}
            </Text>
          </Group>
        ))}
      </Stack>

      <Anchor href="../" className="back" underline="hover">
        &larr; back to the portal
      </Anchor>
    </Container>
  );
}
