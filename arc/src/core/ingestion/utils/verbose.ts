export const isVerboseIngestionEnabled = (): boolean => {
  const raw = process.env.ARC_VERBOSE;
  if (!raw) return false;
  const value = raw.toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
};
