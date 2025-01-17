export function getPayPeriodDates(year: number): Date[] {
  const dates: Date[] = [];
  for (let month = 0; month < 12; month++) {
    // 15th of each month
    dates.push(new Date(year, month, 15));

    // Last day of each month
    const lastDay = new Date(year, month + 1, 0).getDate();
    dates.push(new Date(year, month, lastDay));
  }
  return dates;
}
