import { Plural, Trans } from "@lingui/react/macro";
import { Tooltip, Typography } from "antd";
import dayjs from "dayjs";

const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
/** Past a month, "il y a 47 jours" says less than the date itself. */
const RELATIVE_MAX_DAYS = 30;

function Relative({ date }: { date: string }) {
  const then = dayjs(date);
  // Clamp: a comment dated in the future (clock skew) reads as brand new.
  const minutes = Math.max(0, dayjs().diff(then, "minute"));

  if (minutes < 1) {
    return <Trans>À l'instant</Trans>;
  }
  if (minutes < MINUTES_PER_HOUR) {
    return <Trans>Il y a {minutes} min</Trans>;
  }

  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) {
    return (
      <Plural one="Il y a # heure" other="Il y a # heures" value={hours} />
    );
  }

  const days = Math.floor(hours / HOURS_PER_DAY);
  if (days <= RELATIVE_MAX_DAYS) {
    return <Plural one="Il y a # jour" other="Il y a # jours" value={days} />;
  }
  return <>{then.format("DD/MM/YY HH:mm")}</>;
}

/**
 * A comment's age, told the way a reader thinks about it — "Il y a 5 min" — and
 * falling back to the plain date once "how long ago" stops being useful. The
 * exact timestamp stays one hover away.
 */
export function CommentDate({ date }: { date: string }) {
  return (
    <Tooltip title={dayjs(date).format("DD/MM/YYYY HH:mm")}>
      <Typography.Text style={{ fontSize: 12 }} type="secondary">
        <Relative date={date} />
      </Typography.Text>
    </Tooltip>
  );
}
