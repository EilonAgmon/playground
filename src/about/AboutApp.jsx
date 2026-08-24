import { Stack, Group, Title, Text, Avatar, Timeline, Anchor, Container } from "@mantine/core";
import { CONTACT, SUMMARY, EXPERIENCE, EDUCATION, ARMY } from "./resumeData.js";
import { Header } from "../shared/Header.jsx";
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

function Section({ label, children }) {
  return (
    <div className="about-section surface fade-up">
      <Text className="about-section-label">{label}</Text>
      {children}
    </div>
  );
}

export default function AboutApp() {
  return (
    <>
      <Header title="About" />
      <Container id="about" size="md">
        <Stack align="center" gap={6} className="aboutHeader fade-up">
          <Avatar size={92} radius="50%" className="avatar">
            EA
          </Avatar>
          <Title order={1} className="display-font">
            Eilon Agmon
          </Title>
          <Text className="roleTagline">R&amp;D Director · Head of Engineering · Gaming &amp; SaaS Platforms</Text>
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

        <Section label="Summary">
          <Text className="summary">{SUMMARY}</Text>
        </Section>

        <Section label="Experience">
          <Timeline bulletSize={12} lineWidth={2} active={EXPERIENCE.length}>
            {EXPERIENCE.map((job) => (
              <Timeline.Item
                key={`${job.company}-${job.role}`}
                title={
                  <Group gap={6} wrap="wrap" justify="space-between">
                    <Text fw={600} span className="display-font">
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
        </Section>

        <Section label="Education">
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
        </Section>

        <Section label="Army Service">
          <Stack gap="sm">
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
        </Section>
      </Container>
    </>
  );
}
