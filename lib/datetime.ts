const appointmentTimestampPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/;

/**
 * Appointments are salon wall-clock times. Legacy rows were sent to a
 * TIMESTAMPTZ column without an offset, so PostgreSQL normalized them to UTC
 * while keeping the entered clock components. Reading those components as a
 * local date prevents an unwanted +1/+2 hour shift in Poland.
 */
export function parseAppointmentStart(value: string) {
  const match = appointmentTimestampPattern.exec(value);
  if (!match) return new Date(value);

  const [, year, month, day, hour, minute, second = "0"] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
}

/** Store a stable wall-clock value regardless of the computer's time zone. */
export function serializeAppointmentStart(date: string, time: string) {
  return `${date}T${time}:00.000Z`;
}
